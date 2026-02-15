/**
 * Centralized color system for the thesis map.
 *
 * Polarity colors distinguish tailwind (supporting), headwind (opposing),
 * and neutral nodes/edges. Tag colors are a preset palette users pick from
 * when creating tags. Both sets are defined here so every component uses
 * the same values.
 */

// ---------------------------------------------------------------------------
// Polarity colors
// ---------------------------------------------------------------------------

export const POLARITY_COLORS = {
  tailwind: {
    /** Node border / accent color */
    border: "#22c55e",
    /** Lighter tint for node background */
    bg: "#f0fdf4",
    /** Dark text-safe shade for labels */
    text: "#15803d",
    /** Balance bar segment */
    bar: "#22c55e",
  },
  headwind: {
    border: "#ef4444",
    bg: "#fef2f2",
    text: "#b91c1c",
    bar: "#ef4444",
  },
  neutral: {
    border: "#94a3b8",
    bg: "#f8fafc",
    text: "#475569",
    bar: "#94a3b8",
  },
} as const;

/** Color used for the root node (no polarity). */
export const ROOT_NODE_COLOR = {
  border: "#6366f1",
  bg: "#eef2ff",
  text: "#4338ca",
} as const;

/** Selected-node highlight ring color. */
export const SELECTION_RING_COLOR = "#3b82f6";

/** Dimmed opacity for nodes that don't match the active tag filter. */
export const FILTERED_DIM_OPACITY = 0.3;

// ---------------------------------------------------------------------------
// Polarity helpers
// ---------------------------------------------------------------------------

export type Polarity = "tailwind" | "headwind" | "neutral";

/**
 * Get the polarity color set for a node.
 * Returns ROOT_NODE_COLOR for root nodes (polarity === null).
 */
export function getPolarityColors(polarity: string | null) {
  if (polarity === null) return ROOT_NODE_COLOR;
  if (polarity in POLARITY_COLORS) {
    return POLARITY_COLORS[polarity as Polarity];
  }
  return POLARITY_COLORS.neutral;
}

/**
 * Get the edge color for a connection line.
 * Edge color follows the *child* node's polarity.
 */
export function getEdgeColor(childPolarity: string | null): string {
  if (childPolarity === null) return ROOT_NODE_COLOR.border;
  return (POLARITY_COLORS[childPolarity as Polarity] ?? POLARITY_COLORS.neutral).border;
}

// ---------------------------------------------------------------------------
// Tag color palette (mirrors server/src/routers/tag.ts TAG_COLOR_PALETTE)
// ---------------------------------------------------------------------------

export const TAG_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
] as const;

export type TagColor = (typeof TAG_COLOR_PALETTE)[number];

/**
 * Get a contrasting foreground color (white or dark) for a given hex
 * background. Uses relative luminance to decide.
 */
export function getContrastText(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  // Perceived brightness (rec. 709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "#1e293b" : "#ffffff";
}
