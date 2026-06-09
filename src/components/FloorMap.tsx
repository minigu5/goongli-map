"use client";

import { forwardRef } from "react";
import type { FloorPlan, Cell } from "@/lib/floorplans";

interface Props {
  plan: FloorPlan;
  onClickMap?: (x: number, y: number) => void;
  editable?: boolean;
}

function cellBg(kind?: string): string {
  switch (kind) {
    case "service":
      return "bg-gray-50";
    case "stair":
      return "bg-gray-100";
    case "corridor":
      return "bg-amber-50";
    default:
      return "bg-white";
  }
}

const FloorMap = forwardRef<HTMLDivElement, Props>(function FloorMap(
  { plan, onClickMap, editable },
  ref
) {
  return (
    <div
      ref={ref}
      className="relative w-full select-none bg-white"
      style={{
        aspectRatio: String(plan.ratio),
        containerType: "size",
        cursor: editable ? "crosshair" : "grab",
      }}
      onClick={(e) => {
        if (!editable || !onClickMap) return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        onClickMap(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
      }}
    >
      {/* 방 셀 (텍스트 없이 빈 박스) */}
      {plan.cells.map((c: Cell, i: number) => (
        <div
          key={i}
          className={`absolute border border-gray-400 ${cellBg(c.kind)}`}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.w}%`,
            height: `${c.h}%`,
          }}
        />
      ))}
    </div>
  );
});

export default FloorMap;
