import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import { bumpMapUpdatedAt } from "../lib/bump-map-updated.js";

const URL_MAX_LENGTH = 2048;
const TITLE_MAX_LENGTH = 500;
const DESCRIPTION_MAX_LENGTH = 1000;
const SITE_NAME_MAX_LENGTH = 200;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB
const USER_AGENT = "ThesisMap/1.0 (link preview)";

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (url.length === 0) return url;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Validate it's a real URL
  new URL(url);
  return url;
}

function truncate(str: string | null | undefined, max: number): string | null {
  if (str == null) return null;
  return str.length > max ? str.slice(0, max) : str;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function parseMetaTags(html: string, finalUrl: string) {
  const meta: Record<string, string> = {};

  // Extract <meta> tags with property or name attributes
  const metaRegex =
    /<meta\s+(?:[^>]*?\s)?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?\scontent\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
  const metaRegex2 =
    /<meta\s+(?:[^>]*?\s)?content\s*=\s*["']([^"']*)["'][^>]*?\s(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?\/?>/gi;

  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) {
      meta[key.toLowerCase()] = value;
    }
  }
  while ((match = metaRegex2.exec(html)) !== null) {
    const key = match[2];
    const value = match[1];
    if (key !== undefined && value !== undefined) {
      meta[key.toLowerCase()] = value;
    }
  }

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const htmlTitle = titleMatch?.[1]?.trim() ?? null;

  // Extract favicon
  const iconMatch = html.match(
    /<link\s+[^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?>/i
  );
  const iconMatch2 = html.match(
    /<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*\/?>/i
  );

  let favicon = iconMatch?.[1] ?? iconMatch2?.[1] ?? null;
  if (favicon && !favicon.startsWith("http")) {
    try {
      favicon = new URL(favicon, finalUrl).href;
    } catch {
      favicon = null;
    }
  }
  if (!favicon) {
    try {
      const origin = new URL(finalUrl).origin;
      favicon = `${origin}/favicon.ico`;
    } catch {
      favicon = null;
    }
  }

  // Resolve relative image URLs
  let image =
    meta["og:image"] ?? meta["twitter:image"] ?? null;
  if (image && !image.startsWith("http")) {
    try {
      image = new URL(image, finalUrl).href;
    } catch {
      image = null;
    }
  }

  return {
    title: truncate(
      meta["og:title"] ?? meta["twitter:title"] ?? htmlTitle,
      TITLE_MAX_LENGTH
    ),
    description: truncate(
      meta["og:description"] ??
        meta["twitter:description"] ??
        meta["description"],
      DESCRIPTION_MAX_LENGTH
    ),
    image,
    siteName: truncate(
      meta["og:site_name"] ?? extractDomain(finalUrl),
      SITE_NAME_MAX_LENGTH
    ),
    favicon,
  };
}

async function fetchPreviewMetadata(url: string) {
  let currentUrl = url;
  let redirectCount = 0;
  let response: Response;

  // Follow redirects manually to respect MAX_REDIRECTS
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS
    );

    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const message =
        err instanceof Error ? err.message : "Unknown fetch error";
      if (message.includes("abort")) {
        throw new Error(`Fetch timed out after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw new Error(`Fetch failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
      }
      const location = response.headers.get("location")!;
      try {
        currentUrl = new URL(location, currentUrl).href;
      } catch {
        throw new Error(`Invalid redirect URL: ${location}`);
      }
      continue;
    }

    break;
  }

  // Handle HTTP errors
  if (response!.status >= 400) {
    throw new Error(`HTTP ${response!.status} ${response!.statusText}`);
  }

  const contentType = response!.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    // Non-HTML content: mark as success with empty preview fields
    return {
      title: null,
      description: null,
      image: null,
      siteName: extractDomain(currentUrl),
      favicon: null,
    };
  }

  // Read response body with size limit
  const reader = response!.body?.getReader();
  if (!reader) {
    return {
      title: null,
      description: null,
      image: null,
      siteName: extractDomain(currentUrl),
      favicon: null,
    };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    chunks.push(value);
    if (totalBytes >= MAX_RESPONSE_BYTES) break;
  }
  reader.cancel().catch(() => {});

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const html = decoder.decode(
    new Uint8Array(
      chunks.reduce((acc, c) => acc + c.byteLength, 0) <= MAX_RESPONSE_BYTES
        ? Buffer.concat(chunks)
        : Buffer.concat(chunks).subarray(0, MAX_RESPONSE_BYTES)
    )
  );

  return parseMetaTags(html, currentUrl);
}

export const attachmentRouter = router({
  create: publicProcedure
    .input(
      z.object({
        nodeId: z.string(),
        type: z.enum(["source", "note"]),
        url: z.string().optional(),
        noteText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate the node exists and get its mapId
      const node = await db.node.findUnique({
        where: { id: input.nodeId },
        select: { id: true, mapId: true },
      });

      if (!node) {
        throw new Error("Node not found");
      }

      if (input.type === "source") {
        if (!input.url || input.url.trim().length === 0) {
          throw new Error("URL is required for source attachments");
        }

        let normalizedUrl: string;
        try {
          normalizedUrl = normalizeUrl(input.url);
        } catch {
          throw new Error("Invalid URL");
        }

        if (normalizedUrl.length > URL_MAX_LENGTH) {
          throw new Error(
            `URL exceeds maximum length of ${URL_MAX_LENGTH} characters`
          );
        }

        // Count existing attachments for orderIndex
        const existingCount = await db.attachment.count({
          where: { nodeId: input.nodeId },
        });

        const attachment = await db.attachment.create({
          data: {
            nodeId: input.nodeId,
            type: "source",
            url: normalizedUrl,
            sourceType: "url",
            noteText: input.noteText ?? null,
            previewFetchStatus: "pending",
            orderIndex: existingCount,
          },
        });

        await bumpMapUpdatedAt(db, node.mapId);

        // Trigger preview fetch asynchronously (fire-and-forget)
        fetchAndUpdatePreview(attachment.id, normalizedUrl).catch(() => {});

        return attachment;
      }

      // Note type
      if (!input.noteText || input.noteText.trim().length === 0) {
        throw new Error("Note text is required for note attachments");
      }

      const existingCount = await db.attachment.count({
        where: { nodeId: input.nodeId },
      });

      const attachment = await db.attachment.create({
        data: {
          nodeId: input.nodeId,
          type: "note",
          noteText: input.noteText,
          previewFetchStatus: null,
          orderIndex: existingCount,
        },
      });

      await bumpMapUpdatedAt(db, node.mapId);

      return attachment;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().optional(),
        noteText: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const existing = await db.attachment.findUnique({
        where: { id },
        include: { node: { select: { mapId: true } } },
      });

      if (!existing) {
        throw new Error("Attachment not found");
      }

      const data: Record<string, unknown> = {};

      if (existing.type === "source") {
        if (updates.url !== undefined) {
          if (updates.url.trim().length === 0) {
            throw new Error("URL cannot be empty for source attachments");
          }

          let normalizedUrl: string;
          try {
            normalizedUrl = normalizeUrl(updates.url);
          } catch {
            throw new Error("Invalid URL");
          }

          if (normalizedUrl.length > URL_MAX_LENGTH) {
            throw new Error(
              `URL exceeds maximum length of ${URL_MAX_LENGTH} characters`
            );
          }

          // URL changed: clear all preview fields and re-trigger fetch
          if (normalizedUrl !== existing.url) {
            data.url = normalizedUrl;
            data.previewTitle = null;
            data.previewDescription = null;
            data.previewImageUrl = null;
            data.previewFaviconUrl = null;
            data.previewSiteName = null;
            data.previewFetchStatus = "pending";
            data.previewFetchedAt = null;
            data.previewFetchError = null;
          }
        }

        if (updates.noteText !== undefined) {
          data.noteText = updates.noteText;
        }
      } else {
        // Note type
        if (updates.noteText !== undefined) {
          if (updates.noteText.trim().length === 0) {
            throw new Error("Note text cannot be empty for note attachments");
          }
          data.noteText = updates.noteText;
        }
      }

      const attachment = await db.attachment.update({
        where: { id },
        data,
      });

      await bumpMapUpdatedAt(db, existing.node.mapId);

      // If URL changed, trigger a new preview fetch
      if (data.url !== undefined) {
        fetchAndUpdatePreview(id, data.url as string).catch(() => {});
      }

      return attachment;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.attachment.findUnique({
        where: { id: input.id },
        include: { node: { select: { mapId: true } } },
      });

      if (!existing) {
        throw new Error("Attachment not found");
      }

      await db.attachment.delete({
        where: { id: input.id },
      });

      await bumpMapUpdatedAt(db, existing.node.mapId);

      // Return full deleted attachment data for undo support
      const { node: _node, ...attachmentData } = existing;
      return attachmentData;
    }),

  listByNode: publicProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input }) => {
      return db.attachment.findMany({
        where: { nodeId: input.nodeId },
        orderBy: { createdAt: "asc" },
      });
    }),

  refreshPreview: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const attachment = await db.attachment.findUnique({
        where: { id: input.id },
        include: { node: { select: { mapId: true } } },
      });

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      if (attachment.type !== "source") {
        throw new Error("Only source attachments have preview metadata");
      }

      if (!attachment.url) {
        throw new Error("Attachment has no URL");
      }

      const urlAtStart = attachment.url;

      // Set status to pending before fetching
      await db.attachment.update({
        where: { id: input.id },
        data: { previewFetchStatus: "pending", previewFetchError: null },
      });

      try {
        const metadata = await fetchPreviewMetadata(urlAtStart);

        // Before writing results, verify the URL has not changed
        const current = await db.attachment.findUnique({
          where: { id: input.id },
          select: { url: true },
        });

        if (!current || current.url !== urlAtStart) {
          // URL changed during fetch — discard silently
          return db.attachment.findUnique({ where: { id: input.id } });
        }

        const updated = await db.attachment.update({
          where: { id: input.id },
          data: {
            previewTitle: metadata.title,
            previewDescription: metadata.description,
            previewImageUrl: metadata.image,
            previewFaviconUrl: metadata.favicon,
            previewSiteName: metadata.siteName,
            previewFetchStatus: "success",
            previewFetchedAt: new Date(),
            previewFetchError: null,
          },
        });

        await bumpMapUpdatedAt(db, attachment.node.mapId);

        return updated;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        // Before writing error, verify URL hasn't changed
        const current = await db.attachment.findUnique({
          where: { id: input.id },
          select: { url: true },
        });

        if (!current || current.url !== urlAtStart) {
          return db.attachment.findUnique({ where: { id: input.id } });
        }

        const updated = await db.attachment.update({
          where: { id: input.id },
          data: {
            previewFetchStatus: "failed",
            previewFetchedAt: new Date(),
            previewFetchError: errorMessage,
          },
        });

        await bumpMapUpdatedAt(db, attachment.node.mapId);

        return updated;
      }
    }),
});

/**
 * Internal helper: fetches preview metadata and updates the attachment record.
 * Checks that the URL hasn't changed before writing results.
 */
async function fetchAndUpdatePreview(
  attachmentId: string,
  url: string
): Promise<void> {
  try {
    const metadata = await fetchPreviewMetadata(url);

    // Verify URL hasn't changed since fetch started
    const current = await db.attachment.findUnique({
      where: { id: attachmentId },
      select: { url: true, nodeId: true, node: { select: { mapId: true } } },
    });

    if (!current || current.url !== url) return;

    await db.attachment.update({
      where: { id: attachmentId },
      data: {
        previewTitle: metadata.title,
        previewDescription: metadata.description,
        previewImageUrl: metadata.image,
        previewFaviconUrl: metadata.favicon,
        previewSiteName: metadata.siteName,
        previewFetchStatus: "success",
        previewFetchedAt: new Date(),
        previewFetchError: null,
      },
    });

    await bumpMapUpdatedAt(db, current.node.mapId);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    const current = await db.attachment.findUnique({
      where: { id: attachmentId },
      select: { url: true, nodeId: true, node: { select: { mapId: true } } },
    });

    if (!current || current.url !== url) return;

    await db.attachment.update({
      where: { id: attachmentId },
      data: {
        previewFetchStatus: "failed",
        previewFetchedAt: new Date(),
        previewFetchError: errorMessage,
      },
    });

    await bumpMapUpdatedAt(db, current.node.mapId);
  }
}

// Export for testing
export { normalizeUrl, truncate, parseMetaTags, fetchPreviewMetadata };
