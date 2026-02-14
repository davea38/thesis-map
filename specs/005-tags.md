# Tags

Nodes can be labeled with tags for organizational and filtering purposes.

## Overview

Tags are named, color-coded labels that users apply to nodes to organize their argument structure. Tags are purely organizational — they do not affect polarity, strength, or aggregation.

## Tag Properties

- **Name** — A human-readable label (e.g., "Economic factors", "Technical risks"). Must be unique within the map.
- **Color** — A color from a preset palette, chosen by the user. Used for the tag chip display on the map.

## Scope

- Tags are **global to the map** — defined once and usable on any node at any depth
- A tag created at one level of the tree can be applied to nodes anywhere else in the same map

## Membership

- A node can have **zero or more** tags
- A tag can be applied to **any number** of nodes
- Tags have no effect on polarity or aggregation — they are purely organizational

## Creation

- **From context menu:** Right-click a node → "Add tag" → create a new tag or select an existing one
- **From the side panel:** A tag management section allows creating new tags and applying existing ones to the selected node

## Editing

- Tags can be **renamed** and **recolored** from the side panel
- Changes to a tag's name or color apply everywhere the tag is used across the map

## Deletion

- A tag can be deleted from the tag management section
- Deleting a tag **removes it from all nodes** that had it. The nodes themselves are not affected.
- **Empty tags** (applied to zero nodes) are valid and persist until explicitly deleted

## Visualization

- Tags appear as **color-coded chips** displayed on or near each node in the map view
- Each chip shows the tag name in the tag's assigned color

## Filtering

- A **tag filter panel** allows the user to select one or more tags
- When a filter is active, nodes that **do not match** any selected tag are **visually dimmed** (not hidden)
- Clearing the filter restores the full view
- Filtering does not affect aggregation — all nodes contribute to balance bars regardless of filter state
