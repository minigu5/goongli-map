"use client";

import { useState } from "react";
import type { Item, ItemInput } from "@/lib/types";
import {
  buildingName,
  getFloor,
  SUBJECTS,
  SUBJECT_COLORS,
  type BuildingId,
} from "@/lib/buildings";
import {
  isCloudinaryConfigured,
  thumbUrl,
  uploadImage,
} from "@/lib/cloudinary";

interface Props {
  // 신규 추가 시 좌표/건물/층, 수정 시 기존 항목
  initial: {
    id?: string;
    building: BuildingId;
    floor: number;
    pos_x: number;
    pos_y: number;
  } & Partial<Item>;
  onSave: (input: ItemInput, id?: string) => Promise<void>;
  onCancel: () => void;
}

export default function ItemForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name ?? "");
  const [spec, setSpec] = useState(initial.spec ?? "");
  const [categories, setCategories] = useState(initial.categories ?? "");
  const [room, setRoom] = useState(initial.room ?? "");
  const [subjects, setSubjects] = useState<string[]>(initial.subjects ?? []);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial.image_url ?? null
  );
  const [imagePublicId, setImagePublicId] = useState<string | null>(
    initial.image_public_id ?? null
  );
  const [pinW, setPinW] = useState(initial.pin_w ?? 3);
  const [pinH, setPinH] = useState(initial.pin_h ?? 3);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const floorZone = getFloor(initial.building, initial.floor)?.zone ?? "";

  function toggleSubject(s: string) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url, publicId } = await uploadImage(file);
      setImageUrl(url);
      setImagePublicId(publicId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError("이름은 필수입니다.");
    if (subjects.length === 0) return setError("과목을 1개 이상 선택하세요.");
    setSaving(true);
    try {
      await onSave(
        {
          name,
          spec,
          categories,
          subjects,
          building: initial.building,
          floor: initial.floor,
          room,
          pos_x: initial.pos_x,
          pos_y: initial.pos_y,
          image_url: imageUrl,
          image_public_id: imagePublicId,
          pin_w: pinW,
          pin_h: pinH,
        },
        initial.id
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
          <h2 className="text-lg font-bold">
            {initial.id ? "용품 수정" : "용품 추가"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            위치: <b>{buildingName(initial.building)} {initial.floor}층</b>{" "}
            <span className="text-gray-400">({floorZone})</span>
          </p>

          <Field label="이름" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 전자저울"
              className="form-input"
            />
          </Field>

          <Field label="과목" required>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const on = subjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className="rounded-full border px-3 py-1 text-sm font-semibold transition-colors"
                    style={{
                      background: on ? SUBJECT_COLORS[s] : "white",
                      color: on ? "white" : "#6b7280",
                      borderColor: on ? SUBJECT_COLORS[s] : "#e5e7eb",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="규격">
            <input
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="예: 0.01g / 최대 200g"
              className="form-input"
            />
          </Field>

          <Field label="방 이름/위치">
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="예: 물리실험실1"
              className="form-input"
            />
          </Field>

          <Field label="카테고리">
            <textarea
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="쉼표(,)로 구분. 예: 저울, 측정, 무게, balance, 전자저울"
              rows={2}
              className="form-input resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              검색이 잘 되도록 관련 단어를 많이 넣어 주세요.
            </p>
          </Field>

          <Field label="핀 크기 (px)">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                가로
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={pinW}
                  onChange={(e) => setPinW(Number(e.target.value))}
                  className="form-input w-20"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                세로
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={pinH}
                  onChange={(e) => setPinH(Number(e.target.value))}
                  className="form-input w-20"
                />
              </label>
              <span
                style={{
                  display: "inline-block",
                  width: pinW,
                  height: pinH,
                  background: "#2563eb",
                  border: "1px solid #93c5fd",
                }}
                title="핀 미리보기"
              />
            </div>
          </Field>

          <Field label="이미지">
            {imageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(imageUrl, 200) ?? imageUrl}
                  alt="미리보기"
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setImagePublicId(null);
                  }}
                  className="text-sm text-red-600 hover:underline"
                >
                  이미지 제거
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 hover:bg-gray-50">
                {uploading
                  ? "업로드 중…"
                  : isCloudinaryConfigured
                    ? "이미지 선택 (자동 압축)"
                    : "Cloudinary 미설정"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || !isCloudinaryConfigured}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            )}
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-gray-100 bg-white px-5 py-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
