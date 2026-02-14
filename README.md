# thesis-map

A visual mind-mapping tool for building and evaluating thesis arguments. Structure your thesis as a radial map where supporting and opposing evidence branches outward from a central claim, with strength-weighted aggregation showing the overall balance of your argument.

## Features

- **Thesis maps** — Create multiple maps, each with a name and thesis statement
- **Evidence tree** — Add arbitrary-depth nodes representing claims, evidence, and sub-arguments
- **Polarity** — Tag evidence as tailwind (supporting), headwind (opposing), or neutral
- **Strength scoring** — Rate each piece of evidence 0–100% to weight its contribution
- **Aggregation** — Each node shows a balance bar summarizing its children's weighted support vs opposition
- **Tags** — Label nodes with color-coded tags for organization and filtering
- **Attachments** — Add citations and notes to any node
- **Radial layout** — Interactive pan-and-zoom canvas with the thesis at the center, fully responsive
- **Autosave** — All changes persist automatically

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui, React Flow |
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
| [001-tech-stack](specs/001-tech-stack.md) | Application technology choices |
| [002-map-management](specs/002-map-management.md) | Creating, listing, opening, editing, deleting maps |
| [003-node-model](specs/003-node-model.md) | Node fields: statement, body, strength, polarity |
| [004-node-hierarchy](specs/004-node-hierarchy.md) | Arbitrary-depth tree structure |
| [005-tags](specs/005-tags.md) | Color-coded tags for organization and filtering |
| [006-polarity](specs/006-polarity.md) | Tailwind / headwind / neutral polarity system |
| [007-aggregation](specs/007-aggregation.md) | Strength-weighted balance bar calculation |
| [008-attachments](specs/008-attachments.md) | Citations and notes (file uploads deferred) |
| [009-radial-layout](specs/009-radial-layout.md) | Radial mind map canvas with React Flow |
| [010-node-interaction](specs/010-node-interaction.md) | Inline editing, side panel, touch and keyboard |
| [011-persistence](specs/011-persistence.md) | Autosave, optimistic updates, error handling |
