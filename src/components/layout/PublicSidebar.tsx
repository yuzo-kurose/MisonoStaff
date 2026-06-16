"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  LogIn,
  LogOut,
  UserPlus,
  ClipboardList,
  Calendar,
  QrCode,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

const COLLAPSE_KEY = "sidebar-collapsed";

const roleLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/mypage", label: "参加者", icon: Home },
  { href: "/rep/roster", label: "代表者", icon: ClipboardList },
  { href: "/admin/events", label: "管理者", icon: Calendar },
  { href: "/reception", label: "受付", icon: QrCode },
];

/** トップページ用の左メニュー。紺色で統一（アプリ内サイドバーと同色）。折りたたみ可。 */
export function PublicSidebar() {
  const router = useRouter();
  const { who, authed } = useAuthUser();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  // ログイン中はログイン／新規登録を出さない
  const menu: { href: string; label: string; icon: LucideIcon }[] = [
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

  const link = (m: { href: string; label: string; icon: LucideIcon }) => {
    const Icon = m.icon;
    return (
      <Link
        key={m.href + m.label}
        href={m.href}
        title={collapsed ? m.label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-white/80 hover:bg-white/10 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <Icon size={20} className="text-white/70" />
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
      <div
        className={`flex h-12 items-center border-b border-white/10 px-2 ${
          collapsed ? "justify-center" : "justify-end"
        }`}
      >
        <button
          onClick={toggle}
          title={collapsed ? "メニューを開く" : "折りたたむ"}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      {!collapsed && <p className="px-5 pt-3 text-label-sm font-medium text-white/50">メニュー</p>}
      <nav className="space-y-1 p-3">{menu.map(link)}</nav>

      {!collapsed && (
        <p className="px-5 pt-2 text-label-sm font-medium text-white/50">役割で開く（デモ）</p>
      )}
      <nav className="space-y-1 p-3">{roleLinks.map(link)}</nav>

      {authed && (
        <div className="mt-auto border-t border-white/10 p-3">
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
