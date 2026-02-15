export interface ChildInput {
  polarity: string | null;
  strength: number | null;
}

export interface BalanceBarResult {
  tailwindTotal: number;
  headwindTotal: number;
  balanceRatio: number;
}

/**
 * Computes the balance bar aggregation from a node's direct children.
 *
 * Returns null when:
 * - The children array is empty (leaf node)
 * - All children are neutral
 * - All non-neutral children have 0 strength
 * - tailwindTotal + headwindTotal = 0
 *
 * Neutral children and 0-strength children contribute nothing.
 * Both tagged and untagged children contribute equally.
 */
export function computeBalanceBar(
  children: ChildInput[]
): BalanceBarResult | null {
  if (children.length === 0) return null;

  let tailwindTotal = 0;
  let headwindTotal = 0;

  for (const child of children) {
    const strength = child.strength ?? 0;
    if (strength === 0) continue;
    if (child.polarity === "tailwind") tailwindTotal += strength;
    else if (child.polarity === "headwind") headwindTotal += strength;
  }

  const total = tailwindTotal + headwindTotal;
  if (total === 0) return null;

  return {
    tailwindTotal,
    headwindTotal,
    balanceRatio: tailwindTotal / total,
  };
}
