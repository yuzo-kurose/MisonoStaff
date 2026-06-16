"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeft, ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { navByRole, navGroupsByRole, roleLabels, type Role } from "@/lib/nav";
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
 * - 全幅の白いトップヘッダー（左：ロゴ＋ブランド／右：役割・ユーザー名・ログアウト）。
 * - md以上：ヘッダー下の左に紺色サイドバー（折りたたみ可。状態は localStorage 保存）。
 *   展開時は「○○メニュー」グループをアコーディオンで開閉できる。
 * - md未満：トップヘッダー＋下部タブバー（サイドバーは出さない）。
 * メニュー項目は role（権限）ごとに navGroupsByRole で出し分ける。
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navByRole[role];
  const groups = navGroupsByRole[role];
  const { who } = useAuthUser();
  const [collapsed, setCollapsed] = useState(false);
  // 親カテゴリ（○○メニュー）の開閉状態。既定は全て開く。
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.label, true])),
  );

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

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

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* 全幅トップヘッダー（白） */}
      <header className="sticky top-0 z-30 flex h-14 flex-none items-center gap-2 border-b border-neutral-200 bg-neutral-white px-3 md:px-4">
        {/* サイドバー折りたたみトグル（PCのみ） */}
        <button
          onClick={toggle}
          title={collapsed ? "メニューを開く" : "メニューを折りたたむ"}
          className="hidden rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:block"
        >
          <PanelLeft size={20} />
        </button>

        {/* ロゴ＋ブランド＝ホームへ戻る */}
        <Link href="/" title="ホームへ戻る" className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-neutral-100">
          <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} className="flex-none" priority />
          <span className="text-heading-sm font-bold text-neutral-900">神苑スタッフ</span>
        </Link>

        {/* 右側：役割・ユーザー名・ログアウト */}
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-label-sm font-medium text-primary-900 sm:inline">
            {roleLabels[role]}
          </span>
          {who && (
            <span className="hidden max-w-[200px] truncate text-label-md text-neutral-900 md:inline" title={who}>
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

      {/* ヘッダー下：サイドバー＋メイン */}
      <div className="flex flex-1">
        {/* サイドバー（PC・紺色・折りたたみ可）。ロゴはヘッダーが担うのでメニューのみ。 */}
        <aside
          className={`hidden flex-none flex-col border-r border-white/10 text-white md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)] ${SIDEBAR_BG} ${
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
              : /* 展開時：「○○メニュー」グループ → 子項目。グループ見出しで折りたたみ開閉。 */
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
                                className={`flex items-center gap-3 rounded-lg py-2.5 pl-9 pr-3 text-label-md transition-colors ${
                                  active
                                    ? "bg-white/15 font-medium text-white"
                                    : "text-white/80 hover:bg-white/10"
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
                })}
          </nav>
        </aside>

        {/* メイン */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* 下部タブバー（スマホ） */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-neutral-white md:hidden">
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-label-sm ${
                active ? "text-primary-900" : "text-neutral-600"
              }`}
            >
              <Icon size={22} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
