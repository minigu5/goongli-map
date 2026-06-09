"use client";

import { isFirebaseConfigured } from "@/lib/firebase";

interface Props {
  email: string | null;
  isSchoolUser: boolean;
  loading: boolean;
  editMode: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onToggleEdit: () => void;
}

export default function AuthButton({
  email,
  isSchoolUser,
  loading,
  editMode,
  onSignIn,
  onSignOut,
  onToggleEdit,
}: Props) {
  if (!isFirebaseConfigured) {
    return (
      <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        로그인 미설정
      </span>
    );
  }

  if (loading) {
    return <span className="px-3 py-2 text-sm text-gray-400">…</span>;
  }

  if (!email) {
    return (
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <GoogleIcon />
        로그인
      </button>
    );
  }

  if (!isSchoolUser) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-red-500 sm:inline">
          학교 계정(@ts.hs.kr)만 수정 가능
        </span>
        <button
          onClick={onSignOut}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleEdit}
        className={`rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
          editMode
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {editMode ? "수정 모드 ON" : "수정 모드"}
      </button>
      <button
        onClick={onSignOut}
        title={email}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        로그아웃
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
