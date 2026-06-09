"use client";

import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Item, ItemInput } from "./types";

function toItem(id: string, data: Record<string, unknown>): Item {
  const ts = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : String(v ?? "");
  return {
    id,
    name: data.name as string,
    spec: (data.spec as string | null) ?? null,
    categories: (data.categories as string) ?? "",
    subjects: (data.subjects as string[]) ?? [],
    building: data.building as Item["building"],
    floor: data.floor as number,
    room: (data.room as string | null) ?? null,
    pos_x: data.pos_x as number,
    pos_y: data.pos_y as number,
    image_url: (data.image_url as string | null) ?? null,
    image_public_id: (data.image_public_id as string | null) ?? null,
    created_by: (data.created_by as string | null) ?? null,
    updated_by: (data.updated_by as string | null) ?? null,
    created_at: ts(data.created_at),
    updated_at: ts(data.updated_at),
  };
}

export async function fetchItems(): Promise<Item[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const q = query(collection(db, "items"), orderBy("created_at", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toItem(d.id, d.data() as Record<string, unknown>));
}

export async function createItem(
  input: ItemInput,
  email: string | null
): Promise<Item> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  const ref = await addDoc(collection(db, "items"), {
    ...normalize(input),
    created_by: email,
    updated_by: email,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return toItem(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateItem(
  id: string,
  input: Partial<ItemInput>,
  email: string | null
): Promise<Item> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  const patch: Record<string, unknown> = {
    updated_by: email,
    updated_at: serverTimestamp(),
  };
  for (const [k, v] of Object.entries(input)) patch[k] = v;
  const ref = doc(db, "items", id);
  await updateDoc(ref, patch);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("항목을 찾을 수 없습니다.");
  return toItem(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateItemPosition(
  id: string,
  pos_x: number,
  pos_y: number,
  email: string | null
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  await updateDoc(doc(db, "items", id), {
    pos_x,
    pos_y,
    updated_by: email,
    updated_at: serverTimestamp(),
  });
}

export async function deleteItem(id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  await deleteDoc(doc(db, "items", id));
}

function normalize(input: ItemInput) {
  return {
    name: input.name.trim(),
    spec: input.spec.trim() || null,
    categories: input.categories.trim(),
    subjects: input.subjects,
    building: input.building,
    floor: input.floor,
    room: input.room.trim() || null,
    pos_x: input.pos_x,
    pos_y: input.pos_y,
    image_url: input.image_url,
    image_public_id: input.image_public_id,
  };
}
