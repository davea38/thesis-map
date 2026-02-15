# Sources

Sources are URL-based references that provide external backing for a node's claim.

## Overview

Each node can have **zero or more sources** attached to it. A source is a URL pointing to an external resource, with **auto-fetched preview metadata** (title, description, image, favicon) and an **optional user note** for context.

Sources replace the former "citation" attachment type. The attachment system now has two types:
- **Source** — a URL with auto-fetched preview and optional note (see this spec)
- **Note** — a free-form text block for supplementary commentary (see `008-attachments.md`)

Sources are **inert** — they do not have polarity, strength, or any participation in aggregation. They exist purely as reference material.

## Data Model

Sources are stored as attachments with `type: "source"`.

### User-Entered Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `url` | String | Yes | Must be a valid URL. Auto-prepend `https://` if protocol is missing. Max 2048 chars. |
| `noteText` | String (nullable) | No | User's contextual note — serves as description, commentary, or quote excerpt. |
| `sourceType` | String | No (default: `"url"`) | Extensibility discriminator. MVP only supports `"url"`. Future: `"file"`, `"doi"`, etc. |

### Auto-Fetched Preview Metadata

All preview fields are **nullable**, **server-populated**, and **never user-editable**.

| Field | Type | Notes |
|-------|------|-------|
| `previewTitle` | String (nullable) | From `og:title` / `twitter:title` / `<title>`. Truncated to 500 chars. |
| `previewDescription` | String (nullable) | From `og:description` / `twitter:description` / `<meta description>`. Truncated to 1000 chars. |
| `previewImageUrl` | String (nullable) | From `og:image` / `twitter:image`. |
| `previewFaviconUrl` | String (nullable) | From `<link rel="icon">` or `{origin}/favicon.ico`. |
| `previewSiteName` | String (nullable) | From `og:site_name` or extracted domain name. Truncated to 200 chars. |
| `previewFetchStatus` | String | One of: `"pending"`, `"success"`, `"failed"`. Default: `"pending"`. |
| `previewFetchedAt` | DateTime (nullable) | Timestamp of last fetch attempt. |
| `previewFetchError` | String (nullable) | Human-readable error message when status is `"failed"`. |

### Fields Dropped from Old Citation Type

- `articleTitle` → replaced by `previewTitle` (auto-fetched)
- `quoteSnippet` → absorbed into `noteText`

### Validation

- A source requires `url` to be non-empty and a valid URL.
- `noteText` is optional — a source with only a URL is valid.
- Note attachment type: `noteText` required and non-empty (unchanged from prior spec).

## Source Creation Flow

1. User clicks **"Add Source"** in the side panel attachments section.
2. An empty source card appears with the URL input auto-focused.
3. User pastes or types a URL → client validates → server creates the attachment with `previewFetchStatus: "pending"`.
4. Server fetches preview metadata synchronously for MVP (via `attachment.refreshPreview`).
5. The card shows a skeleton/shimmer loading state during the fetch.
6. **On success:** Card populates with favicon, site name, title, description, preview image, and the URL as a muted link.
7. **On failure:** Card shows the URL as a clickable link, "Preview unavailable" message, and a retry button.
8. User optionally adds a note (autosaved via debounced mutation).

## Preview Fetching

Preview metadata is fetched **server-side** when a source is created or when the user manually triggers a refresh.

### Metadata Extraction Priority

| Field | Priority 1 | Priority 2 | Priority 3 |
|-------|-----------|-----------|-----------|
| Title | `og:title` | `twitter:title` | `<title>` |
| Description | `og:description` | `twitter:description` | `<meta name="description">` |
| Image | `og:image` | `twitter:image` | — |
| Site name | `og:site_name` | Domain from URL | — |
| Favicon | `<link rel="icon">` | `<link rel="shortcut icon">` | `{origin}/favicon.ico` |

### Fetch Behavior

- **Timeout:** 10 seconds per URL.
- **Redirects:** Follow up to 5 redirects. Store the user's original URL; preview metadata reflects the final destination.
- **Response size limit:** Read max 1 MB of response body.
- **Non-HTML content:** Mark as `"success"` with empty preview fields. The URL is valid, just not previewable.
- **User-Agent:** `ThesisMap/1.0 (link preview)`.
- **No automatic retry on failure** — manual "Refresh preview" button only.
- **No global URL cache in MVP** — each attachment gets its own fetch.

### Failure Modes

- DNS failure, timeout, HTTP 4xx/5xx, SSL error → `previewFetchStatus: "failed"` with a descriptive error message in `previewFetchError`.
- A source remains **valid regardless of preview status** — the URL link always works for the user to open manually.

## Canvas Source Badge

Nodes with sources display a count badge on the canvas.

- **Position:** Bottom-right corner of the node.
- **Appearance:** Small pill-shaped badge with a link icon and count number (e.g., `🔗 3`).
- **Visibility:** Only shown when the node has >= 1 source attachment (note attachments are not counted).
- **Color:** Neutral/muted (gray or slate) — does not compete with polarity colors.
- **Interaction:** Click opens the side panel scrolled to the attachments section. Hover shows a tooltip ("N source(s)").
- **Cap:** Shows `99+` for 100 or more sources.

## Side Panel Source Cards

Each source renders as a card in the side panel attachments section.

### Success State

- Favicon + site name
- Bold preview title
- Description (2–3 lines, truncated)
- Preview image thumbnail
- URL as a muted clickable link
- User note displayed below

### Loading State

- Skeleton/shimmer placeholders for preview fields
- URL visible

### Failed State

- Globe icon + domain name
- "Preview unavailable" message
- Retry button
- URL as a clickable link
- User note (if present)

### Card Actions

- **Edit URL** — triggers re-fetch of preview metadata
- **Remove source** — with undo toast
- **Refresh preview** — re-fetches preview metadata
- **Open URL** — opens in a new tab

## Editing

- **URL change:** Clears all preview fields, resets `previewFetchStatus` to `"pending"`, triggers a new fetch.
- **Note:** Inline editable textarea, autosaved via debounced mutation.
- **Preview metadata:** Not user-editable.

## Future Extensibility

- The `sourceType` field allows future source types: `"file"` (uploads), `"doi"`, `"isbn"`, etc.
- Each future type will have its own required fields and preview behavior.
- The source card component should be designed to accommodate different layouts per source type.
- File uploads (deferred from MVP) will become a source type rather than a separate attachment category.

## Edge Cases

- **Invalid URLs:** Client-side validation via `new URL()`. Bare domains are auto-prefixed with `https://`.
- **Auth-walled URLs:** Fetch returns 401/403 or a login page → marked as failed, or shows the login page's generic OG tags.
- **Duplicate URLs on the same node:** Allowed. The user may want different notes for the same source.
- **Many sources (10+):** Side panel list is scrollable. Preview images are lazy-loaded.
- **Non-HTML URLs (PDF, image):** Success status with no rich preview. URL displayed with a document icon.
- **URL change during in-flight fetch:** Discard the stale fetch result if the URL no longer matches.
