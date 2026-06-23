"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Menu, X, Bell, UserCog, Grid3x3, Repeat } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { selectableViews, navItemsForView, roleLabels, type Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

/** pathname に最も深く一致する nav href を1つ選ぶ（/mypage と /mypage/history の二重ハイライト防止）。 */
function activeHrefOf(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
}
const inView = (pathname: string, view: Role) =>
  navItemsForView(view).some((it) => pathname === it.href || pathname.startsWith(it.href + "/"));

/**
 * 共通シェル（上部横ナビ型＋画面切替）。
 * - 右上の「画面切替」で権限のあるビュー（参加者/代表者/管理者/受付）を選択でき、
 *   選択したビューのメニューをヘッダーに表示する。選択するとそのビューの先頭画面へ遷移。
 * - PC：横並びナビ（現在地は下線）＋通知ベル＋アカウント。
 * - スマホ：下部タブ（主要4項目＋メニュー）＋全メニュードロワー。
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { who, role: authRole } = useAuthUser();
  const effectiveRole = authRole ?? role;

  const views = selectableViews(effectiveRole);
  const ownDefault = (views.includes(effectiveRole as Role) ? (effectiveRole as Role) : views[0]) ?? "participant";
  // 現在ページが属するビューを優先。無ければ自分の既定ビュー。
  const view: Role = views.find((v) => inView(pathname, v)) ?? ownDefault;
  const items = navItemsForView(view);
  const activeHref = activeHrefOf(pathname, items.map((i) => i.href));

  const [menuOpen, setMenuOpen] = useState(false); // スマホ：全メニュードロワー
  const [accountOpen, setAccountOpen] = useState(false); // PC：アカウントメニュー
  const [viewOpen, setViewOpen] = useState(false); // 画面切替メニュー

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
    setViewOpen(false);
  }, [pathname]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // ビューを切り替えてそのビューの先頭画面へ遷移。
  function switchView(v: Role) {
    setViewOpen(false);
    setMenuOpen(false);
    const first = navItemsForView(v)[0];
    if (first) router.push(first.href);
  }

  const initial = (who ?? "").trim().charAt(0) || "ス";
  const roleLabel = roleLabels[view];
  const tabItems = items.slice(0, 4);

  const Avatar = ({ size = 36 }: { size?: number }) => (
    <span
      className="grid flex-none place-items-center rounded-full bg-primary-700 font-bold text-neutral-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  );

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* トップヘッダー */}
      <header className="sticky top-0 z-30 h-16 flex-none border-b border-neutral-200 bg-neutral-white">
        <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-3 md:gap-4 md:px-5">
          {/* ロゴ */}
          <Link href="/mypage" className="flex flex-none items-center gap-2">
            <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} priority />
            <span className="hidden text-heading-sm font-bold text-neutral-900 sm:inline">神苑スタッフ</span>
          </Link>

          {/* PC：横並びナビ */}
          <nav className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
            {items.map((it) => {
              const active = it.href === activeHref;
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`relative flex flex-none items-center gap-1.5 rounded-lg px-3 py-2 text-label-md transition-colors ${
                    active
                      ? "font-semibold text-primary-900"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <Icon size={17} className="flex-none" />
                  {it.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-[1px] h-0.5 rounded-full bg-primary-700" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 右：画面切替＋通知ベル＋アカウント */}
          <div className="ml-auto flex flex-none items-center gap-1.5 md:ml-0">
            {/* 画面切替（権限のあるビューが2つ以上のときのみ・PC） */}
            {views.length > 1 && (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setViewOpen((o) => !o)}
                  aria-expanded={viewOpen}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-label-md text-neutral-700 hover:bg-neutral-50"
                >
                  <Repeat size={15} className="text-neutral-500" />
                  {roleLabel}
                  <ChevronDown size={15} className="text-neutral-400" />
                </button>
                {viewOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setViewOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-white py-1 shadow-lg">
                      <p className="px-3 py-1.5 text-label-sm text-neutral-500">画面を切り替え</p>
                      {views.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => switchView(v)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-label-md hover:bg-neutral-50 ${
                            v === view ? "font-semibold text-primary-900" : "text-neutral-700"
                          }`}
                        >
                          {roleLabels[v]}
                          {v === view && <span className="h-1.5 w-1.5 rounded-full bg-primary-700" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <Link
              href="/announcements"
              aria-label="お知らせ"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
            >
              <Bell size={20} />
            </Link>

            {/* PC：アカウントメニュー */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                className="flex items-center gap-2 rounded-lg p-1 pl-1.5 hover:bg-neutral-100"
              >
                <Avatar />
                <span className="hidden min-w-0 text-left lg:block">
                  <span className="block max-w-[140px] truncate text-label-md text-neutral-900">
                    {who ?? "—"}
                  </span>
                  <span className="block text-label-sm text-neutral-500">{roleLabel}</span>
                </span>
                <ChevronDown size={16} className="text-neutral-400" />
              </button>
              {accountOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-white py-1 shadow-lg">
                    <div className="border-b border-neutral-100 px-4 py-2">
                      <p className="truncate text-label-md text-neutral-900">{who ?? "—"}</p>
                      <p className="text-label-sm text-neutral-500">{roleLabel}</p>
                    </div>
                    <Link
                      href="/mypage/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-50"
                    >
                      <UserCog size={16} /> プロフィール編集
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-50"
                    >
                      <LogOut size={16} /> ログアウト
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* スマホ：ハンバーガー */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="メニューを開く"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1600px] px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-10">{children}</div>
      </main>

      {/* スマホ：下部固定タブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-neutral-white md:hidden">
        {tabItems.map((it) => {
          const active = it.href === activeHref;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "text-primary-900" : "text-neutral-500"
              }`}
            >
              <Icon size={20} />
              <span className="max-w-full truncate px-1">{it.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-neutral-500"
        >
          <Grid3x3 size={20} />
          メニュー
        </button>
      </nav>

      {/* スマホ：全メニュードロワー */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-neutral-900/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col bg-neutral-white shadow-xl">
            <div className="flex h-16 flex-none items-center justify-between border-b border-neutral-200 px-4">
              <div className="flex items-center gap-2">
                <Avatar size={32} />
                <div className="min-w-0">
                  <p className="truncate text-label-md text-neutral-900">{who ?? "—"}</p>
                  <p className="text-label-sm text-neutral-500">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="閉じる"
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* 画面切替（スマホ） */}
            {views.length > 1 && (
              <div className="flex-none border-b border-neutral-200 px-3 py-2">
                <p className="mb-1 px-1 text-label-sm text-neutral-500">画面を切り替え</p>
                <div className="flex flex-wrap gap-1.5">
                  {views.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => switchView(v)}
                      className={`rounded-full px-3 py-1 text-label-sm ${
                        v === view
                          ? "bg-primary-700 text-neutral-white"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {roleLabels[v]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {items.map((it) => {
                const active = it.href === activeHref;
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors ${
                      active
                        ? "bg-primary-50 font-medium text-primary-900"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon size={18} className="flex-none" />
                    {it.label}
                  </Link>
                );
              })}
              <Link
                href="/mypage/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-100"
              >
                <UserCog size={18} className="flex-none" /> プロフィール編集
              </Link>
            </nav>
            <div className="flex-none border-t border-neutral-200 p-3">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-100"
              >
                <LogOut size={18} className="flex-none" /> ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
