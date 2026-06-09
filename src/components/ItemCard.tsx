"use client";

import type { Item } from "@/lib/types";
import { buildingName, SUBJECT_COLORS, type Subject } from "@/lib/buildings";
import { thumbUrl } from "@/lib/cloudinary";

interface Props {
  item: Item;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export default function ItemCard({
  item,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const cats = item.categories
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl(item.image_url, 600) ?? item.image_url}
          alt={item.name}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {item.spec && (
          <p className="mt-0.5 text-sm text-gray-500">{item.spec}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.subjects.map((s) => (
            <span
              key={s}
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ background: SUBJECT_COLORS[s as Subject] ?? "#374151" }}
            >
              {s}
            </span>
          ))}
        </div>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-gray-400">위치</dt>
            <dd className="text-gray-700">
              {buildingName(item.building)} {item.floor}층
              {item.room ? ` · ${item.room}` : ""}
            </dd>
          </div>
          {cats.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-12 shrink-0 text-gray-400">카테고리</dt>
              <dd className="flex flex-wrap gap-1">
                {cats.map((c, i) => (
                  <span
                    key={i}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {c}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {canEdit && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(item)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
