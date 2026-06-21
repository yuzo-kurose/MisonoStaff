"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeft, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { allNavGroups, allNavItems, roleLabels, type Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

const COLLAPSE_KEY = "sidebar-collapsed";
// サイドバー（メニュー）の色は役割によらず全て紺色で統一する。
const SIDEBAR_BG = "bg-primary-900";

/**
 * ダッシュボード型の共通シェル。
 * - 全幅の白いトップヘッダー（左：メニュー操作＋ロゴ／右：役割・ユーザー名・ログアウト）。
 * - md以上：ヘッダー下の左に紺色サイドバー（折りたたみ可。状態は localStorage 保存）。
 * - md未満：ヘッダーのハンバーガーから左スライドのドロワーでメニュー全表示（下部タブは廃止）。
 * メニューは役割でフィルタせず、全ユーザー・全画面で全メニュー（4グループ）を表示する。
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // 役割でフィルタせず、全ユーザー・全画面で全メニューを表示する。
  const items = allNavItems;
  const groups = allNavGroups;
  const { who } = useAuthUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // 親カテゴリ（○○メニュー）の開閉状態。既定は「現在のページを含むグループのみ開く」。
  const activeGroupsState = () =>
    Object.fromEntries(
      groups.map((g) => [g.label, g.items.some((it) => isActive(pathname, it.href))]),
    );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(activeGroupsState);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // ページ遷移時：現在のページのグループだけ開いた状態に戻し、モバイルのドロワーは閉じる。
  useEffect(() => {
    setOpenGroups(activeGroupsState());
    setMobileNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((s) => ({ ...s, [label]: !(s[label] ?? true) }));

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // 「○○メニュー」グループのアコーディオン。PCサイドバー(展開時)とモバイルドロワーで共用。
  const renderGroups = (onNavigate?: () => void) =>
    groups.map((group) => {
      const open = openGroups[group.label] ?? true;
      const GroupIcon = group.icon;
      return (
        <div key={group.label} className="pt-1">
          <button
            type="button"
            onClick={() => toggleGroup(group.label)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-label-lg font-bold text-white transition-colors hover:bg-white/10"
          >
            <GroupIcon size={18} className="flex-none text-white/80" />
            <span className="flex-1 text-left">{group.label}</span>
            <ChevronDown
              size={16}
              className={`flex-none transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>
          {open && (
            <div className="mt-1 space-y-1">
              {group.items.map((it) => {
                const active = isActive(pathname, it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg py-2.5 pl-9 pr-3 text-label-md transition-colors ${
                      active ? "bg-white/15 font-medium text-white" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} className={active ? "text-white" : "text-white/70"} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* 全幅トップヘッダー（白）。左＝メニュー操作／中央＝マーク＋ブランド／右＝アカウント。 */}
      <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-2 border-b border-neutral-200 bg-neutral-white px-3 md:px-4 relative">
        {/* モバイル：ドロワーを開くハンバーガー */}
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="メニューを開く"
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
        >
          <Menu size={22} />
        </button>
        {/* PC：サイドバー折りたたみトグル */}
        <button
          onClick={toggle}
          title={collapsed ? "メニューを開く" : "メニューを折りたたむ"}
          className="hidden rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:block"
        >
          <PanelLeft size={20} />
        </button>
        {/* 中央：マーク＋ブランド（マークの下に小さく） */}
        <Link
          href="/"
          title="ホームへ戻る"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg px-2 py-1 leading-none hover:bg-neutral-100"
        >
          <Image src="/mark.png" alt="神慈秀明会" width={26} height={26} className="flex-none" priority />
          <span className="text-label-sm font-bold text-neutral-900">神苑スタッフ</span>
        </Link>

        {/* 右：役割・ユーザー名・ログアウト */}
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-label-sm font-medium text-primary-900 sm:inline">
            {roleLabels[role]}
          </span>
          {who && (
            <span className="hidden max-w-[180px] truncate text-label-md text-neutral-900 md:inline" title={who}>
              {who}
            </span>
          )}
          <button
            onClick={logout}
            title="ログアウト"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label-md text-neutral-700 hover:bg-neutral-100"
          >
            <LogOut size={18} className="text-neutral-600" />
            <span className="hidden md:inline">ログアウト</span>
          </button>
        </div>
      </header>

      {/* モバイル：左スライドのナビゲーションドロワー */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden
          />
          <div className={`absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col text-white shadow-xl ${SIDEBAR_BG}`}>
            <div className="flex h-16 flex-none items-center justify-between border-b border-white/10 px-4">
              <span className="text-heading-sm font-bold text-white">{roleLabels[role]}メニュー</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="メニューを閉じる"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {renderGroups(() => setMobileNavOpen(false))}
            </nav>
          </div>
        </div>
      )}

      {/* ヘッダー下：サイドバー＋メイン */}
      <div className="flex flex-1">
        {/* サイドバー（PC・紺色・折りたたみ可）。ロゴはヘッダーが担うのでメニューのみ。 */}
        <aside
          className={`hidden flex-none flex-col border-r border-white/10 text-white md:sticky md:top-16 md:flex md:h-[calc(100vh-4rem)] ${SIDEBAR_BG} ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {collapsed
              ? /* 折りたたみ時：子項目をアイコンのみで平坦表示 */
                items.map((it) => {
                  const active = isActive(pathname, it.href);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      title={it.label}
                      className={`flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors ${
                        active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <Icon size={20} className={active ? "text-white" : "text-white/70"} />
                    </Link>
                  );
                })
              : /* 展開時：「○○メニュー」グループのアコーディオン */
                renderGroups()}
          </nav>
        </aside>

        {/* メイン */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 pb-10 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
