import { router, publicProcedure } from "./trpc.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});

export type AppRouter = typeof appRouter;
