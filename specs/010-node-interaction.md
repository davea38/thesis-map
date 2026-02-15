# Node Interaction

Node interaction combines inline editing with a detail side panel.

## Inline Interaction (on the map)

### Click / Tap

- **Single click** (desktop) or **tap** (touch) a node to select it
- The selected node is visually highlighted
- Selecting a node opens the detail side panel

### Double Click / Double Tap

- **Double-click** (desktop) or **double-tap** (touch) a node to edit its statement text in place
- An inline text input replaces the node label for editing
- Press Enter or click/tap away to confirm the edit

### Right Click / Long Press (Context Menu)

Right-clicking (desktop) or long-pressing (touch) a node opens a context menu with actions:
- **Add child** — Create a new child node under this node
- **Delete** — Delete this node and its entire subtree (with confirmation dialog)
- **Set polarity** — Choose tailwind, headwind, or neutral
- **Add tag** — Apply an existing tag or create a new one
- **Remove tag** — Remove a tag from this node (shown only if node has tags)

### Canvas Click

- Clicking or tapping **empty canvas space** deselects the current node and closes the side panel

## Keyboard Shortcuts

- **Escape** — Deselect the current node and close the side panel
- **Delete / Backspace** — Delete the selected node (with confirmation dialog)
- **Enter** — Open inline edit on the selected node's statement

## Detail Side Panel

The side panel opens when a node is selected and provides full editing capabilities.

### Position and Behavior

- **Desktop / tablet:** Right side of the screen, overlaying the canvas (does not push or resize the canvas)
- **Mobile (small screens):** Bottom sheet, sliding up from the bottom
- Closeable via an X button or by clicking/tapping empty canvas space

### Editing

- **Statement** — Edit the node's short claim text
- **Free text body** — Edit the longer-form reasoning / notes
- **Strength score** — Adjust via slider or numeric input (0–100%)
- **Polarity** — Set to tailwind, headwind, or neutral

### Tags

- View all tags currently applied to the node
- Add existing tags or create new ones
- Remove tags from the node
- Manage map-wide tags (rename, recolor, delete)

### Attachments

- **Add** source or note attachments
- **Edit** existing attachments in place
- **Remove** existing attachments
- View all attachments associated with the node
- Source cards display **auto-fetched preview metadata** (favicon, site name, title, description, image) with loading and error states. See `012-sources.md` for card states and actions.
- Clicking the **source count badge** on a node in the canvas opens the side panel scrolled to the attachments section

### Aggregation

- View the node's **balance bar** with aggregation details
- See the breakdown of tailwind vs headwind totals from children

## Multi-Select

Not supported for MVP. Only one node can be selected at a time.
