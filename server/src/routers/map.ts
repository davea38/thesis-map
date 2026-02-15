import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";
import { computeBalanceBar } from "../lib/compute-balance-bar.js";

export const mapRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Map name is required"),
        thesisStatement: z.string().min(1, "Thesis statement is required"),
      })
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const map = await tx.map.create({
          data: {
            name: input.name,
            thesisStatement: input.thesisStatement,
          },
        });

        const rootNode = await tx.node.create({
          data: {
            mapId: map.id,
            statement: input.thesisStatement,
            parentId: null,
            polarity: null,
            strength: null,
          },
        });

        return {
          ...map,
          rootNode,
        };
      });
    }),

  list: publicProcedure.query(async () => {
    return db.map.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        thesisStatement: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const map = await db.map.findUnique({
        where: { id: input.id },
        include: {
          nodes: {
            orderBy: { createdAt: "asc" },
            include: {
              nodeTags: {
                include: {
                  tag: true,
                },
              },
              attachments: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
          tags: true,
        },
      });

      if (!map) {
        throw new Error("Map not found");
      }

      // Build children lookup for aggregation computation
      const childrenByParent = new Map<string, typeof map.nodes>();

      for (const node of map.nodes) {
        if (node.parentId) {
          const siblings = childrenByParent.get(node.parentId) ?? [];
          siblings.push(node);
          childrenByParent.set(node.parentId, siblings);
        }
      }

      const nodesWithAggregation = map.nodes.map((node) => ({
        ...node,
        tags: node.nodeTags.map((nt) => nt.tag),
        aggregation: computeBalanceBar(childrenByParent.get(node.id) ?? []),
      }));

      return {
        id: map.id,
        name: map.name,
        thesisStatement: map.thesisStatement,
        createdAt: map.createdAt,
        updatedAt: map.updatedAt,
        tags: map.tags,
        nodes: nodesWithAggregation,
      };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Map name cannot be empty"),
      })
    )
    .mutation(async ({ input }) => {
      return db.map.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.map.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
