"use client";

import React, { forwardRef } from "react";
import type { FloorPlan, Cell } from "@/lib/floorplans";

interface Props {
  plan: FloorPlan;
  onClickMap?: (x: number, y: number) => void;
  editable?: boolean;
  decoMode?: boolean;
}

function cellStyle(kind?: string): { bg: string; border: string } {
  switch (kind) {
    case "service":
      return { bg: "bg-gray-100", border: "border border-gray-400" };
    case "stair":
      return { bg: "bg-gray-200", border: "border border-gray-500" };
    case "corridor":
      return { bg: "bg-amber-50", border: "" };
    default:
      return { bg: "bg-white", border: "border border-gray-400" };
  }
}

/* ── 아이콘 공통 래퍼: 셀 중앙에 작게 배치 ── */
function Icon({ viewBox, children, size = "58%" }: {
  viewBox: string;
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        viewBox={viewBox}
        style={{ width: size, height: size }}
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </svg>
    </div>
  );
}

function StairSVG() {
  // 계단 측면 실루엣 (화살표 없음)
  return (
    <Icon viewBox="0 0 12 10" size="62%">
      <path d="M1,9.5 L1,7 L4,7 L4,4.5 L7,4.5 L7,2 L11,2 L11,9.5 Z" fill="#94a3b8" />
      {/* 각 디딤판 위 하이라이트 */}
      <line x1="1" y1="7"   x2="4"  y2="7"   stroke="#e2e8f0" strokeWidth="0.35" />
      <line x1="4" y1="4.5" x2="7"  y2="4.5" stroke="#e2e8f0" strokeWidth="0.35" />
      <line x1="7" y1="2"   x2="11" y2="2"   stroke="#e2e8f0" strokeWidth="0.35" />
    </Icon>
  );
}

function WCIcon() {
  // 귀여운 변기 실루엣
  return (
    <Icon viewBox="0 0 10 13" size="52%">
      {/* 수조 */}
      <rect x="3" y="0.5" width="4" height="2.8" rx="1" fill="#94a3b8" />
      {/* 뚜껑 */}
      <ellipse cx="5" cy="4.5" rx="3.8" ry="1.2" fill="#cbd5e1" />
      {/* 변기 본체 */}
      <path d="M1.5,4.5 Q1.5,11 5,11 Q8.5,11 8.5,4.5 Z" fill="#94a3b8" />
      {/* 물통 하이라이트 */}
      <rect x="3.7" y="1.1" width="1.2" height="1.4" rx="0.4" fill="#e2e8f0" opacity="0.6" />
    </Icon>
  );
}

function StorageIcon() {
  // 귀여운 상자 (리본 달린 택배 박스)
  return (
    <Icon viewBox="0 0 10 10" size="58%">
      {/* 박스 본체 */}
      <rect x="1" y="4" width="8" height="5.5" rx="1" fill="#94a3b8" />
      {/* 박스 뚜껑 */}
      <rect x="0.5" y="2.5" width="9" height="2" rx="0.8" fill="#cbd5e1" />
      {/* 리본 세로 */}
      <line x1="5" y1="2.5" x2="5" y2="9.5" stroke="#e2e8f0" strokeWidth="0.9" />
      {/* 리본 가로 */}
      <line x1="1" y1="6.5" x2="9" y2="6.5" stroke="#e2e8f0" strokeWidth="0.9" />
      {/* 리본 매듭 */}
      <circle cx="5" cy="3.5" r="0.8" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="0.3" />
    </Icon>
  );
}

function ElevatorIcon() {
  // 귀여운 엘리베이터 문 (↑ 왼쪽문 · ↓ 오른쪽문)
  return (
    <Icon viewBox="0 0 10 11" size="58%">
      {/* 외곽 프레임 */}
      <rect x="0.5" y="0.5" width="9" height="10" rx="1.4" fill="#94a3b8" />
      {/* 왼쪽 문 */}
      <rect x="1" y="1" width="3.6" height="9" rx="0.8" fill="#cbd5e1" />
      {/* 오른쪽 문 */}
      <rect x="5.4" y="1" width="3.6" height="9" rx="0.8" fill="#cbd5e1" />
      {/* 왼쪽 문 위쪽 화살표 ▲ */}
      <polygon points="2.8,4.2 2.1,5.4 3.5,5.4" fill="#64748b" />
      {/* 오른쪽 문 아래쪽 화살표 ▼ */}
      <polygon points="7.2,6.8 6.5,5.6 7.9,5.6" fill="#64748b" />
    </Icon>
  );
}

function ServiceIcon({ label }: { label: string }) {
  if (label.includes("WC") || label.includes("화장실")) return <WCIcon />;
  if (label.includes("창고")) return <StorageIcon />;
  if (label.includes("승강기") || label.includes("엘리베이터")) return <ElevatorIcon />;
  return null;
}

// 방 셀 여부 판별 (핀 배치 가능한 셀)
function isRoomCell(cell: Cell): boolean {
  return !cell.kind || cell.kind === "room";
}

const FloorMap = forwardRef<HTMLDivElement, Props>(function FloorMap(
  { plan, onClickMap, editable, decoMode },
  ref
) {
  const pointerDownPos = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      ref={ref}
      className="relative w-full select-none bg-white"
      style={{
        aspectRatio: String(plan.ratio),
        containerType: "size",
        cursor: editable ? "crosshair" : "grab",
      }}
      onPointerDown={(e) => {
        if (editable) pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseMove={(e) => {
        if (!editable) return;
        const el = e.currentTarget as HTMLElement;
        if (decoMode) { el.style.cursor = "crosshair"; return; }
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 100;
        const py = ((e.clientY - r.top) / r.height) * 100;
        const cell = plan.cells.find(
          (c) => px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h
        );
        el.style.cursor = !cell || isRoomCell(cell) ? "crosshair" : "not-allowed";
      }}
      onMouseLeave={(e) => {
        if (editable) (e.currentTarget as HTMLElement).style.cursor = "crosshair";
      }}
      onClick={(e) => {
        if (!editable || !onClickMap) return;
        // pointerdown 위치 소비 후 초기화 — 5px 이상 이동 시 드래그(패닝)로 판단해 무시
        const down = pointerDownPos.current;
        pointerDownPos.current = null;
        if (down) {
          const dx = e.clientX - down.x;
          const dy = e.clientY - down.y;
          if (dx * dx + dy * dy > 25) return;
        }
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        onClickMap(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
      }}
    >
      {plan.cells.map((c: Cell, i: number) => {
        const { bg, border } = cellStyle(c.kind);
        return (
          <div
            key={i}
            className={`absolute ${border} ${bg}`}
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: `${c.w}%`,
              height: `${c.h}%`,
            }}
          >
            {c.kind === "stair" && <StairSVG />}
            {c.kind === "service" && <ServiceIcon label={c.label} />}
          </div>
        );
      })}
    </div>
  );
});

export default FloorMap;
