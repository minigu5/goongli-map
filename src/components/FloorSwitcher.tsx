"use client";

import { BUILDINGS, type BuildingId } from "@/lib/buildings";

interface Props {
  building: BuildingId;
  floor: number;
  counts: Record<string, number>; // `${building}-${floor}` -> 항목 수
  onChange: (building: BuildingId, floor: number) => void;
}

export default function FloorSwitcher({
  building,
  floor,
  counts,
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* 건물 전환 */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {BUILDINGS.map((b) => (
          <button
            key={b.id}
            onClick={() => onChange(b.id, b.floors[0].floor)}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
              building === b.id
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* 층 전환 */}
      <div className="flex flex-col gap-2">
        {BUILDINGS.find((b) => b.id === building)!.floors.map((f) => {
          const active = f.floor === floor;
          const count = counts[`${building}-${f.floor}`] ?? 0;
          return (
            <button
              key={f.floor}
              onClick={() => onChange(building, f.floor)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{f.floor}층</span>
                <span className="text-xs text-gray-500">{f.zone}</span>
              </span>
              {count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
