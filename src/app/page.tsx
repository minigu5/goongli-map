"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import FloorSwitcher from "@/components/FloorSwitcher";
import SearchBar from "@/components/SearchBar";
import ItemCard from "@/components/ItemCard";
import ItemForm from "@/components/ItemForm";
import AuthButton from "@/components/AuthButton";
import { buildingName, getFloor, type BuildingId } from "@/lib/buildings";
import { getFloorPlan } from "@/lib/floorplans";
import type { Item, ItemInput } from "@/lib/types";
import {
  createItem,
  deleteItem,
  fetchItems,
  updateItem,
  updateItemPosition,
} from "@/lib/items";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

function searchText(it: Item): string {
  return [
    it.name,
    it.spec ?? "",
    it.categories,
    it.subjects.join(" "),
    it.room ?? "",
    buildingName(it.building),
    `${it.floor}층`,
    getFloor(it.building, it.floor)?.zone ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

interface FormState {
  initial: {
    id?: string;
    building: BuildingId;
    floor: number;
    pos_x: number;
    pos_y: number;
  } & Partial<Item>;
}

export default function Home() {
  const auth = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [building, setBuilding] = useState<BuildingId>("gungri");
  const [floor, setFloor] = useState<number>(5);
  const [editMode, setEditMode] = useState(false);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  const canEdit = editMode && auth.isSchoolUser;

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    fetchItems()
      .then(setItems)
      .catch((e) => setLoadError(e.message ?? "불러오기 실패"));
  }, []);

  // 학교 사용자가 아니게 되면 수정 모드 해제
  useEffect(() => {
    if (!auth.isSchoolUser) setEditMode(false);
  }, [auth.isSchoolUser]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) {
      const k = `${it.building}-${it.floor}`;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const floorItems = useMemo(
    () => items.filter((it) => it.building === building && it.floor === floor),
    [items, building, floor]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    return items.filter((it) => {
      const text = searchText(it);
      return terms.some((t) => text.includes(t)); // 하나라도 일치하면 표시
    });
  }, [items, query]);

  const floorInfo = getFloor(building, floor)!;
  const plan = getFloorPlan(building, floor)!;

  function goToItem(it: Item) {
    setBuilding(it.building);
    setFloor(it.floor);
    setSelected(it);
    setHighlightId(it.id);
    setQuery("");
    setTimeout(() => setHighlightId(null), 2500);
  }

  function handleAddAt(x: number, y: number) {
    if (!canEdit) return;
    setSelected(null);
    setForm({ initial: { building, floor, pos_x: x, pos_y: y } });
  }

  function handleEdit(it: Item) {
    setSelected(null);
    setForm({ initial: { ...it } });
  }

  async function handleSave(input: ItemInput, id?: string) {
    if (id) {
      const updated = await updateItem(id, input, auth.email);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } else {
      const created = await createItem(input, auth.email);
      setItems((prev) => [...prev, created]);
    }
    setForm(null);
  }

  async function handleDelete(it: Item) {
    if (!confirm(`"${it.name}"을(를) 삭제할까요?`)) return;
    await deleteItem(it.id);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    setSelected(null);
  }

  // 핀 드래그: 로컬 즉시 반영
  function handleMove(id: string, x: number, y: number) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, pos_x: x, pos_y: y } : it))
    );
  }
  // 핀 드래그 종료: 저장
  async function handleMoveEnd(id: string, x: number, y: number) {
    try {
      await updateItemPosition(id, x, y, auth.email);
    } catch {
      /* 실패 시 다음 새로고침에서 정정 */
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <header className="z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-blue-700">
            궁리맵
          </span>
          <span className="hidden text-xs text-gray-400 md:inline">
            실험실 용품 지도
          </span>
        </div>
        <div className="mx-auto w-full max-w-md">
          <SearchBar
            query={query}
            results={results}
            onQueryChange={setQuery}
            onPick={goToItem}
          />
        </div>
        <div className="shrink-0">
          <AuthButton
            email={auth.email}
            isSchoolUser={auth.isSchoolUser}
            loading={auth.loading}
            editMode={editMode}
            onSignIn={auth.signIn}
            onSignOut={auth.signOut}
            onToggleEdit={() => setEditMode((v) => !v)}
          />
        </div>
      </header>

      {/* 설정 안내 배너 */}
      {!isFirebaseConfigured && (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          환경변수가 설정되지 않아 열람·수정이 비활성화되어 있습니다. README의 설정
          안내를 참고하세요.
        </div>
      )}
      {loadError && (
        <div className="bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          데이터를 불러오지 못했습니다: {loadError}
        </div>
      )}
      {canEdit && (
        <div className="bg-blue-600 px-4 py-1.5 text-center text-sm font-medium text-white">
          수정 모드 — 지도를 클릭해 용품을 추가하거나, 핀을 드래그해 위치를 옮기세요.
        </div>
      )}

      {/* 본문 */}
      <main className="relative flex min-h-0 flex-1">
        {/* 지도 */}
        <section className="relative min-h-0 flex-1 overflow-hidden bg-gray-100">
          <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow">
            {buildingName(building)} {floor}층
            <span className="ml-1 font-normal text-gray-400">
              {floorInfo.zone}
            </span>
          </div>
          <MapView
            plan={plan}
            zone={floorInfo.zone}
            floor={floor}
            resetKey={`${building}-${floor}`}
            items={floorItems}
            editMode={canEdit}
            selectedId={selected?.id ?? null}
            highlightId={highlightId}
            onSelect={setSelected}
            onAddAt={handleAddAt}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
          />

          {/* 상세 카드 */}
          {selected && (
            <div className="absolute bottom-4 left-4 z-30">
              <ItemCard
                item={selected}
                canEdit={canEdit}
                onClose={() => setSelected(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          )}
        </section>

        {/* 우측 패널 */}
        <aside className="w-56 shrink-0 overflow-auto border-l border-gray-200 bg-white p-4">
          <FloorSwitcher
            building={building}
            floor={floor}
            counts={counts}
            onChange={(b, f) => {
              setBuilding(b);
              setFloor(f);
              setSelected(null);
            }}
          />
          <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
            <p className="font-semibold text-gray-500">과목 색상</p>
            <div className="mt-2 flex flex-col gap-1">
              {Object.entries({
                물리: "#2563eb",
                화학: "#16a34a",
                생명: "#dc2626",
                지구: "#9333ea",
                공학: "#ea580c",
              }).map(([k, v]) => (
                <span key={k} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: v }}
                  />
                  {k}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* 추가/수정 폼 */}
      {form && (
        <ItemForm
          initial={form.initial}
          onSave={handleSave}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
