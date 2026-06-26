"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, Menu, X, Bell, UserCog } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { selectableViews, navItemsForView, pageTitleFor, pageIconFor, roleLabels, type Role } from "@/lib/nav";
import { HeaderMetaContext } from "@/components/layout/header-meta";
import { Select } from "@/components/ui/Field";
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
 * 共通シェル（左サイドバー型）。
 * - PC：左に明るいサイドバー（ロゴ／画面切替／メニュー）。現在地は淡色＋アクセントで強調。
 *   上部バー右に通知ベルとアカウントメニュー。
 * - スマホ：上部バーのハンバーガーから左スライドのドロワー。
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { who, role: authRole } = useAuthUser();
  const effectiveRole = authRole ?? role;

  const views = selectableViews(effectiveRole);
  const ownDefault = (views.includes(effectiveRole as Role) ? (effectiveRole as Role) : views[0]) ?? "participant";
  const view: Role = views.find((v) => inView(pathname, v)) ?? ownDefault;
  const items = navItemsForView(view);
  const activeHref = activeHrefOf(pathname, items.map((i) => i.href));

  const [menuOpen, setMenuOpen] = useState(false); // スマホ：ドロワー
  const [accountOpen, setAccountOpen] = useState(false);
  const [headerDesc, setHeaderDesc] = useState<string | null>(null); // ページ補足説明
  const headerMeta = useMemo(() => ({ setDescription: setHeaderDesc }), []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function switchView(v: Role) {
    setMenuOpen(false);
    const first = navItemsForView(v)[0];
    if (first) router.push(first.href);
  }

  const initial = (who ?? "").trim().charAt(0) || "ス";
  const roleLabel = roleLabels[view];
  const pageTitle = pageTitleFor(pathname);
  const PageIcon = pageIconFor(pathname);

  // サイドバーの中身（PC・モバイルドロワーで共用）。
  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <div className="flex h-16 flex-none items-center gap-2 px-5">
        <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} priority />
        <span className="text-heading-sm font-bold text-neutral-900">神苑スタッフ</span>
      </div>

      {views.length > 1 && (
        <div className="px-3 pb-2">
          <label className="mb-1 block px-1 text-label-sm text-neutral-500">画面</label>
          <Select value={view} onChange={(e) => switchView(e.target.value as Role)}>
            {views.map((v) => (
              <option key={v} value={v}>
                {roleLabels[v]}
              </option>
            ))}
          </Select>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((it) => {
          const active = it.href === activeHref;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors ${
                active
                  ? "bg-primary-50 font-semibold text-primary-900"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary-700" aria-hidden />
              )}
              <Icon size={18} className={`flex-none ${active ? "text-primary-700" : "text-neutral-500"}`} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-none border-t border-neutral-200 p-3">
        <Link
          href="/mypage/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-100"
        >
          <UserCog size={18} className="flex-none text-neutral-500" /> プロフィール編集
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-100"
        >
          <LogOut size={18} className="flex-none text-neutral-500" /> ログアウト
        </button>
      </div>
    </>
  );

  return (
    <HeaderMetaContext.Provider value={headerMeta}>
    <div className="min-h-screen bg-neutral-50">
      {/* PC：固定サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-neutral-white md:flex">
        {sidebarBody()}
      </aside>

      {/* スマホ：ドロワー */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-neutral-900/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-neutral-white shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="閉じる"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <X size={20} />
            </button>
            {sidebarBody(() => setMenuOpen(false))}
          </div>
        </div>
      )}

      {/* メイン領域 */}
      <div className="flex min-h-screen flex-col md:pl-60">
        {/* 上部バー */}
        <header className="sticky top-0 z-20 flex min-h-16 flex-none items-center gap-2 border-b-2 border-accent-700 bg-neutral-white px-4 py-2.5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
          >
            <Menu size={22} />
          </button>

          {/* ページタイトル（現在地のメニュー名と一致）＋アイコン＋補足説明 */}
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary-50 text-primary-700">
              <PageIcon size={20} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-heading-md leading-tight text-neutral-900">{pageTitle}</h1>
              {headerDesc && (
                // スマホでは省スペースのため補足説明は非表示（md以上で表示）。
                <p className="mt-0.5 hidden text-body-sm leading-snug text-neutral-600 md:line-clamp-2">
                  {headerDesc}
                </p>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/announcements"
              aria-label="お知らせ"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
            >
              <Bell size={20} />
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-expanded={accountOpen}
                className="flex items-center gap-2 rounded-lg p-1 pl-1.5 hover:bg-neutral-100"
              >
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-full bg-primary-700 text-label-md font-bold text-neutral-white"
                  aria-hidden
                >
                  {initial}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[140px] truncate text-label-md text-neutral-900">{who ?? "—"}</span>
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
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
    </HeaderMetaContext.Provider>
  );
}
