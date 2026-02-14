# Aggregation

Each node displays a visual balance bar from its children's weighted scores.

## Balance Bar

Every node that has children shows a **balance bar** — a tug-of-war style visual indicator showing the ratio of supporting vs opposing evidence.

- Leaf nodes (no children) do **not** display a balance bar
- The **root node (thesis) does** display a balance bar — it is special only in having no polarity or strength of its own

## Calculation

The balance bar is computed from the node's **direct children** only:

- **Tailwind total** = sum of strength scores of all children with tailwind polarity
- **Headwind total** = sum of strength scores of all children with headwind polarity
- **Balance ratio** = tailwind total / (tailwind total + headwind total)

### Neutral and Zero-Strength Handling

- **Neutral children** are excluded — they do not contribute to either total
- **Children with 0% strength** contribute nothing (0) to their polarity's total
- **If tailwind + headwind = 0** (all children are neutral or at 0% strength), **no balance bar is shown** — same visual treatment as a leaf node

### Strength as Weight

A child's **strength score acts as its weight** in the aggregation. A child at 90% strength contributes proportionally more than one at 20%.

### Example

Given four children:
- Child A: tailwind, strength 80 → contributes 80 to tailwind total
- Child B: headwind, strength 60 → contributes 60 to headwind total
- Child C: tailwind, strength 40 → contributes 40 to tailwind total
- Child D: neutral, strength 70 → **excluded from balance bar**

Tailwind total = 120, Headwind total = 60, Balance = 120 / 180 = **67% tailwind**.

Child D is visible on the map but does not affect the bar.

## Scope

- Both **tagged and untagged** children contribute to the aggregation
- Tags do not create a separate aggregation layer
- Only **direct children** are counted (not grandchildren)

## Recursive Confidence

MVP does not show recursive confidence. The balance bar reflects direct children only — it does not account for how well-supported each child's own subtree is. This is an explicit design decision and a potential future enhancement.
