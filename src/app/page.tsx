"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/MapView";
import FloorSwitcher from "@/components/FloorSwitcher";
import SearchBar from "@/components/SearchBar";
import CabinetCard from "@/components/CabinetCard";
import ItemForm from "@/components/ItemForm";
import AuthButton from "@/components/AuthButton";
import { buildingName, getFloor, type BuildingId } from "@/lib/buildings";
import { getFloorPlan, getRoomAt, getCellAt } from "@/lib/floorplans";
import type { Item, ItemInput } from "@/lib/types";
import {
  createItem,
  deleteItem,
  fetchItems,
  updateItem,
  updateItemPosition,
  updateItemShelf,
} from "@/lib/items";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

function posKey(it: { pos_x: number; pos_y: number }) {
  return `${Math.round(it.pos_x * 10000)}_${Math.round(it.pos_y * 10000)}`;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [building, setBuilding] = useState<BuildingId>("gungri");
  const [floor, setFloor] = useState<number>(5);
  const [editMode, setEditMode] = useState(false);

  const [query, setQuery] = useState("");
  const [selectedCabinet, setSelectedCabinet] = useState<Item[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [pendingAddPos, setPendingAddPos] = useState<{ x: number; y: number } | null>(null);

  // 수납장 추가 후 재선택을 위한 pending 좌표
  const pendingCabinetPos = useRef<{
    building: BuildingId;
    floor: number;
    key: string;
  } | null>(null);

  const canEdit = editMode && auth.isSchoolUser;

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    fetchItems()
      .then(setItems)
      .catch((e) => setLoadError(e.message ?? "불러오기 실패"));
  }, []);

  useEffect(() => {
    if (!auth.isSchoolUser) setEditMode(false);
  }, [auth.isSchoolUser]);

  // 수정 모드 해제 시 대기 위치 초기화
  useEffect(() => {
    if (!canEdit) setPendingAddPos(null);
  }, [canEdit]);

  // 아이템 변경 시 selectedCabinet 동기화 + pendingCabinetPos 처리
  useEffect(() => {
    // pending: 저장 직후 해당 위치의 그룹을 다시 선택
    const pending = pendingCabinetPos.current;
    if (pending) {
      pendingCabinetPos.current = null;
      const group = items.filter(
        (x) =>
          x.building === pending.building &&
          x.floor === pending.floor &&
          posKey(x) === pending.key
      );
      if (group.length > 0) {
        group.sort((a, b) => (a.shelf ?? 9999) - (b.shelf ?? 9999));
        setSelectedCabinet(group);
        return;
      }
    }
    // 이미 열린 수납장: 동기화 (수정/삭제 반영)
    if (!selectedCabinet) return;
    const ids = new Set(selectedCabinet.map((it) => it.id));
    const updated = items.filter((it) => ids.has(it.id));
    updated.sort((a, b) => (a.shelf ?? 9999) - (b.shelf ?? 9999));
    if (updated.length === 0) setSelectedCabinet(null);
    else setSelectedCabinet(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
      return terms.some((t) => text.includes(t));
    });
  }, [items, query]);

  const floorInfo = getFloor(building, floor)!;
  const plan = getFloorPlan(building, floor)!;

  // 검색 결과 클릭: 해당 위치 수납장 그룹을 열고 핀 강조
  function goToItem(it: Item) {
    setBuilding(it.building);
    setFloor(it.floor);
    setHighlightId(it.id);
    setQuery("");
    const key = posKey(it);
    const group = items.filter(
      (x) => x.building === it.building && x.floor === it.floor && posKey(x) === key
    );
    group.sort((a, b) => (a.shelf ?? 9999) - (b.shelf ?? 9999));
    setSelectedCabinet(group.length > 0 ? group : [it]);
    setTimeout(() => setHighlightId(null), 2500);
  }

  // 지도 빈 곳 클릭 → 추가 위치 대기 (2단계 확인)
  function handleAddAt(x: number, y: number) {
    if (!canEdit) return;
    const cell = getCellAt(plan, x, y);
    if (cell && cell.kind && cell.kind !== "room") return;
    setSelectedCabinet(null);
    setPendingAddPos({ x, y });
  }

  // 확인 버튼 → 폼 열기
  function handleConfirmAdd() {
    if (!pendingAddPos) return;
    const detectedRoom = getRoomAt(plan, pendingAddPos.x, pendingAddPos.y);
    setForm({
      initial: {
        building,
        floor,
        pos_x: pendingAddPos.x,
        pos_y: pendingAddPos.y,
        room: detectedRoom ?? undefined,
      },
    });
    setPendingAddPos(null);
  }

  // 지도 핀 클릭 → 수납장 열기 (대기 위치 해제)
  function handleSelectGroup(group: Item[]) {
    setSelectedCabinet(group);
    setPendingAddPos(null);
  }

  // CabinetCard '이 위치에 용품 추가' → 같은 좌표로 폼 열기
  function handleAddToCabinet() {
    if (!canEdit || !selectedCabinet || selectedCabinet.length === 0) return;
    const rep = selectedCabinet[0];
    setForm({
      initial: {
        building: rep.building,
        floor: rep.floor,
        pos_x: rep.pos_x,
        pos_y: rep.pos_y,
        room: rep.room ?? undefined,
        pin_w: rep.pin_w ?? undefined,
        pin_h: rep.pin_h ?? undefined,
      },
    });
  }

  // CabinetCard '수정' 클릭
  function handleEdit(it: Item) {
    setForm({ initial: { ...it } });
  }

  async function handleSave(input: ItemInput, id?: string) {
    if (id) {
      const updated = await updateItem(id, input, auth.email);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } else {
      const created = await createItem(input, auth.email);
      // 저장 후 해당 위치 수납장을 다시 선택하도록 pending 설정
      pendingCabinetPos.current = {
        building: created.building,
        floor: created.floor,
        key: posKey(created),
      };
      setItems((prev) => [...prev, created]);
    }
    setForm(null);
  }

  // 수납장 내 순서 드래그 → shelf 번호를 1, 2, 3... 으로 갱신
  async function handleReorder(reordered: Item[]) {
    const withShelves = reordered.map((it, i) => ({ ...it, shelf: i + 1 }));
    // 로컬 즉시 반영
    setItems((prev) => {
      const map = new Map(withShelves.map((it) => [it.id, it]));
      return prev.map((it) => map.get(it.id) ?? it);
    });
    setSelectedCabinet(withShelves);
    // Firestore 동기화
    try {
      await Promise.all(
        withShelves.map((it) => updateItemShelf(it.id, it.shelf!, auth.email))
      );
    } catch {
      /* 다음 새로고침에서 정정 */
    }
  }

  async function handleDelete(it: Item) {
    if (!confirm(`"${it.name}"을(를) 삭제할까요?`)) return;
    await deleteItem(it.id);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
  }

  // 수납장 그룹 전체 드래그 이동 (로컬 즉시 반영)
  function handleMove(ids: string[], x: number, y: number) {
    setItems((prev) =>
      prev.map((it) => (ids.includes(it.id) ? { ...it, pos_x: x, pos_y: y } : it))
    );
  }

  // 드래그 종료: Firestore 저장
  async function handleMoveEnd(ids: string[], x: number, y: number) {
    try {
      await Promise.all(ids.map((id) => updateItemPosition(id, x, y, auth.email)));
    } catch {
      /* 다음 새로고침에서 정정 */
    }
  }

  const selectedIds = useMemo(
    () => selectedCabinet?.map((it) => it.id) ?? [],
    [selectedCabinet]
  );

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

      {/* 배너 */}
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
            resetKey={`${building}-${floor}`}
            items={floorItems}
            editMode={canEdit}
            selectedIds={selectedIds}
            highlightId={highlightId}
            pendingAddPos={pendingAddPos}
            onSelect={handleSelectGroup}
            onAddAt={handleAddAt}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
          />

          {/* 추가 위치 확인 배너 */}
          {pendingAddPos && canEdit && (
            <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-blue-600 px-4 py-2.5 shadow-xl">
              <span className="text-sm text-blue-100">위치 선택됨</span>
              <button
                onClick={handleConfirmAdd}
                className="rounded-lg bg-white px-4 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-50 active:bg-blue-100"
              >
                + 용품 추가
              </button>
              <button
                onClick={() => setPendingAddPos(null)}
                className="text-blue-300 hover:text-white text-lg leading-none"
                aria-label="취소"
              >
                ✕
              </button>
            </div>
          )}

          {/* 수납장 카드 */}
          {selectedCabinet && (
            <div className="absolute bottom-4 left-4 z-30">
              <CabinetCard
                items={selectedCabinet}
                canEdit={canEdit}
                onClose={() => setSelectedCabinet(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAdd={handleAddToCabinet}
                onReorder={handleReorder}
              />
            </div>
          )}
        </section>

        {/* 우측 hover 패널 */}
        <div
          className="absolute right-0 top-0 h-full z-20"
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          style={{ width: sidebarOpen ? 224 : 10 }}
        >
          {!sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-20 rounded-l-full bg-gray-400/50" />
          )}
          <aside
            className="absolute right-0 top-0 h-full w-56 overflow-auto bg-white/95 backdrop-blur-sm border-l border-gray-200 p-4 shadow-xl transition-transform duration-200"
            style={{ transform: sidebarOpen ? "translateX(0)" : "translateX(100%)" }}
          >
            <FloorSwitcher
              building={building}
              floor={floor}
              counts={counts}
              onChange={(b, f) => {
                setBuilding(b);
                setFloor(f);
                setSelectedCabinet(null);
                setPendingAddPos(null);
              }}
            />
          </aside>
        </div>
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
