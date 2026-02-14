# Polarity

Polarity determines whether evidence counts as tailwind, headwind, or neutral.

## Values

- **Tailwind** — The node supports / strengthens its parent claim
- **Headwind** — The node opposes / weakens its parent claim
- **Neutral** — The node is relevant to the parent but does not argue for or against it

## Rules

- Every non-root node has a polarity
- The root node (thesis) has **no polarity** — it is the claim being evaluated
- **Default: neutral** — new nodes start as neutral until the user assigns a stance

## No Inheritance

Polarity is always set **directly on the node**. Tags do not carry polarity and there is no inheritance mechanism. Every non-root node's polarity is its own.

## Effect on Aggregation

- **Tailwind** nodes contribute their strength score to the parent's tailwind total
- **Headwind** nodes contribute their strength score to the parent's headwind total
- **Neutral** nodes are **excluded** from the balance bar — they do not contribute to either side
