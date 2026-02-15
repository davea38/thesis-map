import { describe, it, expect } from "vitest";
import { appRouter } from "./router.js";

describe("appRouter", () => {
  const caller = appRouter.createCaller({});

  it("healthCheck returns ok status", async () => {
    const result = await caller.healthCheck();
    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
