# Node Model

Each node holds a statement, free text body, strength score, and polarity.

## Fields

### Statement (required)

A short text string representing the claim or piece of evidence. This is the primary label displayed on the map.

### Free Text Body (optional)

A longer-form text field for reasoning, context, notes, or elaboration. Separate from attachments.

### Strength Score

- A numeric value from **0 to 100** (percent)
- Represents how strong or convincing this piece of evidence is
- Edited via a slider or direct numeric input
- Acts as a weight in the parent's aggregation calculation

### Polarity

- Either **tailwind** (supports the parent node) or **headwind** (opposes the parent node)
- Determines which side of the parent's balance bar this node contributes to

## Root Node (Thesis)

- The root node is the thesis statement itself
- It has **no polarity** — it is the claim being evaluated, not evidence for or against something
- It has **no strength score** — strength is a property of evidence nodes

## Polarity Inheritance

- If a node belongs to a group, it inherits the group's polarity by default
- A node can override its group's polarity individually (e.g., a positive outlier in a negative group)
- Ungrouped nodes must have their polarity set explicitly
