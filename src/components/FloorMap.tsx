"use client";

import { forwardRef } from "react";
import type { FloorPlan, Cell } from "@/lib/floorplans";

interface Props {
  plan: FloorPlan;
  zone: string; // 좌측 라벨 (예: 물리)
  floor: number;
  onClickMap?: (x: number, y: number) => void;
  editable?: boolean;
}

const LABEL_W = 9;

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
  { plan, zone, floor, onClickMap, editable },
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
      {/* 외곽 테두리 */}
      <div className="pointer-events-none absolute inset-0 border-2 border-gray-700" />

      {/* 좌측 존 라벨 */}
      <div
        className="absolute flex flex-col items-center justify-center border-2 border-gray-700 bg-green-100 text-center font-bold text-rose-700"
        style={{ left: 0, top: 0, width: `${LABEL_W}%`, height: "100%" }}
      >
        <span className="text-[2.4cqw] leading-tight">{floor}층</span>
        <span className="text-[2.4cqw] leading-tight">{zone}</span>
      </div>

      {/* 방 셀 */}
      {plan.cells.map((c: Cell, i: number) => (
        <div
          key={i}
          className={`absolute flex flex-col items-center justify-center overflow-hidden border border-gray-400 px-0.5 text-center leading-tight text-gray-800 ${cellBg(
            c.kind
          )}`}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.w}%`,
            height: `${c.h}%`,
          }}
        >
          {c.label && <span className="text-[1.7cqw]">{c.label}</span>}
          {c.code && (
            <span className="text-[1.5cqw] text-gray-500">({c.code})</span>
          )}
        </div>
      ))}
    </div>
  );
});

export default FloorMap;
