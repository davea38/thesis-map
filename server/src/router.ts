import { router, publicProcedure } from "./trpc.js";
import { mapRouter } from "./routers/map.js";
import { nodeRouter } from "./routers/node.js";
import { tagRouter } from "./routers/tag.js";
import { attachmentRouter } from "./routers/attachment.js";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
  map: mapRouter,
  node: nodeRouter,
  tag: tagRouter,
  attachment: attachmentRouter,
});

export type AppRouter = typeof appRouter;
