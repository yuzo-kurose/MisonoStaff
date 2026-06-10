"use client";

import Link from "next/link";
import { useAuthUser } from "@/hooks/useAuthUser";

/**
 * ホーム画面 右上のユーザー表示。
 * - ログイン中：頭文字アバター（クリックでマイページ）
 * - 未ログイン：ログインリンク（showLoginWhenAnon=false なら非表示）
 */
export function HomeUserMenu({ showLoginWhenAnon = true }: { showLoginWhenAnon?: boolean }) {
  const { who, authed } = useAuthUser();

  if (!authed) {
    if (!showLoginWhenAnon) return null;
    return (
      <Link href="/login" className="text-label-md text-neutral-700">
        ログイン
      </Link>
    );
  }

  const initial = who.trim().charAt(0).toUpperCase() || "U";

  return (
    <Link
      href="/mypage"
      title={who}
      aria-label={`${who} のマイページ`}
      className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary-700 text-label-md font-medium text-neutral-white shadow-sm ring-2 ring-neutral-white/70 transition-colors hover:bg-primary-900"
    >
      {initial}
    </Link>
  );
}
