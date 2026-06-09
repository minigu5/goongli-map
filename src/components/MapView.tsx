"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FloorMap from "./FloorMap";
import type { Item } from "@/lib/types";
import type { FloorPlan } from "@/lib/floorplans";
import { type Subject } from "@/lib/buildings";

interface Props {
  plan: FloorPlan;
  resetKey: string;
  items: Item[];
  editMode: boolean;
  selectedId: string | null;
  highlightId: string | null;
  onSelect: (item: Item) => void;
  onAddAt: (x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMoveEnd: (id: string, x: number, y: number) => void;
}

// 연한 과목 색상 (구분만 가능한 수준)
const PIN_COLORS_LIGHT: Record<string, string> = {
  물리: "#bfdbfe",
  화학: "#bbf7d0",
  생명: "#fecaca",
  지구: "#e9d5ff",
  공학: "#fed7aa",
};

function pinColor(subjects: string[]): string {
  const first = subjects[0] as Subject | undefined;
  return (first && PIN_COLORS_LIGHT[first]) || "#e5e7eb";
}

export default function MapView({
  plan,
  resetKey,
  items,
  editMode,
  selectedId,
  highlightId,
  onSelect,
  onAddAt,
  onMove,
  onMoveEnd,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragMoved = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const relFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    function onMoveEv(e: PointerEvent) {
      dragMoved.current = true;
      const p = relFromEvent(e.clientX, e.clientY);
      if (p) {
        lastPos.current = p;
        onMove(draggingId!, p.x, p.y);
      }
    }
    function onUp() {
      if (dragMoved.current && lastPos.current) {
        onMoveEnd(draggingId!, lastPos.current.x, lastPos.current.y);
      }
      lastPos.current = null;
      setDraggingId(null);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingId, onMove, onMoveEnd, relFromEvent]);

  // 계단·화장실 제외, 중심 y 위치로 위/아래 분류
  const topLabels = plan.cells.filter(
    (c) => c.label && c.kind !== "service" && c.kind !== "stair" && c.y + c.h / 2 < 50
  );
  const bottomLabels = plan.cells.filter(
    (c) => c.label && c.kind !== "service" && c.kind !== "stair" && c.y + c.h / 2 >= 50
  );

  return (
    <TransformWrapper
      key={resetKey}
      minScale={0.5}
      maxScale={12}
      limitToBounds={false}
      centerOnInit
      doubleClick={{ disabled: true }}
      wheel={{ step: 0.15 }}
      panning={{ disabled: draggingId !== null }}
    >
      <TransformComponent
        wrapperStyle={{ width: "100%", height: "100%" }}
        contentStyle={{ width: "100%" }}
      >
        <div className="flex w-full flex-col" style={{ containerType: "inline-size" }}>

          {/* ── 건물 위 라벨 영역 ── */}
          <div
            className="relative"
            style={{ height: "4.5cqw", minHeight: 36, overflow: "visible" }}
          >
            {topLabels.map((c, i) => (
              <div
                key={i}
                className="pointer-events-none absolute bottom-0 text-center text-[1.1cqw] leading-tight text-gray-700"
                style={{
                  left: `${c.x}%`,
                  width: `${c.w}%`,
                  overflow: "visible",
                  wordBreak: "break-all",
                  whiteSpace: "normal",
                }}
                title={c.label + (c.code ? ` (${c.code})` : "")}
              >
                {c.label}
                {c.code && (
                  <span className="block text-[0.85cqw] text-gray-400">{c.code}</span>
                )}
              </div>
            ))}
          </div>

          {/* ── 평면도 + 핀 ── */}
          <div className="relative" style={{ containerType: "inline-size" }}>
            <FloorMap
              ref={mapRef}
              plan={plan}
              editable={editMode}
              onClickMap={(x, y) => onAddAt(x, y)}
            />

            {items.map((it) => {
              const isSel = it.id === selectedId;
              const isHi = it.id === highlightId;
              const pw = it.pin_w ?? 3;
              const ph = it.pin_h ?? 3;
              const bg = pinColor(it.subjects);
              return (
                <button
                  key={it.id}
                  onPointerDown={(e) => {
                    if (!editMode) return;
                    e.stopPropagation();
                    dragMoved.current = false;
                    setDraggingId(it.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode && dragMoved.current) return;
                    onSelect(it);
                  }}
                  title={it.name}
                  className="absolute focus:outline-none"
                  style={{
                    left: `${it.pos_x * 100}%`,
                    top: `${it.pos_y * 100}%`,
                    width: pw,
                    height: ph,
                    transform: "translate(-50%, -50%)",
                    cursor: editMode ? "move" : "pointer",
                    zIndex: isSel || isHi ? 30 : 10,
                    padding: 0,
                    border: "none",
                    background: bg,
                    overflow: "visible",
                    outline: isSel
                      ? "2px solid #fde047"
                      : isHi
                        ? "2px solid #f97316"
                        : "none",
                    boxShadow: isHi
                      ? "0 0 4px 1px rgba(249,115,22,0.5)"
                      : "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* 이름 최대 5글자 — 핀 중앙에 겹쳐서 표시 */}
                  <span
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "0.4cqw",
                      lineHeight: 1,
                      color: "#1f2937",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {it.name.slice(0, 5)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 건물 아래 라벨 영역 ── */}
          <div
            className="relative"
            style={{ height: "4.5cqw", minHeight: 36, overflow: "visible" }}
          >
            {bottomLabels.map((c, i) => (
              <div
                key={i}
                className="pointer-events-none absolute top-0 text-center text-[1.1cqw] leading-tight text-gray-700"
                style={{
                  left: `${c.x}%`,
                  width: `${c.w}%`,
                  overflow: "visible",
                  wordBreak: "break-all",
                  whiteSpace: "normal",
                }}
                title={c.label + (c.code ? ` (${c.code})` : "")}
              >
                {c.label}
                {c.code && (
                  <span className="block text-[0.85cqw] text-gray-400">{c.code}</span>
                )}
              </div>
            ))}
          </div>

        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}
