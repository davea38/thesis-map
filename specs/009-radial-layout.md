# Radial Layout

The map displays as a radial mind map with the thesis centered.

## Canvas Library

**React Flow** with a custom radial layout algorithm. React Flow provides built-in pan/zoom, node rendering, edge management, and viewport controls.

## Layout

- The **thesis (root node)** sits at the center of the canvas
- **Direct children** radiate outward from the center
- **Deeper levels** extend further outward in concentric rings
- **Connection lines** link each parent to its children — curved edges, with line color following the child node's polarity
- React Flow handles viewport management. Nodes auto-space using the radial layout algorithm. User can zoom out to see the full tree.

## Node Content

Each node on the map displays:
- **Statement text** — truncated with ellipsis if longer than the node can display. Full text is visible in the side panel.
- **Balance bar** — shown if the node has children (and at least one child contributes to aggregation)
- **Tag chips** — small color-coded badges for each tag applied to the node

## Visual Indicators

### Polarity

- Nodes are **color-coded by polarity** — distinct colors for tailwind, headwind, and neutral
- Tailwind, headwind, and neutral each have a visually distinct color so the argument structure is clear at a glance

### Tags

- Tags appear as **color-coded chips** on or near each node
- Each chip uses the tag's assigned color and shows the tag name

## Canvas Interaction

- **Pan:** Click-drag on empty canvas space (desktop) or two-finger drag (touch)
- **Zoom:** Scroll wheel (desktop) or pinch (touch)
- The layout should remain readable at various zoom levels

## Responsive Behavior

The same radial canvas is used on all screen sizes:
- **Desktop:** Mouse interactions — click, double-click, right-click, scroll wheel
- **Tablet / mobile:** Touch interactions — tap to select, long-press for context menu (replaces right-click), double-tap for inline edit, pinch to zoom, two-finger drag to pan
- Touch targets are sized for finger input on small screens
- The side panel becomes a **bottom sheet** on small screens (see `010-node-interaction.md`)
