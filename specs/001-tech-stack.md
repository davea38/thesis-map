# Tech Stack

## Frontend

- **React** (latest) — UI library
- **Vite** (latest) — Build tool and dev server
- **Tailwind CSS** (latest) — Utility-first CSS framework
- **shadcn/ui** (latest) — Component library built on Radix primitives
- **React Flow** (latest) — Canvas rendering, pan/zoom, node/edge management for the radial map

## Backend

- **Bun** — Runtime and package manager
- **Fastify** — HTTP server framework
- **tRPC** — End-to-end typesafe API layer

## Database

- **PostgreSQL** — Relational database
- **Prisma** — ORM and schema management

## State Management

- **tRPC + React Query** — Server state (data fetching, caching, mutations)
- **React context or Zustand** — Local UI state (selected node, side panel open/closed, tag filters)

## Authentication

- None for MVP. The application is single-user; no login or auth flow is required.

## File Uploads

- Deferred from MVP. File attachments will be added in a future phase.

## Project Structure

Monorepo with separate `client/` and `server/` directories sharing types via tRPC.
