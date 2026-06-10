"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";
import { buildingName } from "@/lib/buildings";

interface Props {
  items: Item[];
  canEdit: boolean;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onAdd: () => void;
  onReorder: (reordered: Item[]) => void;
}

export default function CabinetCard({
  items,
  canEdit,
  onClose,
  onEdit,
  onDelete,
  onAdd,
  onReorder,
}: Props) {
  const rep = items[0];
  const location = `${buildingName(rep.building)} ${rep.floor}층${rep.room ? ` · ${rep.room}` : ""}`;

  // 드래그 재정렬용 로컬 상태 (외부 items 변경 시 동기화, 드래그 중엔 유지)
  const [localItems, setLocalItems] = useState<Item[]>(items);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (dragIdx === null) setLocalItems(items);
  }, [items, dragIdx]);

  function handleDragStart(i: number) {
    setDragIdx(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (i !== overIdx) setOverIdx(i);
  }

  function handleDrop(i: number) {
    if (dragIdx === null) return;
    if (dragIdx !== i) {
      const next = [...localItems];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      setLocalItems(next);
      onReorder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <div className="w-[520px] max-w-[92vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-bold text-gray-900">{location}</span>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {localItems.length}개
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      {/* 테이블 */}
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
              {canEdit && <th className="w-6 px-2 py-2"></th>}
              <th className="px-3 py-2 w-10">층</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2 hidden sm:table-cell">규격</th>
              {canEdit && <th className="px-3 py-2 w-32"></th>}
            </tr>
          </thead>
          <tbody>
            {localItems.map((item, i) => {
              const isDragging = dragIdx === i;
              const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
              return (
                <tr
                  key={item.id}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`border-t border-gray-100 transition-colors ${
                    i % 2 === 1 ? "bg-gray-50/50" : ""
                  } ${isDragging ? "opacity-40" : "hover:bg-blue-50/40"}`}
                  style={{
                    borderTopColor: isOver ? "#2563eb" : undefined,
                    borderTopWidth: isOver ? 2 : undefined,
                  }}
                >
                  {/* 드래그 핸들 */}
                  {canEdit && (
                    <td
                      className="px-2 py-2 text-center text-gray-300 select-none"
                      style={{ cursor: "grab" }}
                      title="드래그해서 순서 변경"
                    >
                      ⠿
                    </td>
                  )}

                  {/* 층 */}
                  <td className="px-3 py-2 text-center tabular-nums text-gray-400">
                    {item.shelf ?? "—"}
                  </td>

                  {/* 이름 */}
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {item.name}
                  </td>

                  {/* 규격 */}
                  <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">
                    {item.spec ?? ""}
                  </td>

                  {/* 수정·삭제 */}
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-100 active:bg-blue-200"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-100 active:bg-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 추가 버튼 */}
      {canEdit && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={onAdd}
            className="w-full rounded-lg border border-blue-200 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 active:bg-blue-100"
          >
            + 이 위치에 용품 추가
          </button>
        </div>
      )}
    </div>
  );
}
