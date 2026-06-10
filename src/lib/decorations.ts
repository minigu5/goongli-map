"use client";

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Decoration } from "./types";

export async function fetchDecorations(): Promise<Decoration[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, "decorations"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Decoration));
}

export function subscribeDecorations(
  callback: (decos: Decoration[]) => void,
  onError?: (err: Error) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) { callback([]); return () => {}; }
  return onSnapshot(
    collection(db, "decorations"),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Decoration))),
    onError
  );
}

export async function createDecoration(
  input: Omit<Decoration, "id">,
  email: string | null
): Promise<Decoration> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  const ref = await addDoc(collection(db, "decorations"), {
    ...input,
    created_by: email,
  });
  return { id: ref.id, ...input };
}

export async function updateDecorationGeometry(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  await updateDoc(doc(db, "decorations", id), { x, y, w, h });
}

export async function deleteDecoration(id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firebase 미설정");
  await deleteDoc(doc(db, "decorations", id));
}
