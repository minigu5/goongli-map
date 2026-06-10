"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FloorMap from "./FloorMap";
import type { Item } from "@/lib/types";
import type { FloorPlan } from "@/lib/floorplans";
import { SUBJECT_COLORS, type Subject } from "@/lib/buildings";

interface Props {
  plan: FloorPlan;
  resetKey: string;
  items: Item[];
  editMode: boolean;
  selectedIds: string[];
  highlightId: string | null;
  pendingAddPos: { x: number; y: number } | null; // 대기 중인 추가 위치
  onSelect: (group: Item[]) => void;
  onAddAt: (x: number, y: number) => void;
  onMove: (ids: string[], x: number, y: number) => void;
  onMoveEnd: (ids: string[], x: number, y: number) => void;
}

function posKey(it: { pos_x: number; pos_y: number }) {
  return `${Math.round(it.pos_x * 10000)}_${Math.round(it.pos_y * 10000)}`;
}

function groupColor(group: Item[]): string {
  const counts: Record<string, number> = {};
  for (const it of group)
    for (const s of it.subjects) counts[s] = (counts[s] ?? 0) + 1;
  let best = "";
  let max = 0;
  for (const [s, c] of Object.entries(counts))
    if (c > max) { max = c; best = s; }
  return SUBJECT_COLORS[best as Subject] ?? "#6366f1";
}

export default function MapView({
  plan,
  resetKey,
  items,
  editMode,
  selectedIds,
  highlightId,
  pendingAddPos,
  onSelect,
  onAddAt,
  onMove,
  onMoveEnd,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const dragMoved = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 같은 위치 아이템을 수납장 그룹으로 묶기 (shelf 순 정렬)
  const cabinets = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = posKey(it);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const group of map.values())
      group.sort((a, b) => (a.shelf ?? 9999) - (b.shelf ?? 9999));
    return Array.from(map.values());
  }, [items]);

  // 컨테이너 크기 기반 최소 스케일 = 층 전체가 뷰포트에 들어오는 배율
  const [minScale, setMinScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const labelH = width * 0.06;
      const contentH = width / plan.ratio + labelH;
      // 캡 없음: 짧은 층은 1 이상으로 확대해 뷰포트를 가득 채움
      setMinScale(height / contentH);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [plan.ratio]);

  const relFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }, []);

  useEffect(() => {
    if (!draggingIds.length) return;
    function onMoveEv(e: PointerEvent) {
      dragMoved.current = true;
      const p = relFromEvent(e.clientX, e.clientY);
      if (p) {
        lastPos.current = p;
        onMove(draggingIds, p.x, p.y);
      }
    }
    function onUp() {
      if (dragMoved.current && lastPos.current) {
        onMoveEnd(draggingIds, lastPos.current.x, lastPos.current.y);
      }
      lastPos.current = null;
      setDraggingIds([]);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingIds, onMove, onMoveEnd, relFromEvent]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const topLabels = plan.cells.filter(
    (c) =>
      c.label &&
      c.kind !== "service" &&
      c.kind !== "stair" &&
      c.kind !== "corridor" &&
      c.y + c.h / 2 < 50
  );
  const bottomLabels = plan.cells.filter(
    (c) =>
      c.label &&
      c.kind !== "service" &&
      c.kind !== "stair" &&
      c.kind !== "corridor" &&
      c.y + c.h / 2 >= 50
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      <TransformWrapper
        key={`${resetKey}-${minScale}`}
        initialScale={minScale}
        minScale={minScale}
        maxScale={20}
        limitToBounds
        centerOnInit
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.05 }}
        panning={{ disabled: draggingIds.length > 0 }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%" }}
        >
          <div className="flex w-full flex-col" style={{ containerType: "inline-size" }}>

            {/* 건물 위 라벨 */}
            <div className="relative" style={{ height: "3cqw", minHeight: 28, overflow: "visible" }}>
              {topLabels.map((c, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute bottom-0 text-center text-[0.95cqw] leading-tight text-gray-700"
                  style={{ left: `${c.x}%`, width: `${c.w}%`, overflow: "visible", whiteSpace: "nowrap" }}
                  title={c.label + (c.code ? ` (${c.code})` : "")}
                >
                  {c.label}
                  {c.code && <span className="block text-[0.75cqw] text-gray-400">{c.code}</span>}
                </div>
              ))}
            </div>

            {/* 평면도 + 핀 */}
            <div className="relative" style={{ containerType: "inline-size" }}>
              <FloorMap
                ref={mapRef}
                plan={plan}
                editable={editMode}
                onClickMap={(x, y) => onAddAt(x, y)}
              />

              {/* 수납장 핀: 아이템 수로 세로 등분, 선택된 상태에서만 드래그 */}
              {cabinets.flatMap((group) => {
                const ids = group.map((it) => it.id);
                const isSel = ids.some((id) => selectedIdSet.has(id));
                const isHi = group.some((it) => it.id === highlightId);
                const color = groupColor(group);
                const baseX = group[0].pos_x;
                const baseY = group[0].pos_y;
                const count = group.length;

                return group.map((item, index) => {
                  const pw = item.pin_w ?? 6;
                  const ph = item.pin_h ?? 3;
                  // 원래 박스(ph)를 count등분, 각 슬라이스 높이
                  const sliceH = ph / count;
                  // 그룹 중심 기준 offset
                  const offsetPx = (index - (count - 1) / 2) * sliceH;

                  return (
                    <button
                      key={item.id}
                      onPointerDown={(e) => {
                        if (!editMode) return;
                        e.stopPropagation();
                        if (!isSel) return;
                        dragMoved.current = false;
                        setDraggingIds(ids);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editMode && dragMoved.current) return;
                        onSelect(group);
                      }}
                      title={item.name + (item.shelf != null ? ` (${item.shelf}층)` : "")}
                      className="absolute focus:outline-none"
                      style={{
                        left: `${baseX * 100}%`,
                        top: `calc(${baseY * 100}% + ${offsetPx}px)`,
                        width: pw,
                        height: sliceH,
                        transform: "translate(-50%, -50%)",
                        cursor: editMode ? (isSel ? "move" : "pointer") : "pointer",
                        zIndex: isSel || isHi ? 30 : 10,
                        padding: 0,
                        border: "none",
                        background: color,
                        overflow: "hidden",
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
                      {/* span이 버튼을 inset:0으로 채우고 flex 정렬 → 서브픽셀 높이에서도 정확히 중앙 */}
                      <span
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.1cqw",
                          lineHeight: 1.2,
                          color: "#fff",
                          wordBreak: "break-all",
                          overflowWrap: "anywhere",
                          textAlign: "center",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      >
                        {item.name.slice(0, 5)}
                      </span>
                    </button>
                  );
                });
              })}

              {/* 추가 위치 대기 마커 */}
              {editMode && pendingAddPos && (
                <div
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    left: `${pendingAddPos.x * 100}%`,
                    top: `${pendingAddPos.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: "0.8cqw",
                    height: "0.8cqw",
                    background: "#2563eb",
                    zIndex: 40,
                    boxShadow: "0 0 0 0.2cqw rgba(37,99,235,0.35)",
                  }}
                />
              )}
            </div>

            {/* 건물 아래 라벨 */}
            <div className="relative" style={{ height: "3cqw", minHeight: 28, overflow: "visible" }}>
              {bottomLabels.map((c, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute top-0 text-center text-[0.95cqw] leading-tight text-gray-700"
                  style={{ left: `${c.x}%`, width: `${c.w}%`, overflow: "visible", whiteSpace: "nowrap" }}
                  title={c.label + (c.code ? ` (${c.code})` : "")}
                >
                  {c.label}
                  {c.code && <span className="block text-[0.75cqw] text-gray-400">{c.code}</span>}
                </div>
              ))}
            </div>

          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
