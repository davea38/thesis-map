# Map Management

Users can create, list, open, edit, and delete thesis maps.

## Overview

A user can have multiple thesis maps. Each map represents one thesis statement and its supporting/opposing evidence tree.

## Map Properties

- **Name / title** — A human-readable label for the map (e.g., "My PhD Chapter 3")
- **Thesis statement** — The central claim being evaluated (e.g., "Remote work improves productivity"). This becomes the root node.
- **Created at** — Timestamp of when the map was created
- **Last modified** — Timestamp of the most recent edit to the map or any of its nodes

Name and thesis statement are separate fields. The name is for the user's organization; the thesis is the argumentative claim.

## Landing Page

- Displays a list of all existing maps
- Each entry shows the map name, thesis statement, and last-modified timestamp
- Default sort: most recently modified first
- The user can open a map to view and edit it
- The user can delete a map from the list
- **Empty state:** When no maps exist, show a message and a prominent "Create your first thesis map" button

## Creating a Map

- The user can create a new map from the landing page
- Creation prompts for both a **map name** and a **thesis statement** (both required)
- The thesis statement becomes the root node of the new map

## Editing a Map

- The map name can be edited from the landing page or from within the map view
- The thesis statement can be edited by editing the root node's statement (via the side panel or inline edit)
- Editing the root node's statement updates the map's thesis statement

## Deleting a Map

- The user can delete a map
- Deleting a map shows a **confirmation dialog** naming the map and warning that all data will be lost
- Deletion removes the map and all of its nodes, tags, and attachments
