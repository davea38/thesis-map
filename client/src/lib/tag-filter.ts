/**
 * Computes which nodes should be dimmed based on active tag filters.
 *
 * When tag filters are active, nodes that do NOT have any of the selected tags
 * are dimmed (reduced opacity). Nodes with at least one matching tag stay at
 * full opacity. When no filters are active, nothing is dimmed.
 *
 * Aggregation is completely unaffected by tag filters — all nodes always
 * contribute to balance bars regardless of filter state.
 */
export function computeDimmedNodeIds(
  nodes: Array<{ id: string; tags: Array<{ id: string }> }>,
  activeTagFilters: Set<string>,
): Set<string> {
  if (activeTagFilters.size === 0) return new Set<string>();

  const dimmed = new Set<string>();
  for (const node of nodes) {
    const matches = node.tags.some((tag) => activeTagFilters.has(tag.id));
    if (!matches) dimmed.add(node.id);
  }
  return dimmed;
}
