import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import { bumpMapUpdatedAt } from "../lib/bump-map-updated.js";

const TAG_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
] as const;

export type TagColor = (typeof TAG_COLOR_PALETTE)[number];

export { TAG_COLOR_PALETTE };

export const tagRouter = router({
  create: publicProcedure
    .input(
      z.object({
        mapId: z.string(),
        name: z.string().min(1, "Tag name is required"),
        color: z.string().refine(
          (c): c is TagColor =>
            (TAG_COLOR_PALETTE as readonly string[]).includes(c),
          { message: "Color must be from the preset palette" }
        ),
      })
    )
    .mutation(async ({ input }) => {
      // Check that the map exists
      const map = await db.map.findUnique({
        where: { id: input.mapId },
        select: { id: true },
      });

      if (!map) {
        throw new Error("Map not found");
      }

      // Check name uniqueness within the map (Prisma unique constraint will also enforce this,
      // but we give a better error message)
      const existing = await db.tag.findUnique({
        where: {
          mapId_name: {
            mapId: input.mapId,
            name: input.name,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw new Error(
          "A tag with this name already exists in this map"
        );
      }

      const tag = await db.tag.create({
        data: {
          mapId: input.mapId,
          name: input.name,
          color: input.color,
        },
      });

      await bumpMapUpdatedAt(db, input.mapId);

      return tag;
    }),

  list: publicProcedure
    .input(z.object({ mapId: z.string() }))
    .query(async ({ input }) => {
      const tags = await db.tag.findMany({
        where: { mapId: input.mapId },
        include: {
          _count: {
            select: { nodeTags: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return tags.map((tag) => ({
        id: tag.id,
        mapId: tag.mapId,
        name: tag.name,
        color: tag.color,
        nodeCount: tag._count.nodeTags,
      }));
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Tag name is required").optional(),
        color: z
          .string()
          .refine(
            (c): c is TagColor =>
              (TAG_COLOR_PALETTE as readonly string[]).includes(c),
            { message: "Color must be from the preset palette" }
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const existing = await db.tag.findUnique({
        where: { id },
        select: { id: true, mapId: true, name: true },
      });

      if (!existing) {
        throw new Error("Tag not found");
      }

      // If renaming, check uniqueness within the map
      if (updates.name !== undefined && updates.name !== existing.name) {
        const duplicate = await db.tag.findUnique({
          where: {
            mapId_name: {
              mapId: existing.mapId,
              name: updates.name,
            },
          },
          select: { id: true },
        });

        if (duplicate) {
          throw new Error(
            "A tag with this name already exists in this map"
          );
        }
      }

      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.color !== undefined) data.color = updates.color;

      const tag = await db.tag.update({
        where: { id },
        data,
      });

      await bumpMapUpdatedAt(db, existing.mapId);

      return tag;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.tag.findUnique({
        where: { id: input.id },
        select: { id: true, mapId: true },
      });

      if (!existing) {
        throw new Error("Tag not found");
      }

      await db.tag.delete({
        where: { id: input.id },
      });

      await bumpMapUpdatedAt(db, existing.mapId);

      return { success: true };
    }),

  addToNode: publicProcedure
    .input(
      z.object({
        tagId: z.string(),
        nodeId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch both the tag and node to validate they belong to the same map
      const [tag, node] = await Promise.all([
        db.tag.findUnique({
          where: { id: input.tagId },
          select: { id: true, mapId: true },
        }),
        db.node.findUnique({
          where: { id: input.nodeId },
          select: { id: true, mapId: true },
        }),
      ]);

      if (!tag) {
        throw new Error("Tag not found");
      }

      if (!node) {
        throw new Error("Node not found");
      }

      if (tag.mapId !== node.mapId) {
        throw new Error("Tag and node must belong to the same map");
      }

      const nodeTag = await db.nodeTag.create({
        data: {
          tagId: input.tagId,
          nodeId: input.nodeId,
        },
      });

      await bumpMapUpdatedAt(db, tag.mapId);

      return nodeTag;
    }),

  removeFromNode: publicProcedure
    .input(
      z.object({
        tagId: z.string(),
        nodeId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch the tag to get the mapId for bumping updatedAt
      const tag = await db.tag.findUnique({
        where: { id: input.tagId },
        select: { id: true, mapId: true },
      });

      if (!tag) {
        throw new Error("Tag not found");
      }

      await db.nodeTag.delete({
        where: {
          nodeId_tagId: {
            nodeId: input.nodeId,
            tagId: input.tagId,
          },
        },
      });

      await bumpMapUpdatedAt(db, tag.mapId);

      return { success: true };
    }),
});
