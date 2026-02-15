import { router, publicProcedure } from "./trpc.js";
import { mapRouter } from "./routers/map.js";
import { nodeRouter } from "./routers/node.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  map: mapRouter,
  node: nodeRouter,
});

export type AppRouter = typeof appRouter;
