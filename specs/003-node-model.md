# Node Model

Each node holds a statement, free text body, strength score, and polarity.

## Fields

### Statement (required)

A short text string representing the claim or piece of evidence. This is the primary label displayed on the map.

- Recommended to keep under **140 characters**
- No hard limit enforced, but the map view truncates long statements with an ellipsis
- Full text is always visible in the side panel

### Free Text Body (optional)

A longer-form text field for the node's primary reasoning, context, or elaboration. This is the author's main argument or explanation for this node. Separate from note attachments (see `008-attachments.md`).

### Strength Score

- A numeric value from **0 to 100** (percent)
- Represents how strong or convincing this piece of evidence is
- Edited via a slider or direct numeric input
- Acts as a weight in the parent's aggregation calculation
- **Default: 0%** — new nodes start at zero strength, meaning they contribute nothing to the parent's balance bar until the user evaluates them
- A node at 0% strength is the "unset / unevaluated" state — the node exists on the map and is visible, but has no effect on aggregation

### Polarity

- One of three values: **tailwind**, **headwind**, or **neutral**
- **Tailwind** — supports / strengthens the parent claim
- **Headwind** — opposes / weakens the parent claim
- **Neutral** — relevant to the parent but does not argue for or against it
- **Default: neutral** — new nodes start as neutral
- Determines which side of the parent's balance bar this node contributes to (neutral nodes are excluded from the balance bar)
- Polarity is always set directly on the node — there is no inheritance from tags or other sources

## Root Node (Thesis)

- The root node is the thesis statement itself
- It has **no polarity** — it is the claim being evaluated, not evidence for or against something
- It has **no strength score** — strength is a property of evidence nodes
- Editing the root node's statement also updates the map's thesis statement
