# Polarity

Polarity determines whether evidence counts as tailwind or headwind.

## Values

- **Tailwind** — The node supports / strengthens its parent claim
- **Headwind** — The node opposes / weakens its parent claim

## Rules

- Every non-root node has a polarity
- The root node (thesis) has **no polarity** — it is the claim being evaluated

## Inheritance

- If a node belongs to a group, it **inherits the group's polarity** by default
- A node can **override** its inherited polarity (e.g., a mostly-negative group has one positive outlier)
- Ungrouped nodes must have their **polarity set individually**

## Effect on Aggregation

- Polarity feeds directly into the parent's aggregation balance bar
- Tailwind nodes contribute their strength score to the tailwind total
- Headwind nodes contribute their strength score to the headwind total
