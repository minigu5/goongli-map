"use client";

import { BUILDINGS, type BuildingId } from "@/lib/buildings";

interface Props {
  floor: number;
  counts: Record<string, number>;
  onChange: (floor: number) => void;
}

const building = BUILDINGS[0]; // 궁리관만 사용

export default function FloorSwitcher({ floor, counts, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/75 backdrop-blur-sm p-1.5 shadow-lg border border-gray-200/60">
      {building.floors.map((f) => {
        const active = f.floor === floor;
        const count = counts[`gungri-${f.floor}`] ?? 0;
        return (
          <button
            key={f.floor}
            onClick={() => onChange(f.floor)}
            className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
              active
                ? "bg-blue-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100/80"
            }`}
          >
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold">{f.floor}층</span>
              <span className={`text-[10px] ${active ? "text-blue-100" : "text-gray-400"}`}>
                {f.zone}
              </span>
            </span>
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-blue-400 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
