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
 * - md以上：左サイドバー（紺色。折りたたみ可＝アイコンのみ表示に切替、状態は localStorage 保存）。
 *   展開時は「○○メニュー」グループをアコーディオンで開閉できる。
 * - md未満：上部バー＋下部タブバー
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
    <div className="min-h-screen bg-neutral-50 md:flex">
      {/* サイドバー（PC）：紺色で統一。折りたたみ可。 */}
      <aside
        className={`hidden flex-none flex-col border-r border-white/10 text-white md:flex ${SIDEBAR_BG} ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* ヘッダー帯（紺色で統一・白くするのはロゴだけ） */}
        <div
          className={`border-b border-white/10 ${
            collapsed
              ? "flex flex-col items-center gap-1 px-2 py-2"
              : "flex h-16 items-center justify-between px-4"
          }`}
        >
          {/* ロゴ＝ホームへ戻る。ロゴ(紺色)が背景に溶けないよう白タイルに乗せる。 */}
          <Link href="/" title="ホームへ戻る" className="flex items-center gap-2 rounded-lg hover:bg-white/10">
            <span className="grid flex-none place-items-center rounded-lg bg-white p-1">
              <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} priority />
            </span>
            {!collapsed && (
              <p className="text-heading-sm font-bold text-white">神苑スタッフ</p>
            )}
          </Link>
          <button
            onClick={toggle}
            title={collapsed ? "メニューを開く" : "折りたたむ"}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
          >
            <PanelLeft size={18} />
          </button>
        </div>

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
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/80 hover:bg-white/10"
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
                  <div key={group.label} className="pt-2">
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
                              <Icon
                                size={18}
                                className={active ? "text-white" : "text-white/70"}
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

        <div className="border-t border-white/10 p-3">
          {who && !collapsed && (
            <div className="truncate px-3 pb-2 text-label-sm text-white/60" title={who}>
              {who}
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "ログアウト" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-white/80 hover:bg-white/10 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={20} className="text-white/70" />
            {!collapsed && "ログアウト"}
          </button>
        </div>
      </aside>

      {/* スマホ用の上部バー（サイドバーが無いため、紺色バー＋役割名で立場を示す）。 */}
      <div className="flex-1">
        <header
          className={`sticky top-0 z-20 flex h-14 items-center gap-3 px-4 text-white md:hidden ${SIDEBAR_BG}`}
        >
          <Link href="/" className="flex items-center gap-2" title="ホームへ戻る">
            <span className="grid flex-none place-items-center rounded-lg bg-white p-1">
              <Image src="/mark.png" alt="神慈秀明会" width={24} height={24} />
            </span>
          </Link>
          <span className="text-heading-sm font-bold">{roleLabels[role]}</span>
          {who && (
            <span className="ml-auto truncate text-label-sm text-white/80" title={who}>
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
