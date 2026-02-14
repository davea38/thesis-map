# Tech Stack

## Frontend

- **React** (latest) — UI library
- **Vite** (latest) — Build tool and dev server
- **Tailwind CSS** (latest) — Utility-first CSS framework
- **shadcn/ui** (latest) — Component library built on Radix primitives

## Backend

- **Bun** — Runtime and package manager
- **Fastify** — HTTP server framework
- **tRPC** — End-to-end typesafe API layer

## Database

- **PostgreSQL** — Relational database
- **Prisma** — ORM and schema management

## Authentication

- None for MVP. The application is single-user; no login or auth flow is required.

## Project Structure

Monorepo with separate `client/` and `server/` directories sharing types via tRPC.
