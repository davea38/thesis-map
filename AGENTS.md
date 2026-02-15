# Operational Guide

<!-- This file starts nearly empty ON PURPOSE. -->
<!-- As you run RALPH loops, Claude will add learnings here. -->
<!-- You can also add notes here yourself when you spot patterns. -->

## Project

- Project: thesis-map
- Language: TypeScript
- Framework: React (frontend), Fastify + tRPC (backend), Prisma (ORM)

## Commands

- Build: `bun run build`
- Test: `bun run test`
- Lint: `bun run lint`
- Dev: `bun run dev`

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Bun, Fastify, tRPC
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** None (single-user MVP)
- **Structure:** Monorepo with `client/` and `server/` directories

## Learnings

- Server exports `AppRouter` type via `"exports": { "./router": "./src/router.ts" }` in `server/package.json`. Client imports it as `import type { AppRouter } from "server/router"`.
- Client has `server` as a workspace devDependency for type-only imports.
- tRPC v11.10.0 is used. Client uses `createTRPCReact` and `httpBatchLink`.
- Client type checking (`tsc -b` in client/) also checks server source files transitively. Keep server code clean of unused imports.
- Client TypeScript uses `noUnusedLocals` and `noUnusedParameters` (strict).
- Vitest v4 is the test runner for both packages. Server tests use `environment: "node"`, client tests use `environment: "jsdom"` with `@testing-library/react`.
- Client test setup file (`src/test-setup.ts`) imports `@testing-library/jest-dom/vitest` for DOM matchers.
- Server tests can use `appRouter.createCaller({})` to test tRPC procedures without HTTP.
