"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FloorMap from "./FloorMap";
import type { Item } from "@/lib/types";
import type { FloorPlan } from "@/lib/floorplans";
import { SUBJECT_COLORS, type Subject } from "@/lib/buildings";

interface Props {
  plan: FloorPlan;
  zone: string;
  floor: number;
  resetKey: string; // 층 전환 시 확대/이동 초기화용
  items: Item[]; // 현재 층 항목
  editMode: boolean;
  selectedId: string | null;
  highlightId: string | null;
  onSelect: (item: Item) => void;
  onAddAt: (x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void; // 드래그 중 (로컬 갱신)
  onMoveEnd: (id: string, x: number, y: number) => void; // 드래그 종료 (저장)
}

function pinColor(subjects: string[]): string {
  const first = subjects[0] as Subject | undefined;
  return (first && SUBJECT_COLORS[first]) || "#374151";
}

export default function MapView({
  plan,
  zone,
  floor,
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
        <div className="relative w-full">
          <FloorMap
            ref={mapRef}
            plan={plan}
            zone={zone}
            floor={floor}
            editable={editMode}
            onClickMap={(x, y) => onAddAt(x, y)}
          />
          {items.map((it) => {
            const isSel = it.id === selectedId;
            const isHi = it.id === highlightId;
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
                className="absolute -translate-x-1/2 -translate-y-full focus:outline-none"
                style={{
                  left: `${it.pos_x * 100}%`,
                  top: `${it.pos_y * 100}%`,
                  cursor: editMode ? "move" : "pointer",
                  zIndex: isSel || isHi ? 30 : 10,
                }}
              >
                <span className="flex flex-col items-center">
                  <span
                    className={`flex items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md ${
                      isHi ? "animate-bounce" : ""
                    }`}
                    style={{
                      width: isSel || isHi ? 26 : 20,
                      height: isSel || isHi ? 26 : 20,
                      background: pinColor(it.subjects),
                      outline: isSel ? "3px solid #fde047" : "none",
                    }}
                  >
                    {it.name.slice(0, 1)}
                  </span>
                  <span
                    className="h-0 w-0"
                    style={{
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderTop: `6px solid ${pinColor(it.subjects)}`,
                      marginTop: -1,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}
