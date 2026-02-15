# Attachments

Nodes support sources and free-form notes.

## Overview

Each node can have **zero or more attachments**. There are two attachment types:

- **Source** — a URL-based reference with auto-fetched preview metadata and an optional user note. Full specification in `012-sources.md`.
- **Note** — a free-form text block for supplementary commentary, quotes, or tangential thoughts.

## Attachment Types

### Source

A URL-based reference to an external resource. Sources include auto-fetched preview metadata (title, description, image, favicon, site name) and an optional user note for context.

- Requires a **valid URL** (non-empty, parseable). Bare domains are auto-prefixed with `https://`.
- Preview metadata is fetched server-side and is not user-editable.
- Sources are inert — they do not participate in aggregation.

See `012-sources.md` for the complete data model, creation flow, preview fetching behavior, canvas badge, side panel card states, and edge cases.

### Note

A **free-form text block** for supplementary commentary, quotes, or tangential thoughts. This is separate from the node's main free text body field.

**Body vs Note distinction:** The node's body is the author's primary reasoning or argument for the claim. Note attachments are for supplementary material the author wants to track separately — e.g., a related observation, a counterpoint to investigate later, or a reference quote.

Note attachments require `noteText` to be non-empty — a completely blank note is not valid.

## File Attachments (Future)

File and image uploads are **deferred from MVP**. When implemented, file uploads will become a source type (`sourceType: "file"`) on the source attachment rather than a separate attachment category. See the future extensibility section in `012-sources.md`.

## Management

- Attachments are managed from the **node's detail side panel**
- Multiple attachments of any type can exist on a single node
- Users can **add, edit, and remove** attachments from the side panel
- Existing attachments can be **edited in place** (not just add/remove)
- Attachments are displayed in **creation order**. No manual reordering for MVP.
