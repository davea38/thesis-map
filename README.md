# thesis-map

A visual mind-mapping tool for building and evaluating thesis arguments. Structure your thesis as a radial map where supporting and opposing evidence branches outward from a central claim, with strength-weighted aggregation showing the overall balance of your argument.

## Features

- **Thesis maps** — Create multiple maps, each centered on a thesis statement
- **Evidence tree** — Add arbitrary-depth nodes representing claims, evidence, and sub-arguments
- **Polarity** — Tag evidence as tailwind (supporting) or headwind (opposing)
- **Strength scoring** — Rate each piece of evidence 0–100% to weight its contribution
- **Aggregation** — Each node shows a balance bar summarizing its children's weighted support vs opposition
- **Groups** — Optionally organize child nodes into named theme groups (e.g., "Economic factors")
- **Attachments** — Add citations, notes, and file uploads to any node
- **Radial layout** — Interactive pan-and-zoom canvas with the thesis at the center

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| Backend | Bun, Fastify, tRPC |
| Database | PostgreSQL, Prisma ORM |
| Auth | None (single-user MVP) |

## Project Structure

```
thesis-map/
├── specs/          # Feature specifications
├── client/         # React frontend (Vite)
├── server/         # Fastify + tRPC backend
└── prisma/         # Prisma schema and migrations
```

## Getting Started

> **Note:** Implementation has not started yet. The `specs/` directory contains the full design specification.

### Prerequisites

- Bun (latest)
- PostgreSQL

### Development

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev
```

## Specifications

All feature specs live in `specs/`:

| Spec | Description |
|------|-------------|
| [tech-stack](specs/tech-stack.md) | Application technology choices |
| [map-management](specs/map-management.md) | Creating, listing, opening, deleting maps |
| [node-model](specs/node-model.md) | Node fields: statement, body, strength, polarity |
| [node-hierarchy](specs/node-hierarchy.md) | Arbitrary-depth tree structure |
| [groups](specs/groups.md) | Optional named theme groups for child nodes |
| [polarity](specs/polarity.md) | Tailwind / headwind polarity system |
| [aggregation](specs/aggregation.md) | Strength-weighted balance bar calculation |
| [attachments](specs/attachments.md) | Citations, notes, and file attachments |
| [radial-layout](specs/radial-layout.md) | Radial mind map canvas with pan/zoom |
| [node-interaction](specs/node-interaction.md) | Inline editing and detail side panel |
