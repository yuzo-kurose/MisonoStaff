"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeft, ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { navByRole, navGroupsByRole, type Role } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

const COLLAPSE_KEY = "sidebar-collapsed";

/**
 * 役割ごとの色分け。立場の判別は「サイドバー（メニュー）の色」で行う。
 * 4役割をはっきり違う色相に割り当てる（藍＝参加者／深緑＝代表者／黒＝管理者／金＝受付）。
 * - sidebar : サイドバー背景色（白文字で WCAG AA を満たす濃色）。スマホの上部バーにも流用。
 * 文字・アイコン・選択状態は半透明白（white/xx）で表現するため、どの役割色でも破綻しない。
 */
const roleTheme: Record<Role, { label: string; sidebar: string }> = {
  participant: { label: "参加者", sidebar: "bg-primary-900" }, // 藍
  representative: { label: "代表者", sidebar: "bg-[#14532D]" }, // 深緑
  admin: { label: "管理者", sidebar: "bg-neutral-900" }, // 黒
  reception: { label: "受付", sidebar: "bg-[#5A4508]" }, // 深い金
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
      {/* サイドバー（PC）：役割カラーを縦の柱に。色＋最上部の役割名で立場を判別する。 */}
      <aside
        className={`hidden flex-none flex-col border-r border-white/10 text-white md:flex ${
          roleTheme[role].sidebar
        } ${collapsed ? "w-16" : "w-60"}`}
      >
        <div
          className={`border-b border-white/10 ${
            collapsed
              ? "flex flex-col items-center gap-1 px-2 py-2"
              : "flex h-16 items-center justify-between px-4"
          }`}
        >
          {/* ロゴ＝ホームへ戻る。役割名をメニュー最上部に明記する。 */}
          <Link href="/" title="ホームへ戻る" className="flex items-center gap-2 rounded-lg hover:bg-white/10">
            <Image src="/mark.png" alt="神慈秀明会" width={32} height={32} className="flex-none" priority />
            {!collapsed && (
              <div className="leading-tight">
                <p className="text-label-sm text-white/70">神苑スタッフ</p>
                <p className="text-heading-sm font-bold text-white">{roleTheme[role].label}</p>
              </div>
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
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-label-sm font-medium text-white/50 transition-colors hover:text-white/90"
                    >
                      <GroupIcon size={16} className="flex-none text-white/50" />
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

      {/* スマホ用の上部バー（サイドバーが無いため、役割カラー＋役割名で立場を示す）。
          PCはサイドバーが役割色と役割名を担うので上部ヘッダーは置かない。 */}
      <div className="flex-1">
        <header
          className={`sticky top-0 z-20 flex h-14 items-center gap-3 px-4 text-white md:hidden ${roleTheme[role].sidebar}`}
        >
          <Link href="/" className="flex items-center gap-2" title="ホームへ戻る">
            <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} />
          </Link>
          <span className="text-heading-sm font-bold">{roleTheme[role].label}</span>
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
