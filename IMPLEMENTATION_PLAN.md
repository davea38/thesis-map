# Implementation Plan

<!-- This file is generated and updated by RALPH. -->
<!-- Run ./loop.sh plan to create/refresh this from your specs. -->
<!-- Run ./loop.sh build to implement tasks one at a time. -->

## Gap Analysis

**Status: Greenfield — no code exists yet.** No `client/`, `server/`, `src/`, or `node_modules/` directories are present. There is no `package.json`, no Prisma schema, no React components, and no database configuration. Every spec requirement is pending implementation.

### Changes from Previous Plan

The following gaps were identified and addressed in this revision:

1. **Missing: Map deletion from map view.** Spec 002 requires maps to be deletable both from the landing page and from within the map view. Added task 11.7.
2. **Missing: Source badge tooltip and 99+ cap.** Spec 012 requires hover tooltip ("N source(s)") and capping the displayed count at 99+. Expanded task 11.4 to include these.
3. **Missing: Stale fetch discard on URL change.** Spec 012 requires that if a URL changes while a preview fetch is in-flight, the stale result is discarded. Added explicit handling to task 6.2.
4. **Missing: Undo toast for source removal.** Spec 012 specifies "Remove source — with undo toast." Added task 13.10 for the undo toast pattern.
5. **Missing: Lazy-loaded preview images.** Spec 012 requires lazy-loading preview images when a node has many (10+) sources. Added to task 13.8.
6. **Incomplete: Inline edit Escape behavior.** Spec 010 says Escape during inline edit cancels without saving. Clarified in task 12.2.

---

## Tasks

### 1. Project Scaffolding (spec: 001-tech-stack)
> Everything depends on having a working monorepo with build tooling. This is the foundation all other tasks build on.

- [x] **1.1** Initialize the monorepo root: run `bun init`, create a root `package.json` with `workspaces` pointing to `client/` and `server/`, and add workspace-level scripts (`dev`, `build`, `test`, `lint`).
  — *Why: A working monorepo root is the prerequisite for all development. The workspace config lets Bun resolve cross-package dependencies.*

- [x] **1.2** Scaffold the `server/` directory: create `package.json`, install Fastify, `@trpc/server`, Zod, and TypeScript; add `tsconfig.json`; create a minimal `src/index.ts` entry point that starts a Fastify server with a tRPC health-check endpoint.
  — *Why: The backend must exist before we can define API routes, connect a database, or serve data to the frontend.*

- [x] **1.3** Scaffold the `client/` directory: create a Vite + React + TypeScript project, install Tailwind CSS and configure it, initialize shadcn/ui, and create a minimal page that renders in the browser.
  — *Why: The frontend must exist before we can build any UI components or pages.*

- [x] **1.4** Wire the tRPC client in `client/` to the tRPC server in `server/`: install `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`; create a tRPC provider wrapping the app; confirm end-to-end type-safe communication by calling the health-check procedure from the client.
  — *Why: Proves the client-server integration works before building real features on top of it.*

- [x] **1.5** Set up Vitest for both `client/` and `server/` so that `bun run test` works from the monorepo root, running all tests across both packages.
  — *Why: AGENTS.md specifies `bun run test` as a command. Tests must be runnable before we write any logic worth testing.*

- [ ] **1.6** Set up ESLint and Prettier with shared config at the monorepo root so that `bun run lint` works across both packages.
  — *Why: AGENTS.md specifies `bun run lint` as a command. Consistent code style from the start prevents formatting churn later.*

### 2. Database & Schema (specs: 002, 003, 004, 005, 006, 008, 012)
> Data models must exist before any CRUD logic. The schema is the single source of truth for all data.

- [x] **2.1** Install Prisma in `server/`, configure it for PostgreSQL (connection string via environment variable), and create the initial `schema.prisma` with all models:
  - `Map` (id, name, thesisStatement, createdAt, updatedAt)
  - `Node` (id, mapId FK, parentId nullable self-relation, statement String NOT NULL default "", body String NOT NULL default "", strength Int nullable — null for root / default 0 for non-root, polarity String nullable — null for root / default "neutral" for non-root, createdAt, updatedAt, orderIndex Int default 0). Cascade: delete Map cascades to all Nodes.
  - `Tag` (id, mapId FK, name String, color String) with `@@unique([mapId, name])`. Cascade: delete Map cascades to all Tags.
  - `NodeTag` (join table: nodeId FK + tagId FK, `@@unique([nodeId, tagId])`). Cascade: delete Node or delete Tag cascades to NodeTag rows.
  - `Attachment` (id, nodeId FK, type String — "source" or "note", url String nullable, sourceType String nullable default "url", noteText String nullable, previewTitle String nullable, previewDescription String nullable, previewImageUrl String nullable, previewFaviconUrl String nullable, previewSiteName String nullable, previewFetchStatus String nullable default "pending", previewFetchedAt DateTime nullable, previewFetchError String nullable, createdAt, orderIndex Int default 0). Cascade: delete Node cascades to Attachments.
  — *Why: The Prisma schema defines every table the app uses. Cascade rules must be correct from the start so that deleting a map, node, or tag properly cleans up related data. Source attachments include preview metadata fields per spec 012.*

- [ ] **2.2** Run `prisma migrate dev` to generate and apply the initial migration; verify the database is reachable and all tables are created correctly. *(Requires a running PostgreSQL instance.)*
  — *Why: Confirms the schema is valid and the database connection is functional before writing any application code against it.*

- [x] **2.3** Generate the Prisma client and create a shared database client instance (`db.ts`) that server code imports.
  — *Why: A single Prisma client instance ensures connection pooling and consistent access patterns across all server-side code.*

### 3. Map Management API (spec: 002)
> Maps are the top-level entity; nodes, tags, and attachments all live inside maps.

- [x] **3.1** Create a tRPC `map` router with a `map.create` procedure: accepts name and thesisStatement (both required), creates the Map row and a root Node (statement = thesis, polarity = null, strength = null, parentId = null) in a single transaction, returns the created map with its root node.
  — *Why: Spec 002 requires both fields on creation, and spec 003 requires the thesis to become the root node. A transaction ensures atomicity — no orphan maps or nodes.*

- [x] **3.2** Add a `map.list` procedure: returns all maps sorted by `updatedAt` descending, including name, thesisStatement, createdAt, and updatedAt.
  — *Why: The landing page displays maps sorted by last-modified. This is the first data the user sees.*

- [x] **3.3** Add a `map.getById` procedure: returns a single map with its full node tree (all nodes with children, tags, attachments, and computed aggregation data), structured for the canvas to render.
  — *Why: The map view needs the entire tree in one request to render the radial layout. Including aggregation data avoids extra round-trips.*

- [x] **3.4** Add a `map.update` procedure: allows updating the map name. Validates that name is non-empty.
  — *Why: Spec 002 says the map name can be edited from the landing page or map view. Thesis statement editing is handled via root node update (task 4.3).*

- [x] **3.5** Add a `map.delete` procedure: deletes the map and all associated data (nodes, tags, node-tags, attachments) via Prisma cascades. Returns success confirmation.
  — *Why: Spec 002 requires map deletion to remove everything. Cascades handle cleanup, but we verify it works end-to-end.*

- [x] **3.6** Implement `Map.updatedAt` auto-bumping: whenever any child entity (node, tag, attachment, node-tag) within the map is created, updated, or deleted, update the parent map's `updatedAt` timestamp. Use Prisma middleware or explicit updates in each mutation.
  — *Why: Spec 002 defines "Last modified" as "the most recent edit to the map or any of its nodes." The landing page sorts by this field, so it must reflect all activity within the map.* *(Implemented as a reusable `bumpMapUpdatedAt` utility in `server/src/lib/bump-map-updated.ts` for explicit use in mutation handlers.)*

### 4. Node CRUD API (specs: 003, 004, 006)
> Nodes are the core data unit; hierarchy, polarity, attachments, and aggregation all depend on nodes existing.

- [x] **4.1** Add a `node.create` procedure: accepts parentId and mapId, creates a child node with defaults (statement = "", polarity = "neutral", strength = 0, no tags). Returns the created node. Validates that the parent node exists and belongs to the same map.
  — *Why: Spec 004 defines explicit creation defaults. Validating parentId prevents cross-map linking bugs.*

- [x] **4.2** Add a `node.getById` procedure: returns a single node with its children (ordered by createdAt ascending), applied tags, attachments (ordered by createdAt ascending), and computed aggregation data (tailwindTotal, headwindTotal, balanceRatio or null).
  — *Why: The side panel needs full node details including children for aggregation display. Ordering specs: children by creation time oldest-first (spec 004), attachments by creation order (spec 008).*

- [x] **4.3** Add a `node.update` procedure: accepts partial updates to statement, body, strength, and polarity. Enforce root node constraints: reject strength and polarity updates for the root node (parentId = null). When updating the root node's statement, also update `Map.thesisStatement` in the same transaction.
  — *Why: Spec 003 requires root to have no polarity or strength, and that root statement and map thesis stay in sync. A transaction ensures consistency.*

- [x] **4.4** Add a `node.delete` procedure: recursively counts all descendants first and returns the count along with a "pending" status so the frontend can show confirmation. After confirmation, deletes the entire subtree. Reject deletion of the root node — return an error directing the user to delete the map instead. Confirmation is required for ALL deletions including leaf nodes (spec 004).
  — *Why: Spec 004 requires confirmation for every deletion with descendant count. Root deletion is handled via map management to prevent orphan maps.*

- [x] **4.5** Ensure all queries returning children order them by `createdAt` ascending (oldest first). This applies to `node.getById`, `map.getById`, and any other procedure returning child lists.
  — *Why: Spec 004 defines sibling ordering as creation-time ascending. No manual reordering for MVP.* *(Both `node.getById` and `map.getById` order children by `createdAt: "asc"`.)*

### 5. Tag CRUD API (spec: 005)
> Tags are map-global and independent of node hierarchy. They need maps to exist but not specific nodes.

- [x] **5.1** Create a tRPC `tag` router with a `tag.create` procedure: accepts mapId, name, and color. Validates that the name is unique within the map. Color must be from a defined preset palette.
  — *Why: Spec 005 requires unique tag names within a map and colors from a preset palette. Enforcing these constraints at the API level prevents invalid data.* *(Implemented with a 10-color preset palette defined in `server/src/routers/tag.ts` and exported as `TAG_COLOR_PALETTE`.)*

- [x] **5.2** Add a `tag.list` procedure: returns all tags for a given map, including how many nodes each tag is applied to.
  — *Why: The tag filter panel and side panel tag management need the full tag list. Node counts help users understand tag usage.* *(Returns tags ordered alphabetically with `nodeCount` computed from `_count.nodeTags`.)*

- [x] **5.3** Add a `tag.update` procedure: allows renaming and recoloring a tag. Validates name uniqueness within the map. Changes propagate automatically since nodes reference the tag by ID.
  — *Why: Spec 005 says changes to a tag's name or color apply everywhere the tag is used across the map.* *(Skips uniqueness check when name is unchanged to allow no-op renames.)*

- [x] **5.4** Add a `tag.delete` procedure: removes the tag and all NodeTag associations (via cascade). Does not delete any nodes. Empty tags (0 nodes) are valid and persist until explicitly deleted.
  — *Why: Spec 005 explicitly states that deleting a tag does not affect nodes, and empty tags persist. The cascade on NodeTag handles cleanup.*

- [x] **5.5** Add `tag.addToNode` and `tag.removeFromNode` procedures: manage the many-to-many NodeTag relationship. Validate that the tag and node belong to the same map.
  — *Why: Tag-node assignment is a separate operation from tag CRUD. Cross-map validation prevents data integrity issues.* *(Both procedures validate map membership and bump `map.updatedAt`.)*

### 6. Attachment & Source API (specs: 008, 012)
> Attachments are per-node; they need nodes to exist first.

- [x] **6.1** Create a tRPC `attachment` router with an `attachment.create` procedure: accepts nodeId, type ("source" or "note"), and type-specific fields. For sources, validate that `url` is non-empty and a valid URL (auto-prepend `https://` if protocol is missing, max 2048 chars). For notes, validate that `noteText` is non-empty. On source creation, set `previewFetchStatus` to `"pending"` and trigger a preview fetch (task 6.5). Assign orderIndex based on existing attachment count for the node.
  — *Why: Spec 012 requires a valid URL for sources. Preview fetching begins immediately on creation. OrderIndex maintains creation-order display.* *(Implemented in `server/src/routers/attachment.ts`. URL normalization auto-prepends `https://`. Preview fetch is fire-and-forget async after creation.)*

- [x] **6.2** Add an `attachment.update` procedure: allows editing attachment fields in place. For sources, when the `url` field changes, clear all preview fields (`previewTitle`, `previewDescription`, `previewImageUrl`, `previewFaviconUrl`, `previewSiteName`, `previewFetchError`), reset `previewFetchStatus` to `"pending"`, set `previewFetchedAt` to null, and trigger a new preview fetch. Include a mechanism to discard stale fetch results: store a fetch generation counter or compare the URL at write-back time so that if the URL changed again during the in-flight fetch, the stale result is discarded (spec 012 edge case). Re-validates source URL non-emptiness and note `noteText` non-emptiness on update.
  — *Why: Spec 012 says URL changes clear preview data and re-trigger fetching. The stale-fetch guard prevents a slow prior fetch from overwriting data for the new URL.* *(URL-change guard compares URL at write-back time to discard stale results.)*

- [x] **6.3** Add an `attachment.delete` procedure: removes a single attachment by ID. Returns the deleted attachment data so the frontend can support an undo action.
  — *Why: Users need to remove attachments. Returning the deleted data enables the undo toast required by spec 012 for source removal.* *(Returns full attachment data minus the nested node relation.)*

- [x] **6.4** Add an `attachment.listByNode` procedure: returns all attachments for a node ordered by `createdAt` ascending (creation order).
  — *Why: Spec 008 says attachments display in creation order. This supports the side panel attachment list.*

- [x] **6.5** Create an `attachment.refreshPreview` tRPC procedure: fetches the source's URL, parses the HTML response, and extracts OpenGraph/meta metadata (title, description, image, favicon, site name) using the priority order defined in spec 012. Updates the attachment's preview fields and sets `previewFetchStatus` to `"success"` or `"failed"`. Handles timeouts (10s), redirects (max 5), non-HTML content (success with empty preview fields), response size limits (1 MB), and all error modes (DNS failure, HTTP 4xx/5xx, SSL error). Uses User-Agent `ThesisMap/1.0 (link preview)`. Truncates extracted fields to spec limits (title 500 chars, description 1000 chars, site name 200 chars). Before writing results, verifies the attachment's URL has not changed since the fetch began — if it has, discards the result silently. Returns the updated attachment.
  — *Why: Spec 012 requires server-side preview fetching with specific timeout, redirect, error handling, and truncation behavior. The URL-change guard handles the edge case of concurrent edits. This procedure is called on source creation (task 6.1) and when the user clicks "Refresh preview" in the UI.* *(Metadata extraction uses regex-based HTML parsing with OG/Twitter/HTML fallback priority. Manual redirect following for redirect limit enforcement. 1 MB response body cap.)*

### 7. Aggregation Logic (spec: 007)
> Aggregation is a read-only computation over direct children; needs nodes with polarity and strength.

- [x] **7.1** Implement a server-side utility function `computeBalanceBar(children)` that takes a list of direct child nodes and returns `{ tailwindTotal, headwindTotal, balanceRatio }` or `null`. Logic: sum strengths of tailwind children for tailwindTotal, sum strengths of headwind children for headwindTotal, balanceRatio = tailwindTotal / (tailwindTotal + headwindTotal). Return `null` when tailwindTotal + headwindTotal = 0 (all children are neutral or at 0% strength). Neutral children and 0-strength children contribute nothing. Both tagged and untagged children contribute equally.
  — *Why: The balance bar is central to the app's value proposition. Centralizing the computation in one function ensures consistency and testability.* *(Implemented in `server/src/lib/compute-balance-bar.ts` with typed `ChildInput` and `BalanceBarResult` interfaces.)*

- [x] **7.2** Write unit tests for `computeBalanceBar` covering: all-tailwind, all-headwind, mixed, all-neutral, all-zero-strength, empty children array, single child, and the example from spec 007 (80+40 tailwind, 60 headwind, 70 neutral = 67% tailwind).
  — *Why: Aggregation is the core calculation. Getting it wrong undermines the entire app. Test coverage prevents regressions.* *(14 test cases in `server/src/lib/compute-balance-bar.test.ts` covering all specified scenarios plus null strength and null polarity edge cases.)*

- [x] **7.3** Integrate aggregation into `node.getById` and `map.getById` responses: every node that has children includes its computed aggregation data. The root node DOES display aggregation (spec 007). Leaf nodes include `null` for aggregation fields.
  — *Why: The frontend needs aggregation data on every node to render balance bars without making per-node requests.* *(Refactored both routers to use the shared `computeBalanceBar` function, replacing duplicated inline logic.)*

### 8. Persistence & Autosave Infrastructure (spec: 011)
> Autosave is a cross-cutting concern that affects every edit operation in the UI. Set up the pattern before building individual UI forms.

- [x] **8.1** Create a reusable `useDebouncedMutation` hook that wraps tRPC mutations with 1-2 second debounce and optimistic updates. The hook should accept a mutation, optimistic update function, and rollback function, and handle the debounce timer lifecycle.
  — *Why: Spec 011 requires all edits to autosave with debouncing and optimistic UI. Building this once as a reusable hook prevents duplicating the pattern in every form.* *(Implemented in `client/src/hooks/use-debounced-mutation.ts`. Default delay 1500ms. Supports `onOptimisticUpdate`, `onRollback`, `onSuccess` callbacks. Returns `mutate`, `flush`, `cancel`, `isPending`, `isError`, `error`. 13 tests in `use-debounced-mutation.test.ts`.)*

- [x] **8.2** Create a `SaveIndicator` component that subscribes to tRPC mutation states and shows "Saving..." (when any mutation is in-flight), "Saved" (when all mutations have settled successfully), or a warning state (when a mutation has failed). Position it unobtrusively in the UI header/toolbar.
  — *Why: Spec 011 requires a visible save status indicator so users have confidence their work is persisted.* *(Implemented in `client/src/components/save-indicator.tsx` using `useIsMutating` from React Query. Shows "Saving..." with pulse animation during mutations, "Saved" otherwise. Positioned in the root layout header. Warning state will be enhanced when retry logic (8.3) is implemented.)*

- [ ] **8.3** Implement retry-on-failure logic: when a mutation fails, queue it and retry automatically with exponential backoff. Show a non-blocking toast/banner warning on persistent failure. Never discard the user's pending changes.
  — *Why: Spec 011 requires that user edits are never lost due to transient network issues. Retry with backoff avoids hammering a down server.*

### 9. UI State Management (spec: 001)
> Local UI state needs to be in place before building interactive components that depend on it.

- [x] **9.1** Create a Zustand store for local UI state with the following slices: `selectedNodeId` (string | null), `sidePanelOpen` (boolean), `sidePanelScrollTarget` (string | null — e.g., "attachments" when the source badge is clicked), `activeTagFilters` (Set of tag IDs), `inlineEditNodeId` (string | null), `contextMenuState` (position + target node, or null).
  — *Why: Spec 001 calls for local UI state management separate from server state. Multiple components (canvas, side panel, tag filter, context menu) read and write this shared state. The sidePanelScrollTarget enables the source badge click-to-scroll behavior required by spec 012.* *(Implemented in `client/src/stores/ui-store.ts` with actions: selectNode, clearSelection, openSidePanel, closeSidePanel, setActiveTagFilters, toggleTagFilter, clearTagFilters, setInlineEditNodeId, openContextMenu, closeContextMenu. 11 unit tests in `ui-store.test.ts`.)*

### 10. Landing Page UI (spec: 002)
> The first screen the user sees; entry point to all maps. Depends on map CRUD API (task 3).

- [x] **10.1** Set up React Router with routes: `/` (landing page) and `/map/:id` (map view). Add a root layout component that includes the `SaveIndicator`.
  — *Why: The app needs client-side routing before individual pages can be built. The root layout ensures the save indicator is visible on every page.* *(Installed `react-router-dom`. BrowserRouter wraps the app in `main.tsx`. `App.tsx` defines routes with a `RootLayout` component using `<Outlet>`. Header includes app name link and SaveIndicator. Placeholder page components in `client/src/pages/`. 4 routing tests using `MemoryRouter`.)*

- [x] **10.2** Create the landing page component (`/`): fetch and display all maps sorted by last-modified using `map.list`, showing name, thesis statement, and last-modified timestamp for each. Each map entry links to `/map/:id`.
  — *Why: This is the app's home screen and the only way to navigate to a map.* *(Implemented in `client/src/pages/landing-page.tsx` using `trpc.map.list.useQuery()`. Shows loading skeleton, error state, empty state with create prompt, and map list with relative timestamps. `formatRelativeTime` utility in `client/src/lib/format-time.ts`. 5 landing page tests and 6 format-time tests.)*

- [x] **10.3** Implement the "Create Map" dialog: a modal form prompting for map name and thesis statement (both required), with validation. On submit, calls `map.create` and navigates to the new map's view at `/map/:id`.
  — *Why: Users need to create maps before they can do anything else in the app. Both fields are required per spec 002.* *(Implemented as `CreateMapDialog` component in `client/src/components/create-map-dialog.tsx` using shadcn/ui Dialog, Button, Input, Label. Installed shadcn/ui components in `client/src/components/ui/`. Form validates both fields non-empty (trims whitespace), shows inline errors, clears errors on typing. On success, invalidates map list cache and navigates to `/map/:id`. Shows "Creating..." disabled state during submission. Form resets on reopen. Integrated into landing page header ("New Map" button) and empty state ("Create your first thesis map" button). 9 tests in `create-map-dialog.test.tsx`.)*

- [x] **10.4** Implement map deletion from the landing page: a delete button per map that opens a confirmation dialog naming the specific map and warning that all data will be lost. On confirm, calls `map.delete` and removes the map from the list.
  — *Why: Spec 002 requires confirmation before destroying data. The dialog must name the map being deleted so the user knows exactly what they are losing.* *(Created reusable `DeleteMapDialog` component in `client/src/components/delete-map-dialog.tsx`. Each map card shows a trash icon button (top-right, visible on hover) that opens the confirmation dialog with the map name. Dialog uses `trpc.map.delete` mutation with cache invalidation. Refactored `map-view.tsx` to use the same shared component. 6 new tests in `landing-page.test.tsx`.)*

- [x] **10.5** Implement the empty state: when `map.list` returns zero maps, display a friendly message and a prominent "Create your first thesis map" button that opens the create dialog.
  — *Why: Spec 002 explicitly defines the empty state UX to guide new users.* *(Implemented as part of task 10.2. Updated in task 10.3 to open the CreateMapDialog instead of linking to `/map/new`.)*

- [ ] **10.6** Add inline editing of the map name from the landing page: clicking the name transforms it into an editable text field, with changes autosaved via the debounced mutation pattern from task 8.
  — *Why: Spec 002 says the map name can be edited from the landing page. Uses the shared autosave infrastructure.*

### 11. Map View — Radial Layout Canvas (specs: 009, 002)
> The core visualization; everything interactive happens here. Depends on node CRUD API (task 4) and aggregation (task 7).

- [x] **11.1** Install React Flow and create the map view page component (`/map/:id`): full-screen canvas with pan and zoom enabled. On mount, fetch the full map tree via `map.getById` and store it in React Query cache.
  — *Why: The canvas is the primary workspace. Fetching the full tree on mount avoids waterfall requests as the user explores the map.* *(Installed `@xyflow/react` v12. Map view fetches full tree via `trpc.map.getById.useQuery()`. Flat node list is converted to React Flow nodes and edges with a basic radial layout (BFS concentric rings). Includes loading spinner, error state with "Map not found" handling, and full-screen canvas with pan/zoom, Background, and Controls. The basic layout places root at center with children in concentric rings — task 11.2 will refine auto-spacing.)*

- [x] **11.2** Implement the radial layout algorithm: a function that takes the tree of nodes and computes x/y positions with root at center, direct children radiating outward in a first concentric ring, grandchildren in a second ring, and so on. Auto-space siblings evenly around their parent arc. Recompute positions when nodes are added or removed.
  — *Why: Spec 009 requires a radial mind-map layout, not a default top-down tree. This is the defining visual feature of the app.* *(Extracted into `client/src/lib/radial-layout.ts` as `computeRadialLayout()`. Uses leaf-count-weighted arc allocation so subtrees with more leaves get proportionally more angular space, preventing overlaps. Minimum sibling gap enforcement prevents crowding when subtrees are very small. 14 unit tests cover empty input, single root, child placement, depth ordering, arc distribution, wide/deep/asymmetric trees, and no-overlap verification.)*

- [x] **11.3** Define the color system: assign distinct colors for tailwind, headwind, and neutral polarity (used on nodes and edges). Define a preset color palette for tags (8-12 colors users can choose from).
  — *Why: Spec 009 requires polarity color-coding on nodes and edges, and spec 005 requires tag colors from a preset palette. Defining these centrally ensures visual consistency.* *(Implemented in `client/src/lib/colors.ts`. Exports `POLARITY_COLORS` with border/bg/text/bar for tailwind (green), headwind (red), neutral (slate). `ROOT_NODE_COLOR` for root nodes (indigo). `TAG_COLOR_PALETTE` mirrors server palette (10 colors). Helper functions: `getPolarityColors()`, `getEdgeColor()`, `getContrastText()`. Constants for selection ring color and filter dim opacity. 22 unit tests in `colors.test.ts`.)*

- [x] **11.4** Create a custom React Flow node component displaying: (a) statement text truncated with ellipsis if it overflows, (b) polarity color-coding as a border or background tint, (c) tag chips as small color-coded badges with tag name, (d) balance bar rendered inline when the node has contributing children (otherwise hidden), and (e) source count badge at the bottom-right corner — a muted pill showing a link icon and count (e.g., "🔗 3"), only visible when the node has >= 1 source attachment, capped at "99+" for 100 or more sources; clicking the badge opens the side panel scrolled to the attachments section; hovering shows a tooltip ("N source(s)").
  — *Why: Spec 009 defines exactly what each node shows on the canvas. These five visual elements give users at-a-glance understanding of the argument structure. The source badge (spec 012) indicates external references without cluttering the node. The tooltip and 99+ cap are explicitly required by spec 012.* *(Implemented as `ThesisNode` in `client/src/components/thesis-node.tsx`. Registered as custom node type `"thesis"` in map view. Statement truncated to 3 lines with ellipsis via CSS `-webkit-line-clamp`. Polarity colors applied via `getPolarityColors()` (border + bg tint). Tag chips with contrast text via `getContrastText()`. Balance bar shows tailwind/headwind ratio as colored segments. Source badge shows link icon + count at bottom-right, capped at 99+, with tooltip ("N source(s)"), click opens side panel scrolled to attachments. 19 tests in `thesis-node.test.tsx`.)*

- [x] **11.5** Render curved edges between parent and child nodes using React Flow's custom edge support. Edge color reflects the child node's polarity.
  — *Why: Spec 009 specifies curved, polarity-colored connection lines to visually reinforce the argument structure.* *(Implemented as `PolarityEdge` custom edge component in `client/src/components/polarity-edge.tsx`. Uses `getBezierPath` from React Flow for smooth curved paths. Edge color comes from child node's polarity via `getEdgeColor()`: green for tailwind, red for headwind, slate for neutral, indigo for root connections. Radial layout passes `childPolarity` in edge data. Custom edge type registered in map-view. 8 tests in `polarity-edge.test.tsx`, 2 new edge-data tests in `radial-layout.test.ts`.)*

- [x] **11.6** Add a header/toolbar in the map view showing: the map name (editable inline with autosave), a back-link to the landing page, and the `SaveIndicator` component.
  — *Why: Spec 002 says the map name can be edited from within the map view. Users need a way to return home. The save indicator provides persistence feedback.* *(Implemented as `MapToolbar` component in `client/src/components/map-toolbar.tsx`. Renders as a floating overlay at top-left of the canvas with: back-link to landing page, editable map name (click to edit, Enter/blur to confirm, Escape to cancel and revert), and SaveIndicator. Uses `useDebouncedMutation` (1500ms delay) for autosaving name changes. Empty names revert to server value on blur. Invalidates both `map.getById` and `map.list` caches on success. 12 tests in `map-toolbar.test.tsx`.)*

- [ ] **11.7** Add a "Delete Map" action in the map view header/toolbar: opens the same confirmation dialog as the landing page (naming the map, warning all data will be lost). On confirm, calls `map.delete` and navigates back to the landing page.
  — *Why: Spec 002 explicitly states "Maps can be deleted from the landing page or when editing the map." Without this task, map deletion is only possible from the landing page, violating the spec.*

### 12. Node Interaction — Selection, Inline Edit, Context Menu (spec: 010)
> User interaction with nodes on the canvas. Depends on the canvas (task 11) and UI state (task 9).

- [x] **12.1** Implement node selection: single-click/tap a node sets `selectedNodeId` in the Zustand store, applies a visual highlight (e.g., glowing border) to the selected node, and opens the side panel. Clicking/tapping empty canvas space clears `selectedNodeId` and closes the side panel.
  — *Why: Selection is the gateway to all node editing. It triggers the side panel and enables keyboard shortcuts on the selected node.* *(Implemented in `map-view.tsx` with `onNodeClick` and `onPaneClick` handlers that sync Zustand store with React Flow's selected state. `thesis-node.tsx` reads the `selected` prop and renders a blue selection ring via `boxShadow` using `SELECTION_RING_COLOR`. 2 new tests for selection highlight in `thesis-node.test.tsx`.)*

- [x] **12.2** Implement inline statement editing: double-click/double-tap a node sets `inlineEditNodeId` in the Zustand store, which replaces the node's statement label with a text input. Enter confirms and autosaves via `node.update`. Click-away (blur) also confirms. Escape cancels without saving and restores the previous statement text.
  — *Why: Spec 010 requires fast inline editing without opening the side panel. This is the primary way users name new nodes. Escape-to-cancel prevents accidental edits.* *(Implemented in `thesis-node.tsx`. When `inlineEditNodeId` matches, an `<input>` replaces the statement `<p>`. Uses `nodrag nopan nowheel` CSS classes to prevent React Flow from capturing mouse events. Enter and blur confirm the edit, firing `trpc.node.update.useMutation()`. Escape cancels and restores the previous text. Double-confirm guard via `isConfirming` ref prevents blur from re-firing after Enter. `map-view.tsx` adds `onNodeDoubleClick` handler. Pane click clears inline edit. 10 new tests in `thesis-node.test.tsx`.)*

- [x] **12.3** Implement the context menu: right-click (desktop) or long-press (touch) a node opens a positioned context menu. The menu provides these actions:
  - **Add child** — calls `node.create` with the target node as parent
  - **Delete** — triggers the delete confirmation flow (task 4.4). For the root node, redirect to the map deletion flow (task 11.7) instead.
  - **Set polarity** — submenu with tailwind/headwind/neutral options, calls `node.update`. Hidden or disabled for the root node.
  - **Add tag** — submenu listing existing map tags plus a "Create new tag" option
  - **Remove tag** — submenu listing tags currently on this node (only shown if node has tags)
  — *Why: The context menu is the primary way to perform structural operations on nodes. It must be comprehensive per spec 010. Root node constraints must be respected in the menu.* *(Implemented as `NodeContextMenu` component in `client/src/components/node-context-menu.tsx`. Uses the Zustand `contextMenuState` (x, y, nodeId) to position a custom fixed-position menu. Right-click handled via React Flow's `onNodeContextMenu`. All five actions implemented with submenus for polarity, add tag (with inline "Create new tag" form and color picker), and remove tag. Root node hides "Set polarity" and shows "Delete map" instead of "Delete". Delete confirmation handled by `DeleteNodeDialog` component with two-phase flow (count descendants then confirm). Root node delete redirects to map deletion dialog with navigate-to-landing on success. 24 context menu tests and 4 delete dialog tests.)*

- [ ] **12.4** Implement keyboard shortcuts (active when a node is selected and no text input is focused): Escape deselects and closes the side panel; Delete/Backspace triggers the delete confirmation for the selected node; Enter activates inline edit on the selected node.
  — *Why: Spec 010 defines keyboard shortcuts for power users. The "no text input focused" guard prevents conflicts with typing.*

- [x] **12.5** Implement the "Add child" flow end-to-end: create a new child node via the API with defaults, recompute the radial layout to position the new node, and immediately activate inline edit on the new node so the user can type the statement.
  — *Why: Spec 004 requires new nodes to open with inline edit active. Layout recomputation ensures the new node is properly positioned in the radial arrangement.* *(Already implemented as part of task 12.3 — context menu's "Add child" calls `node.create`, invalidates `map.getById` (triggering layout recomputation via `useMemo`), and sets `inlineEditNodeId` on the new node via `requestAnimationFrame`.)*

### 13. Detail Side Panel (specs: 010, 012)
> Full editing capabilities for the selected node. Depends on selection (task 12) and all CRUD APIs (tasks 4-7).

- [x] **13.1** Create the side panel shell: opens when `selectedNodeId` is set, closes on X button click or canvas click. Desktop/tablet: renders as a right-side overlay panel that does not push or resize the canvas. Mobile/small screens: renders as a bottom sheet that slides up from the bottom. Transitions are animated. When `sidePanelScrollTarget` is set in the Zustand store (e.g., "attachments"), auto-scroll to that section on open and then clear the scroll target.
  — *Why: The side panel is where users do detailed editing. Responsive layout (overlay vs bottom sheet) ensures usability across devices per spec 010. The scroll target supports the source badge click-to-attachments behavior.* *(Implemented as `SidePanel` component in `client/src/components/side-panel.tsx`. Uses fixed positioning with `md:` classes for right-side overlay on desktop and `max-md:` classes for bottom sheet on mobile. Fetches full node data via `trpc.node.getById`. Displays read-only sections for statement, body, properties (strength/polarity hidden for root), tags, attachments, and aggregation. Auto-scrolls to attachments section when `sidePanelScrollTarget` is set. Mobile drag handle indicator for bottom sheet. Close via X button updates Zustand store. 23 tests in `side-panel.test.tsx`.)*

- [x] **13.2** Add the statement editing section: a text input showing the selected node's statement, with autosave via the debounced mutation hook. For the root node, a subtle label indicates that editing updates the map's thesis statement.
  — *Why: The side panel must support editing the statement. Users need visual feedback that root statement edits affect the map thesis (spec 003).* *(Replaced read-only `<p>` with an `<input>` backed by `useDebouncedMutation` (1500ms delay). Local state syncs with server data via `useEffect`. Root node label updated to "(map thesis — edits update the map title)". On success, invalidates both `node.getById` and `map.getById` caches to keep canvas and side panel in sync. 6 new tests added.)*

- [x] **13.3** Add the body editing section: a multi-line text area for the node's free-text body field, with autosave. Label clearly distinguishes it from note attachments (e.g., "Primary Reasoning" or "Body").
  — *Why: Spec 008 emphasizes the body vs. note distinction — body is the author's primary reasoning, notes are supplementary. Clear labeling prevents confusion.* *(Replaced read-only `<p>` with a resizable `<textarea>` backed by `useDebouncedMutation` (1500ms delay). Local state syncs with server data via `useEffect`. Labeled "Primary Reasoning" to distinguish from note attachments per spec 008. On success, invalidates both `node.getById` and `map.getById` caches. Body editing available for all nodes including root. 6 new tests added.)*

- [x] **13.4** Add the strength editing section: a slider (0-100%) and a numeric input (synced), with autosave. Hidden entirely when the selected node is the root node.
  — *Why: Strength drives aggregation. Hiding for root enforces spec 003 constraint that root has no strength.* *(Replaced read-only strength display with an interactive range slider and synced numeric input. Both are backed by `useDebouncedMutation` (500ms delay for responsive slider feel). Values clamped to 0-100 integer range. Local state syncs with server data via `useEffect`. Hidden for root nodes. 9 new tests in `side-panel.test.tsx`.)*

- [x] **13.5** Add the polarity selector: three options (tailwind/headwind/neutral) with polarity color-coding, with autosave. Hidden entirely when the selected node is the root node.
  — *Why: Polarity drives aggregation and visual coding. Hiding for root enforces spec 003/006 constraints.* *(Implemented as three color-coded toggle buttons in the Properties section of the side panel. Uses `useDebouncedMutation` with 500ms delay for responsive feel. Each button shows polarity border color, selected button has tinted background. `aria-pressed` for accessibility. Hidden for root nodes alongside strength editor. 9 new tests in `side-panel.test.tsx`.)*

- [x] **13.6** Add the tag viewing and assignment section: display currently applied tags as color-coded removable chips. Provide a dropdown/combo-box to add existing map tags or create a new tag inline (name + color from preset palette). Removing a chip calls `tag.removeFromNode`.
  — *Why: Spec 010 places tag management in the side panel. Users need to quickly view, add, and remove tags on the selected node.* *(Replaced read-only tag chips with interactive removable chips (X button per tag, `aria-label` for accessibility). Added "+ Add tag" dropdown showing available map tags filtered to exclude already-applied tags. Dropdown includes "+ Create new tag" inline form with name input, 10-color palette picker, and Add button. Uses `trpc.tag.addToNode`, `trpc.tag.removeFromNode`, and `trpc.tag.create` mutations with cache invalidation. Contrast text via `getContrastText()`. Click-outside closes dropdown. Form state resets on node change. 16 new tests in `side-panel.test.tsx`.)*

- [ ] **13.7** Add map-wide tag management within the side panel: a "Manage Tags" expandable section or modal that lists all tags in the map. For each tag, allow renaming (with uniqueness validation), recoloring (from preset palette), and deleting (with a note that deletion removes the tag from all nodes).
  — *Why: Spec 005 says tags can be renamed, recolored, and deleted from the side panel. Changes propagate across the map. This is separate from per-node tag assignment (13.6).*

- [ ] **13.8** Add the attachment management section: list all attachments for the node in creation order. Provide "Add Source" and "Add Note" buttons. When "Add Source" is clicked, insert an empty source card with the URL input auto-focused (spec 012 creation flow). Each source renders as a card with three states: (a) **success** — favicon, site name, bold preview title, description (2-3 lines truncated), preview image thumbnail (lazy-loaded for performance when many sources exist), muted URL link, and user note below; (b) **loading** — skeleton/shimmer placeholders for preview fields with URL visible; (c) **failed** — globe icon, domain name, "Preview unavailable" message, retry button, clickable URL, and user note. Card actions: edit URL (triggers re-fetch), remove source (with undo toast via task 13.10), refresh preview, open URL in new tab. Each note displays its text as an editable text area with autosave. User notes on sources are inline editable with autosave. Each attachment has a remove button. The source list is scrollable when many sources exist.
  — *Why: Spec 010 places attachment management in the side panel. Spec 012 defines source card states, preview display, creation flow, and card actions. The three-state card design handles the asynchronous preview fetch lifecycle. Lazy-loading images prevents performance issues with 10+ sources per spec 012.*

- [ ] **13.9** Add the aggregation details section: display the balance bar (same visual as on the canvas node) plus a numeric breakdown showing tailwind total, headwind total, and balance ratio percentage. Only visible when the selected node has children contributing to aggregation (at least one non-neutral child with strength > 0). For leaf nodes or nodes with only neutral/zero-strength children, show a message like "No aggregation data" or hide the section.
  — *Why: Spec 010 requires the side panel to show aggregation details. The numeric breakdown gives precision beyond the visual bar.*

- [ ] **13.10** Implement a reusable undo toast pattern: when a source is removed, show a non-blocking toast notification with an "Undo" action. If the user clicks undo within a brief window (e.g., 5 seconds), re-create the attachment. Otherwise, the deletion is finalized. Use the deleted attachment data returned by task 6.3 to support restoration.
  — *Why: Spec 012 explicitly requires "Remove source — with undo toast." This prevents accidental data loss and is a distinct UX pattern from the confirmation dialogs used for node deletion.*

### 14. Tag Filtering (spec: 005)
> Depends on tags existing and nodes being rendered on the canvas.

- [ ] **14.1** Create a tag filter panel: a collapsible panel (in the toolbar or as a sidebar/drawer) listing all tags for the current map with checkboxes or toggle chips. Store active filter selections in the Zustand `activeTagFilters` state.
  — *Why: Spec 005 requires users to filter the map view by tag to focus on specific aspects of their argument.*

- [ ] **14.2** When tag filters are active, visually dim (reduce opacity to ~30-40%) nodes that do not have any of the selected tags. Nodes WITH at least one matching tag remain at full opacity. Edges follow their connected nodes' dimming. Aggregation remains completely unaffected by filters — all nodes always contribute to balance bars regardless of filter state.
  — *Why: Spec 005 specifies dimming, not hiding, so users retain spatial context. Aggregation ignores filters to preserve data integrity.*

- [ ] **14.3** Provide a "Clear filters" action that deselects all tags and restores all nodes to full opacity.
  — *Why: Spec 005 says "Clearing the filter restores the full view." Users need a quick way to reset.*

### 15. Responsive / Touch Support (specs: 009, 010)
> Ensures the app works on tablets and phones. Depends on the canvas and interaction handlers.

- [ ] **15.1** Implement touch interaction handlers on the canvas: tap to select (triggers same logic as click), long-press (300ms+) to open context menu (replaces right-click), double-tap to activate inline edit, pinch to zoom, two-finger drag to pan.
  — *Why: Spec 009 requires full touch support. The app must be usable without a mouse.*

- [ ] **15.2** Verify touch target sizing: ensure all interactive elements (nodes, context menu items, side panel controls, tag chips, buttons) meet minimum 44x44px touch targets for finger input on small screens.
  — *Why: Spec 009 specifies touch targets are sized for finger input. Small targets make the app unusable on mobile.*

- [ ] **15.3** Verify responsive side panel behavior: confirm that the side panel renders as a right-side overlay on viewports >= 768px and as a bottom sheet on viewports < 768px. Test that the bottom sheet is scrollable, dismissible, and does not block the entire canvas.
  — *Why: Spec 010 specifies the side panel becomes a bottom sheet on small screens. This must be verified across breakpoints.*

---

## Spec Conflict Notes

1. **No hard conflicts detected.** All 12 specs are internally consistent with each other.

2. **Tension (not a conflict): "required" statement vs. "empty statement" on creation.** Spec 003 says statement is "required" but spec 004 says new nodes start with an "empty statement" and inline edit activates immediately. **Resolution:** The statement column is `NOT NULL` with a default empty string `""`. The UI activates inline edit immediately so the user fills it in. An empty string is a valid (if not ideal) state — there is no server-side rejection of empty statements.

3. **Design decision: aggregation computed server-side.** Spec 007 does not prescribe where aggregation is computed. This plan computes it server-side and includes it in API responses to keep the client simple and the logic authoritative. If performance becomes a concern with large trees, this could be moved client-side.

4. **Design decision: `node.delete` returns descendant count before deletion.** Spec 004 requires the confirmation dialog to show descendant count. The plan uses a two-phase approach: first query the count, then (after UI confirmation) execute the delete. An alternative would be to compute the count client-side from the cached tree.

5. **Root node deletion routing.** Spec 004 states "Deleting the root node is equivalent to deleting the entire map (handled via map management)." The `node.delete` endpoint rejects root deletion and returns an error directing users to `map.delete` instead. The UI should not offer "Delete" in the context menu for the root node, or should redirect to the map deletion flow.

6. **Empty tags persist.** Spec 005 states "Empty tags (applied to zero nodes) are valid and persist until explicitly deleted." The tag system must never auto-prune unused tags.

7. **Tag color palette.** Spec 005 says tags have a color "from a preset palette." The plan includes defining this palette (task 11.3). The palette should offer 8-12 visually distinct colors that work well as small chips on the canvas.

8. **MVP scope explicitly excluded:** No file uploads (spec 008), no reparenting (spec 004), no multi-select (spec 010), no recursive confidence (spec 007), no auth (spec 001), no conflict resolution (spec 011), no manual sibling reordering (spec 004), no manual attachment reordering (spec 008).

9. **Sources replace citations.** Spec 012 introduces sources as the replacement for the former citation attachment type. The `sourceType` discriminator field (`"url"` for MVP) enables future extensibility to file uploads, DOIs, etc. Preview fetching is synchronous in MVP (task 6.5); this could become asynchronous (e.g., background job) if latency is a concern at scale.

10. **Stale fetch discard.** Spec 012 states "URL change during in-flight fetch: Discard the stale fetch result if the URL no longer matches." Both task 6.2 (update procedure) and task 6.5 (refreshPreview) implement this guard by comparing the URL at write-back time against the current stored URL.

11. **Source removal undo vs. node deletion confirmation.** Spec 012 uses an undo toast pattern for source removal, while spec 004 uses a confirmation dialog for node deletion. These are intentionally different UX patterns — undo toast for lightweight reversible actions, confirmation dialog for destructive cascading operations.
