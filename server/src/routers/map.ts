import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../db.js";

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
        const parentId = node.parentId ?? "__root__";
        const siblings = childrenByParent.get(parentId) ?? [];
        siblings.push(node);
        childrenByParent.set(parentId, siblings);
      }

      function computeAggregation(nodeId: string) {
        const children = childrenByParent.get(nodeId) ?? [];
        if (children.length === 0) return null;

        let tailwindTotal = 0;
        let headwindTotal = 0;

        for (const child of children) {
          const strength = child.strength ?? 0;
          if (strength === 0) continue;
          if (child.polarity === "tailwind") tailwindTotal += strength;
          else if (child.polarity === "headwind") headwindTotal += strength;
        }

        const total = tailwindTotal + headwindTotal;
        if (total === 0) return null;

        return {
          tailwindTotal,
          headwindTotal,
          balanceRatio: tailwindTotal / total,
        };
      }

      const nodesWithAggregation = map.nodes.map((node) => ({
        ...node,
        tags: node.nodeTags.map((nt) => nt.tag),
        aggregation: computeAggregation(node.id),
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
