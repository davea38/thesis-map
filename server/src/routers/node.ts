import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import { bumpMapUpdatedAt } from "../lib/bump-map-updated.js";

export const nodeRouter = router({
  create: publicProcedure
    .input(
      z.object({
        parentId: z.string(),
        mapId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Validate parent exists and belongs to the same map
      const parent = await db.node.findUnique({
        where: { id: input.parentId },
        select: { id: true, mapId: true },
      });

      if (!parent) {
        throw new Error("Parent node not found");
      }

      if (parent.mapId !== input.mapId) {
        throw new Error("Parent node does not belong to the specified map");
      }

      const node = await db.node.create({
        data: {
          mapId: input.mapId,
          parentId: input.parentId,
          statement: "",
          polarity: "neutral",
          strength: 0,
        },
      });

      await bumpMapUpdatedAt(db, input.mapId);

      return node;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const node = await db.node.findUnique({
        where: { id: input.id },
        include: {
          children: {
            orderBy: { createdAt: "asc" },
            include: {
              nodeTags: {
                include: { tag: true },
              },
              attachments: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          nodeTags: {
            include: { tag: true },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!node) {
        throw new Error("Node not found");
      }

      // Compute aggregation from direct children
      let tailwindTotal = 0;
      let headwindTotal = 0;

      for (const child of node.children) {
        const strength = child.strength ?? 0;
        if (strength === 0) continue;
        if (child.polarity === "tailwind") tailwindTotal += strength;
        else if (child.polarity === "headwind") headwindTotal += strength;
      }

      const total = tailwindTotal + headwindTotal;
      const aggregation =
        total === 0
          ? null
          : {
              tailwindTotal,
              headwindTotal,
              balanceRatio: tailwindTotal / total,
            };

      return {
        ...node,
        tags: node.nodeTags.map((nt) => nt.tag),
        children: node.children.map((child) => ({
          ...child,
          tags: child.nodeTags.map((nt) => nt.tag),
        })),
        aggregation,
      };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        statement: z.string().optional(),
        body: z.string().optional(),
        strength: z.number().int().min(0).max(100).optional(),
        polarity: z.enum(["tailwind", "headwind", "neutral"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      // Fetch the node to check constraints
      const existing = await db.node.findUnique({
        where: { id },
        select: { id: true, mapId: true, parentId: true },
      });

      if (!existing) {
        throw new Error("Node not found");
      }

      const isRoot = existing.parentId === null;

      // Reject strength and polarity updates for root node
      if (isRoot && updates.strength !== undefined) {
        throw new Error("Cannot set strength on the root node");
      }
      if (isRoot && updates.polarity !== undefined) {
        throw new Error("Cannot set polarity on the root node");
      }

      // Build update data
      const data: Record<string, unknown> = {};
      if (updates.statement !== undefined) data.statement = updates.statement;
      if (updates.body !== undefined) data.body = updates.body;
      if (updates.strength !== undefined) data.strength = updates.strength;
      if (updates.polarity !== undefined) data.polarity = updates.polarity;

      // If updating root node's statement, also update map thesis in a transaction
      if (isRoot && updates.statement !== undefined) {
        return db.$transaction(async (tx) => {
          const node = await tx.node.update({
            where: { id },
            data,
          });

          await tx.map.update({
            where: { id: existing.mapId },
            data: { thesisStatement: updates.statement! },
          });

          await bumpMapUpdatedAt(tx, existing.mapId);

          return node;
        });
      }

      const node = await db.node.update({
        where: { id },
        data,
      });

      await bumpMapUpdatedAt(db, existing.mapId);

      return node;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        confirm: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const node = await db.node.findUnique({
        where: { id: input.id },
        select: { id: true, mapId: true, parentId: true },
      });

      if (!node) {
        throw new Error("Node not found");
      }

      // Reject deletion of root node
      if (node.parentId === null) {
        throw new Error(
          "Cannot delete the root node. Delete the map instead."
        );
      }

      // Count all descendants recursively
      const allNodes = await db.node.findMany({
        where: { mapId: node.mapId },
        select: { id: true, parentId: true },
      });

      const countDescendants = (nodeId: string): number => {
        const children = allNodes.filter((n) => n.parentId === nodeId);
        let count = children.length;
        for (const child of children) {
          count += countDescendants(child.id);
        }
        return count;
      };

      const descendantCount = countDescendants(input.id);

      if (!input.confirm) {
        return {
          status: "pending" as const,
          descendantCount,
          nodeId: input.id,
        };
      }

      // Delete the node (cascade handles descendants, node-tags, attachments)
      await db.node.delete({
        where: { id: input.id },
      });

      await bumpMapUpdatedAt(db, node.mapId);

      return {
        status: "deleted" as const,
        descendantCount,
        nodeId: input.id,
      };
    }),
});
