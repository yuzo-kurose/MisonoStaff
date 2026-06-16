"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LogIn, LogOut, UserPlus, PanelLeft, ChevronDown, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { allNavGroups, allNavItems } from "@/lib/nav";

const COLLAPSE_KEY = "sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * トップページ用の左メニュー。紺色で統一。折りたたみ可。
 * メニューは役割でフィルタせず、全ユーザー・全画面で全メニュー（4グループ）を表示する。
 */
export function PublicSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { who, authed } = useAuthUser();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allNavGroups.map((g) => [g.label, true])),
  );

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleGroup = (label: string) =>
    setOpenGroups((s) => ({ ...s, [label]: !(s[label] ?? true) }));

  // ログイン中はログイン／新規登録を出さない
  const quickLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: "ホーム", icon: Home },
    ...(authed
      ? []
      : [
          { href: "/login", label: "ログイン", icon: LogIn },
          { href: "/signup", label: "新規登録", icon: UserPlus },
        ]),
  ];

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });

  const flatLink = (m: { href: string; label: string; icon: LucideIcon }) => {
    const Icon = m.icon;
    const active = isActive(pathname, m.href);
    return (
      <Link
        key={m.href + m.label}
        href={m.href}
        title={collapsed ? m.label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors ${
          collapsed ? "justify-center" : ""
        } ${active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"}`}
      >
        <Icon size={20} className={active ? "text-white" : "text-white/70"} />
        {!collapsed && m.label}
      </Link>
    );
  };

  return (
    <aside
      className={`hidden flex-none flex-col border-r border-white/10 bg-primary-900 text-white md:sticky md:top-16 md:flex md:h-[calc(100vh-4rem)] ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* ブランド／ロゴはトップヘッダーが担うので、ここは折りたたみトグルのみ。 */}
      <div className={`flex h-12 items-center border-b border-white/10 px-2 ${collapsed ? "justify-center" : "justify-end"}`}>
        <button
          onClick={toggle}
          title={collapsed ? "メニューを開く" : "折りたたむ"}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* クイックリンク（ホーム・ログイン等） */}
        {quickLinks.map(flatLink)}

        {collapsed
          ? /* 折りたたみ時：全項目をアイコンのみで平坦表示 */
            allNavItems.map((it) => {
              const Icon = it.icon;
              const active = isActive(pathname, it.href);
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
          : /* 展開時：「○○メニュー」グループ → 子項目（アコーディオン） */
            allNavGroups.map((group) => {
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
                    <ChevronDown size={16} className={`flex-none transition-transform ${open ? "" : "-rotate-90"}`} />
                  </button>
                  {open && (
                    <div className="mt-1 space-y-1">
                      {group.items.map((it) => {
                        const Icon = it.icon;
                        const active = isActive(pathname, it.href);
                        return (
                          <Link
                            key={it.href}
                            href={it.href}
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
            })}
      </nav>

      {authed && (
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
      )}
    </aside>
  );
}
