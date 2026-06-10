"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FloorMap from "./FloorMap";
import type { Item, Decoration } from "@/lib/types";
import type { FloorPlan } from "@/lib/floorplans";
import { FLOOR_COLORS } from "@/lib/buildings";

interface Props {
  plan: FloorPlan;
  resetKey: string;
  items: Item[];
  decorations: Decoration[];
  editMode: boolean;
  selectedIds: string[];
  highlightId: string | null;
  pendingAddPos: { x: number; y: number } | null;
  decoMode: { shape: "rect" | "circle"; color: string } | null;
  onSelect: (group: Item[]) => void;
  onAddAt: (x: number, y: number) => void;
  onMove: (ids: string[], x: number, y: number) => void;
  onMoveEnd: (ids: string[], x: number, y: number) => void;
  onAddDecoration: (x: number, y: number) => void;
  onDeleteDecoration: (id: string) => void;
  onResizeDeco: (id: string, x: number, y: number, w: number, h: number) => void;
  onResizeDecoEnd: (id: string, x: number, y: number, w: number, h: number) => void;
}

function posKey(it: { pos_x: number; pos_y: number }) {
  return `${Math.round(it.pos_x * 10000)}_${Math.round(it.pos_y * 10000)}`;
}

function groupColor(group: Item[]): string {
  const floor = group[0]?.floor ?? 1;
  return FLOOR_COLORS[floor] ?? "#6366f1";
}

export default function MapView({
  plan,
  resetKey,
  items,
  decorations,
  editMode,
  selectedIds,
  highlightId,
  pendingAddPos,
  decoMode,
  onSelect,
  onAddAt,
  onMove,
  onMoveEnd,
  onAddDecoration,
  onDeleteDecoration,
  onResizeDeco,
  onResizeDecoEnd,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const dragMoved = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 도형 리사이즈 상태
  const [resizingInfo, setResizingInfo] = useState<{
    id: string;
    corner: "tl" | "tr" | "bl" | "br";
    orig: Decoration;
  } | null>(null);
  const lastResizeValues = useRef<{ id: string; x: number; y: number; w: number; h: number } | null>(null);

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
      // 위·아래 라벨 각각 3cqw(min 28px) 합산해 전체 콘텐츠 높이 계산
      const singleLabelH = Math.max(width * 0.03, 28);
      const contentH = width / plan.ratio + singleLabelH * 2;
      // scale=1 일 때 콘텐츠 너비 = 뷰포트 너비이므로 1보다 커지면 가로가 잘림 → min(1, ...)
      setMinScale(Math.min(1, height / contentH));
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

  // 도형 꼭짓점 드래그 리사이즈
  useEffect(() => {
    if (!resizingInfo) return;
    const ratio = plan.ratio;

    function onMoveEv(e: PointerEvent) {
      const p = relFromEvent(e.clientX, e.clientY);
      if (!p) return;
      const { orig, corner } = resizingInfo!;
      let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;

      if (orig.shape === "circle") {
        // 중심 고정, 반지름 = 마우스~중심 거리 (종횡비 보정)
        const dx = p.x - orig.x;
        const dy = (p.y - orig.y) / ratio;
        nw = Math.max(0.01, Math.sqrt(dx * dx + dy * dy) * 2);
        nh = nw;
      } else {
        // 반대 꼭짓점 고정
        const fx = corner === "br" || corner === "tr"
          ? orig.x - orig.w / 2 : orig.x + orig.w / 2;
        const fy = corner === "br" || corner === "bl"
          ? orig.y - orig.h / 2 : orig.y + orig.h / 2;
        const sx = corner === "br" || corner === "tr" ? 1 : -1;
        const sy = corner === "br" || corner === "bl" ? 1 : -1;
        nw = Math.max(0.01, sx * (p.x - fx));
        nh = Math.max(0.005, sy * (p.y - fy));
        nx = fx + sx * nw / 2;
        ny = fy + sy * nh / 2;
      }

      lastResizeValues.current = { id: resizingInfo!.id, x: nx, y: ny, w: nw, h: nh };
      onResizeDeco(resizingInfo!.id, nx, ny, nw, nh);
    }

    function onUp() {
      if (lastResizeValues.current) {
        const { id, x, y, w, h } = lastResizeValues.current;
        onResizeDecoEnd(id, x, y, w, h);
        lastResizeValues.current = null;
      }
      setResizingInfo(null);
    }

    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizingInfo, plan.ratio, relFromEvent, onResizeDeco, onResizeDecoEnd]);

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
        panning={{ disabled: draggingIds.length > 0 || resizingInfo !== null }}
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
                editable={editMode && !decoMode}
                onClickMap={(x, y) => onAddAt(x, y)}
              />

              {/* 데코레이션 */}
              {decorations.map((deco) => {
                const isCircle = deco.shape === "circle";
                // 원: height는 cqw 단위로 width와 동일 픽셀 → 진짜 원
                // 원 세로 위치: plan.ratio 보정 (x와 y 단위계 통일)
                const leftPct = (deco.x - deco.w / 2) * 100;
                const topPct = isCircle
                  ? (deco.y - (deco.w * plan.ratio) / 2) * 100
                  : (deco.y - deco.h / 2) * 100;
                const canInteract = editMode && !decoMode;

                return (
                  <div
                    key={deco.id}
                    className="absolute group"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${deco.w * 100}%`,
                      // 원은 cqw로 height = width (픽셀 같음), 사각형은 %
                      height: isCircle ? `${deco.w * 100}cqw` : `${deco.h * 100}%`,
                      zIndex: canInteract ? 20 : 5,
                      pointerEvents: canInteract ? "auto" : "none",
                    }}
                  >
                    {/* 도형 본체 */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: deco.color,
                        opacity: deco.opacity,
                        borderRadius: isCircle ? "50%" : "0",
                      }}
                    />

                    {/* X 삭제 버튼 */}
                    {canInteract && (
                      <button
                        className="absolute -top-2.5 -right-2.5 hidden group-hover:flex w-5 h-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] leading-none shadow-md z-10"
                        onClick={(e) => { e.stopPropagation(); onDeleteDecoration(deco.id); }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        ×
                      </button>
                    )}

                    {/* 꼭짓점 리사이즈 핸들 */}
                    {canInteract && (
                      [
                        { c: "tl" as const, cls: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
                        { c: "tr" as const, cls: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
                        { c: "bl" as const, cls: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
                        { c: "br" as const, cls: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
                      ].map(({ c, cls }) => (
                        <div
                          key={c}
                          className={`absolute hidden group-hover:block w-1.5 h-1.5 rounded-sm bg-white border border-blue-500 z-10 ${cls}`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setResizingInfo({ id: deco.id, corner: c, orig: { ...deco } });
                          }}
                        />
                      ))
                    )}
                  </div>
                );
              })}

              {/* 도형 배치 오버레이 */}
              {decoMode && (
                <div
                  className="absolute inset-0"
                  style={{ zIndex: 50, cursor: "crosshair" }}
                  onClick={(e) => {
                    const el = mapRef.current;
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
                    onAddDecoration(x, y);
                  }}
                />
              )}

              {/* 수납장 핀: 아이템 수로 세로 등분, 선택된 상태에서만 드래그 */}
              {cabinets.flatMap((group) => {
                const ids = group.map((it) => it.id);
                const isSel = ids.some((id) => selectedIdSet.has(id));
                const isHi = group.some((it) => it.id === highlightId);
                const color = groupColor(group);
                const baseX = group[0].pos_x;
                const baseY = group[0].pos_y;
                const count = group.length;

                return group.flatMap((item, index) => {
                  const pw = item.pin_w ?? 6;
                  const ph = item.pin_h ?? 3;
                  const sliceH = ph / count;
                  const offsetPx = (index - (count - 1) / 2) * sliceH;

                  return [
                    // 핀 배경 (클릭 이벤트 담당)
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
                        outline: isSel
                          ? "2px solid #fde047"
                          : isHi
                            ? "2px solid #f97316"
                            : "none",
                        boxShadow: isHi
                          ? "0 0 4px 1px rgba(249,115,22,0.5)"
                          : "0 1px 2px rgba(0,0,0,0.15)",
                      }}
                    />,
                    // 텍스트 레이블 (버튼 바깥 형제 요소 → 클리핑 없음)
                    <span
                      key={`${item.id}-label`}
                      className="pointer-events-none absolute select-none"
                      style={{
                        left: `${baseX * 100}%`,
                        top: `calc(${baseY * 100}% + ${offsetPx}px)`,
                        transform: "translate(-50%, -50%)",
                        fontSize: "0.05cqw",
                        lineHeight: 1,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        textShadow: "0 0 2px rgba(0,0,0,0.8)",
                        zIndex: isSel || isHi ? 31 : 11,
                      }}
                    >
                      {item.name}
                    </span>,
                  ];
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
