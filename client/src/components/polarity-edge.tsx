import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { getEdgeColor, FILTERED_DIM_OPACITY } from "@/lib/colors";

export type PolarityEdgeData = {
  childPolarity: string | null;
  dimmed?: boolean;
};

export type PolarityEdgeType = Edge<PolarityEdgeData, "polarity">;

function PolarityEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<PolarityEdgeType>) {
  const childPolarity = data?.childPolarity ?? null;
  const dimmed = data?.dimmed ?? false;
  const strokeColor = getEdgeColor(childPolarity);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // When dimmed by tag filter, reduce opacity further than the default
  const baseOpacity = selected ? 1 : 0.6;
  const opacity = dimmed ? FILTERED_DIM_OPACITY * baseOpacity : baseOpacity;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth: selected ? 2.5 : 1.5,
        opacity,
        transition: "opacity 0.2s ease",
      }}
    />
  );
}

export const PolarityEdge = memo(PolarityEdgeComponent);
