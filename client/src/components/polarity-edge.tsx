import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { getEdgeColor } from "@/lib/colors";

export type PolarityEdgeData = {
  childPolarity: string | null;
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
  const strokeColor = getEdgeColor(childPolarity);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth: selected ? 2.5 : 1.5,
        opacity: selected ? 1 : 0.6,
      }}
    />
  );
}

export const PolarityEdge = memo(PolarityEdgeComponent);
