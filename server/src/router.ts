import { router, publicProcedure } from "./trpc.js";
import { mapRouter } from "./routers/map.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  map: mapRouter,
});

export type AppRouter = typeof appRouter;
