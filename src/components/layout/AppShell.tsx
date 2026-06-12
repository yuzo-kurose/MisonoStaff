"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeft, House, ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { navByRole, navGroupsByRole, type Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

const COLLAPSE_KEY = "sidebar-collapsed";

/**
 * 役割ごとの色分け。どの立場の画面かを一目で判別できるようにする。
 * 4役割をはっきり違う色相に割り当てる（青＝参加者／緑＝代表者／黒＝管理者／金＝受付）。
 * - bar : 画面上部のヘッダーバー背景（白文字、WCAG AA 合格の濃色トークン）
 * - pill: サイドバー等に置く小バッジ（淡色背景＋濃色文字）
 * 以前は参加者(primary)と代表者(info)がどちらも青で紛らわしかったため、代表者を緑(success)へ変更。
 */
const roleTheme: Record<Role, { label: string; bar: string; pill: string }> = {
  participant: { label: "参加者", bar: "bg-primary-700 text-neutral-white", pill: "bg-primary-100 text-primary-900" },
  representative: { label: "代表者", bar: "bg-success-900 text-neutral-white", pill: "bg-success-100 text-success-900" },
  admin: { label: "管理者", bar: "bg-neutral-900 text-neutral-white", pill: "bg-neutral-900 text-neutral-white" },
  reception: { label: "受付", bar: "bg-warning-900 text-neutral-white", pill: "bg-warning-100 text-warning-900" },
};

/**
 * ダッシュボード型の共通シェル。
 * - md以上：左サイドバー（折りたたみ可：アイコンのみ表示に切替、状態は localStorage 保存）
 * - md未満：上部バー＋下部タブバー
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navByRole[role];
  const groups = navGroupsByRole[role];
  const { who } = useAuthUser();
  const [collapsed, setCollapsed] = useState(false);
  // 2階層メニューの親カテゴリ開閉。既定は全て開く。
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
    <div className="min-h-screen bg-neutral-50 md:flex">
      {/* サイドバー（PC） */}
      <aside
        className={`hidden flex-none flex-col border-r border-neutral-200 bg-neutral-white md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div
          className={`border-b border-neutral-200 ${
            collapsed
              ? "flex flex-col items-center gap-1 px-2 py-2"
              : "flex h-16 items-center justify-between px-4"
          }`}
        >
          <Link href="/" title="トップへ" className="flex items-center gap-2 rounded-lg hover:bg-neutral-50">
            <Image src="/mark.png" alt="神慈秀明会" width={32} height={32} className="flex-none" priority />
            {!collapsed && (
              <div className="leading-tight">
                <p className="text-label-md font-medium text-neutral-900">神苑スタッフ</p>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-label-sm font-medium ${roleTheme[role].pill}`}>
                  {roleTheme[role].label}画面
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={toggle}
            title={collapsed ? "メニューを開く" : "折りたたむ"}
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link
            href="/"
            title={collapsed ? "ホーム" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 transition-colors hover:bg-neutral-100 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <House size={20} className="text-neutral-600" />
            {!collapsed && "ホーム"}
          </Link>

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
                      active
                        ? "bg-primary-50 text-primary-900"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon size={20} className={active ? "text-primary-900" : "text-neutral-600"} />
                  </Link>
                );
              })
            : /* 展開時：2階層（親カテゴリ → 子項目） */
              groups.map((group) => {
                const open = openGroups[group.label] ?? true;
                const GroupIcon = group.icon;
                return (
                  <div key={group.label} className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-label-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700"
                    >
                      <GroupIcon size={16} className="flex-none text-neutral-500" />
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDown
                        size={14}
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
                                  ? "bg-primary-50 font-medium text-primary-900"
                                  : "text-neutral-700 hover:bg-neutral-100"
                              }`}
                            >
                              <Icon
                                size={18}
                                className={active ? "text-primary-900" : "text-neutral-600"}
                              />
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

        <div className="border-t border-neutral-200 p-3">
          {who && !collapsed && (
            <div className="truncate px-3 pb-2 text-label-sm text-neutral-600" title={who}>
              {who}
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "ログアウト" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-neutral-700 hover:bg-neutral-100 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={20} className="text-neutral-600" />
            {!collapsed && "ログアウト"}
          </button>
        </div>
      </aside>

      {/* 役割カラーの上部ヘッダー（全サイズ共通・固定）。色で立場を一目判別する。 */}
      <div className="flex-1">
        <header
          className={`sticky top-0 z-20 flex h-14 items-center gap-3 px-4 md:h-16 md:px-8 ${roleTheme[role].bar}`}
        >
          {/* スマホはサイドバーが無いのでロゴを出す */}
          <Link href="/" className="flex items-center gap-2 md:hidden" title="トップへ">
            <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} />
          </Link>
          <span className="text-heading-sm font-bold md:text-heading-md">
            {roleTheme[role].label}画面
          </span>
          {who && (
            <span className="ml-auto truncate text-label-sm opacity-90" title={who}>
              {who}
            </span>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* 下部タブバー（スマホ） */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-neutral-white md:hidden">
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
