import Link from "next/link";
import Image from "next/image";
import { QrCode, ClipboardList, Home, Calendar, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PublicSidebar } from "@/components/layout/PublicSidebar";
import { HomeUserMenu } from "@/components/layout/HomeUserMenu";
import { navByRole, roleLabels, type Role } from "@/lib/nav";

const roleGroups: { role: Role; icon: LucideIcon; tone: string }[] = [
  { role: "participant", icon: Home, tone: "bg-primary-50 text-primary-900" },
  { role: "representative", icon: ClipboardList, tone: "bg-info-100 text-info-900" },
  { role: "admin", icon: Calendar, tone: "bg-success-100 text-success-900" },
  { role: "reception", icon: QrCode, tone: "bg-warning-100 text-warning-900" },
];

export default function Home_() {
  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      {/* 左サイドバー（PC・折りたたみ可） */}
      <PublicSidebar />

      {/* メイン */}
      <div className="relative flex-1">
        {/* ログインユーザーアイコン（PC：右上に重ねて表示） */}
        <div className="absolute right-4 top-4 z-20 hidden md:block">
          <HomeUserMenu showLoginWhenAnon={false} />
        </div>

        {/* モバイル用ヘッダー */}
        <header className="flex h-14 items-center gap-2 border-b border-neutral-200 bg-neutral-white px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2" title="トップへ">
            <Image src="/mark.png" alt="神慈秀明会" width={28} height={28} />
            <span className="text-label-md font-medium text-neutral-900">神苑スタッフ</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <HomeUserMenu />
          </div>
        </header>

        <main>
          {/* ヒーロー */}
          <section className="relative isolate overflow-hidden border-b border-neutral-200">
            <Image
              src="/syuugou.jpeg"
              alt="神苑スタッフ 集合写真"
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover object-center"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-900/90 via-neutral-900/60 to-neutral-900/40" />

            <div className="mx-auto flex min-h-[200px] max-w-5xl flex-col justify-end gap-5 px-4 py-6 md:min-h-[260px] md:flex-row md:items-end md:justify-between md:px-8 md:py-8">
              <div>
                <p className="text-label-md font-medium text-primary-100">
                  神苑スタッフ 参加管理システム
                </p>
                <h1 className="mt-2 max-w-2xl text-display-sm text-neutral-white">
                  申込・事前決済・当日受付を、
                  <br />
                  ひとつのシステムで。
                </h1>
                <p className="mt-3 max-w-xl text-body-md text-neutral-100">
                  スマホから参加申込・決済。運営は当日受付まで漏れなく管理できます。
                </p>
              </div>
              <div className="flex flex-none gap-3">
                <ButtonLink href="/signup" size="lg">
                  はじめる
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" size="lg">
                  ログイン
                </ButtonLink>
              </div>
            </div>
          </section>

          {/* 役割で開く（デモ） */}
          <section className="mx-auto max-w-5xl px-4 py-8 md:px-8">
            <h2 className="text-heading-md text-neutral-900">役割で開く（デモ）</h2>
            <p className="mt-1 text-body-sm text-neutral-600">
              ※ 認証実装前の画面確認用。各役割の主要画面に直接遷移します。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roleGroups.map(({ role, icon: RoleIcon, tone }) => (
                <div
                  key={role}
                  className="rounded-xl border border-neutral-200 bg-neutral-white p-4 shadow-sm"
                >
                  <p className="flex items-center gap-2 text-heading-sm text-neutral-900">
                    <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${tone}`}>
                      <RoleIcon size={18} />
                    </span>
                    {roleLabels[role]}メニュー
                  </p>
                  <ul className="mt-3 space-y-1">
                    {navByRole[role].map((it) => {
                      const Icon = it.icon;
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-body-sm text-neutral-700 hover:bg-neutral-100 hover:text-primary-900"
                          >
                            <Icon size={16} className="text-neutral-500" />
                            {it.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <footer className="border-t border-neutral-200 py-8 text-center text-body-sm text-neutral-600">
            神苑スタッフ 参加管理システム
          </footer>
        </main>
      </div>
    </div>
  );
}
