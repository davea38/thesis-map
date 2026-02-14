# Persistence

All changes save automatically. There is no manual save button.

## Autosave

- Changes are saved automatically to the server after each edit
- Saves are **debounced** — the system waits for a brief pause in editing activity (1–2 seconds) before sending the update to the server
- This applies to all edit operations: node edits, polarity changes, strength adjustments, tag assignments, attachment changes, map name edits

## Optimistic Updates

- The UI updates **immediately** when the user makes a change
- The server sync happens in the background
- The user does not have to wait for a server response to continue editing

## Save Indicator

- A subtle **status indicator** is displayed in the UI (e.g., "Saving..." / "Saved")
- The indicator lets the user know their work has been persisted without being intrusive

## Error Handling

- If autosave fails (e.g., server unreachable), a **non-blocking warning** is shown to the user
- Failed changes are **queued and retried** automatically when the connection is restored
- User edits are never lost due to a transient network issue

## Conflict Handling

- Single-user MVP — no conflict resolution is needed
- If multi-user support is added in the future, conflict resolution (e.g., last-write-wins or operational transforms) will need to be designed
