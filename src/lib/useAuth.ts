"use client";

import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirebaseAuth, isSchoolEmail } from "./firebase";

export interface AuthState {
  email: string | null;
  isSchoolUser: boolean;
  loading: boolean;
}

export function useAuth(): AuthState & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: "ts.hs.kr", prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }

  async function signOut() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await firebaseSignOut(auth);
    setEmail(null);
  }

  return {
    email,
    isSchoolUser: isSchoolEmail(email),
    loading,
    signIn,
    signOut,
  };
}
