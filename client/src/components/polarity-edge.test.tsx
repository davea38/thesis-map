import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { PolarityEdge } from "./polarity-edge";
import { POLARITY_COLORS, ROOT_NODE_COLOR, FILTERED_DIM_OPACITY } from "@/lib/colors";

/** Convert a hex color like "#22c55e" to "rgb(34, 197, 94)" for JSDOM comparison. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function makeEdgeProps(childPolarity: string | null, selected = false, dimmed = false) {
  return {
    id: "edge-1",
    source: "parent",
    target: "child",
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: "bottom" as const,
    targetPosition: "top" as const,
    data: { childPolarity, dimmed },
    selected,
    animated: false,
    markerEnd: undefined,
    markerStart: undefined,
    interactionWidth: 20,
    sourceHandleId: null,
    targetHandleId: null,
    pathOptions: undefined,
    deletable: true,
    selectable: true,
    focusable: true,
    label: undefined,
    labelStyle: undefined,
    labelShowBg: undefined,
    labelBgStyle: undefined,
    labelBgPadding: undefined,
    labelBgBorderRadius: undefined,
    style: undefined,
    type: "polarity" as const,
    zIndex: 0,
    reconnectable: false,
  } as Parameters<typeof PolarityEdge>[0];
}

function renderEdge(childPolarity: string | null, selected = false, dimmed = false) {
  const props = makeEdgeProps(childPolarity, selected, dimmed);
  return render(
    <ReactFlowProvider>
      <svg>
        <PolarityEdge {...props} />
      </svg>
    </ReactFlowProvider>,
  );
}

describe("PolarityEdge", () => {
  it("renders a path element", () => {
    const { container } = renderEdge("tailwind");
    const path = container.querySelector("path");
    expect(path).not.toBeNull();
  });

  it("uses tailwind color for tailwind polarity", () => {
    const { container } = renderEdge("tailwind");
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain(hexToRgb(POLARITY_COLORS.tailwind.border));
  });

  it("uses headwind color for headwind polarity", () => {
    const { container } = renderEdge("headwind");
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain(hexToRgb(POLARITY_COLORS.headwind.border));
  });

  it("uses neutral color for neutral polarity", () => {
    const { container } = renderEdge("neutral");
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain(hexToRgb(POLARITY_COLORS.neutral.border));
  });

  it("uses root color for null polarity", () => {
    const { container } = renderEdge(null);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain(hexToRgb(ROOT_NODE_COLOR.border));
  });

  it("defaults to neutral color for unknown polarity values", () => {
    const { container } = renderEdge("unknown");
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain(hexToRgb(POLARITY_COLORS.neutral.border));
  });

  it("uses thicker stroke when selected", () => {
    const { container } = renderEdge("tailwind", true);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain("stroke-width: 2.5");
  });

  it("uses thinner stroke when not selected", () => {
    const { container } = renderEdge("tailwind", false);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain("stroke-width: 1.5");
  });

  it("reduces opacity when dimmed by tag filter", () => {
    const { container } = renderEdge("tailwind", false, true);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    // Dimmed + unselected: FILTERED_DIM_OPACITY * 0.6
    const expected = FILTERED_DIM_OPACITY * 0.6;
    expect(style).toContain(`opacity: ${expected}`);
  });

  it("uses normal opacity when not dimmed", () => {
    const { container } = renderEdge("tailwind", false, false);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain("opacity: 0.6");
  });

  it("applies dimming even when selected", () => {
    const { container } = renderEdge("tailwind", true, true);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    // Dimmed + selected: FILTERED_DIM_OPACITY * 1
    expect(style).toContain(`opacity: ${FILTERED_DIM_OPACITY}`);
  });

  it("includes transition for smooth dimming animation", () => {
    const { container } = renderEdge("tailwind", false, true);
    const path = container.querySelector("path");
    const style = path?.getAttribute("style") ?? "";
    expect(style).toContain("transition: opacity 0.2s ease");
  });
});
