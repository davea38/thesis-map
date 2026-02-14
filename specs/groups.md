# Groups

A node's children can be optionally organized into named theme groups.

## Overview

Groups let users cluster related child nodes under a named theme (e.g., "Economic factors", "Technical risks"). Groups are purely organizational — they help structure arguments visually and provide a default polarity for their members.

## Group Properties

- **Name** — A human-readable label for the group (e.g., "Economic factors")
- **Polarity** — Either **tailwind** or **headwind**, indicating the overall stance of this group relative to the parent node

## Scope

- Groups are scoped to a **specific parent node** — they are not global
- Each parent node can have **zero or more** named groups
- Different parent nodes have entirely independent group sets

## Membership

- Child nodes can be **dragged or assigned** into a group
- A child node **does not have to belong** to any group — groups are optional
- A child in a group **inherits the group's polarity** by default
- A child can **override** its inherited polarity individually

## Aggregation

- Both grouped and ungrouped children contribute to the parent's aggregation balance bar
- Groups do not create a separate aggregation layer — individual node strength and polarity are what matter
