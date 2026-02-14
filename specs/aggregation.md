# Aggregation

Each node displays a visual balance bar from its children's weighted scores.

## Balance Bar

Every node that has children shows a **balance bar** — a tug-of-war style visual indicator showing the ratio of supporting vs opposing evidence.

- Leaf nodes (no children) do **not** display a balance bar

## Calculation

The balance bar is computed from the node's **direct children** only:

- **Tailwind total** = sum of strength scores of all children with tailwind polarity
- **Headwind total** = sum of strength scores of all children with headwind polarity
- **Balance ratio** = tailwind total / (tailwind total + headwind total)

### Strength as Weight

A child's **strength score acts as its weight** in the aggregation. A child at 90% strength contributes proportionally more than one at 20%.

### Example

Given three children:
- Child A: tailwind, strength 80 → contributes 80 to tailwind total
- Child B: headwind, strength 60 → contributes 60 to headwind total
- Child C: tailwind, strength 40 → contributes 40 to tailwind total

Tailwind total = 120, Headwind total = 60, Balance = 120 / 180 = 67% tailwind.

## Scope

- Both **grouped and ungrouped** children contribute to the aggregation
- Groups do not create a separate aggregation layer
- Only **direct children** are counted (not grandchildren)
