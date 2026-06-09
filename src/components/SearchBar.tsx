"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { buildingName } from "@/lib/buildings";

interface Props {
  query: string;
  results: Item[];
  onQueryChange: (q: string) => void;
  onPick: (item: Item) => void;
}

export default function SearchBar({
  query,
  results,
  onQueryChange,
  onPick,
}: Props) {
  const [focused, setFocused] = useState(false);
  const open = focused && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm focus-within:border-blue-500">
        <svg
          className="h-5 w-5 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="이름·규격·카테고리·과목·위치 검색"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="지우기"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((it) => (
                <li key={it.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(it)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-blue-50"
                  >
                    <span className="font-semibold text-gray-900">
                      {it.name}
                      {it.spec && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          {it.spec}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {buildingName(it.building)} {it.floor}층
                      {it.room ? ` · ${it.room}` : ""}
                      {it.subjects.length ? ` · ${it.subjects.join("/")}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
