"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Home, LogIn, LogOut, UserPlus, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { visibleNavGroups } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * トップページ（公開）用のモバイルナビ。ヘッダーのハンバーガーから左スライドのドロワーで
 * クイックリンク（ホーム/ログイン/新規登録）＋「○○メニュー」アコーディオンを全表示する。
 * PCは PublicSidebar が担うので md 未満でのみ表示。
 */
export function PublicMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { who, authed, role } = useAuthUser();
  const groups = visibleNavGroups(role);
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((s) => ({ ...s, [label]: !(s[label] ?? true) }));

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

  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-neutral-900/50" onClick={close} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-primary-900 text-white shadow-xl">
            <div className="flex h-16 flex-none items-center justify-between border-b border-white/10 px-4">
              <span className="text-heading-sm font-bold text-white">メニュー</span>
              <button
                onClick={close}
                aria-label="メニューを閉じる"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {quickLinks.map((m) => {
                const Icon = m.icon;
                const active = isActive(pathname, m.href);
                return (
                  <Link
                    key={m.href + m.label}
                    href={m.href}
                    onClick={close}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-md transition-colors ${
                      active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={20} className={active ? "text-white" : "text-white/70"} />
                    {m.label}
                  </Link>
                );
              })}

              {groups.map((group) => {
                const groupOpen = openGroups[group.label] ?? true;
                const GroupIcon = group.icon;
                return (
                  <div key={group.label} className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={groupOpen}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-label-lg font-bold text-white transition-colors hover:bg-white/10"
                    >
                      <GroupIcon size={18} className="flex-none text-white/80" />
                      <span className="flex-1 text-left">{group.label}</span>
                      <ChevronDown
                        size={16}
                        className={`flex-none transition-transform ${groupOpen ? "" : "-rotate-90"}`}
                      />
                    </button>
                    {groupOpen && (
                      <div className="mt-1 space-y-1">
                        {group.items.map((it) => {
                          const Icon = it.icon;
                          const active = isActive(pathname, it.href);
                          return (
                            <Link
                              key={it.href}
                              href={it.href}
                              onClick={close}
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
                {who && (
                  <div className="truncate px-3 pb-2 text-label-sm text-white/60" title={who}>
                    {who}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-md text-white/80 hover:bg-white/10"
                >
                  <LogOut size={20} className="text-white/70" />
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
