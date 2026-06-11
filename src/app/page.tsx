import Link from "next/link";
import Image from "next/image";
import { QrCode, ClipboardList, CreditCard, Megaphone, type LucideIcon } from "lucide-react";
import { PublicSidebar } from "@/components/layout/PublicSidebar";
import { HomeUserMenu } from "@/components/layout/HomeUserMenu";
import { jpDate } from "@/lib/format";
import { getPublishedAnnouncements } from "@/lib/queries/announcements";
import type { AnnouncementLevel } from "@/types/database";

const levelMeta: Record<AnnouncementLevel, { label: string; tone: string }> = {
  important: { label: "重要", tone: "bg-error-100 text-error-900" },
  info: { label: "お知らせ", tone: "bg-info-100 text-info-900" },
};

const flowSteps: { icon: LucideIcon; tone: string; title: string; desc: string }[] = [
  {
    icon: ClipboardList,
    tone: "bg-primary-50 text-primary-900",
    title: "1. 参加申込",
    desc: "スマホから所属・参加イベントを選んで申込。代表者が拠点分をまとめて確定します。",
  },
  {
    icon: CreditCard,
    tone: "bg-info-100 text-info-900",
    title: "2. 事前決済",
    desc: "確定後、カードで事前にお支払い。複数イベントもまとめて1回で決済できます。",
  },
  {
    icon: QrCode,
    tone: "bg-success-100 text-success-900",
    title: "3. 当日受付",
    desc: "マイページのQRを当日かざすだけ。参加する全イベントが一度に受付されます。",
  },
];

export default async function Home_() {
  const announcements = await getPublishedAnnouncements();
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

            <div className="mx-auto flex min-h-[200px] max-w-5xl flex-col justify-end gap-5 px-4 py-6 md:min-h-[260px] md:px-8 md:py-8">
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
            </div>
          </section>

          {/* 連絡事項 */}
          <section className="mx-auto max-w-5xl px-4 pt-10 md:px-8 md:pt-12">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary-900">
                <Megaphone size={18} />
              </span>
              <h2 className="text-heading-md text-neutral-900">連絡事項</h2>
            </div>
            {announcements.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-white py-8 text-center text-body-sm text-neutral-500">
                現在お知らせはありません。
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-neutral-200 border-l-4 border-l-primary-700 bg-neutral-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-medium ${levelMeta[a.level].tone}`}>
                        {levelMeta[a.level].label}
                      </span>
                      <time className="text-label-sm text-neutral-500">{jpDate(a.published_at)}</time>
                    </div>
                    <p className="mt-2 text-heading-sm text-neutral-900">{a.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-body-sm text-neutral-600">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ご利用の流れ */}
          <section className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-12">
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-1.5 rounded-full bg-primary-700" />
              <h2 className="text-heading-md text-neutral-900">ご利用の流れ</h2>
            </div>
            <p className="mt-1 text-body-sm text-neutral-600">
              申込から当日受付まで、3ステップで完結します。
            </p>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {flowSteps.map(({ icon: StepIcon, tone, title, desc }, i) => (
                <li
                  key={title}
                  className="relative rounded-xl border border-neutral-200 bg-neutral-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="absolute right-4 top-4 text-heading-lg font-bold text-neutral-100">
                    {i + 1}
                  </span>
                  <span className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}>
                    <StepIcon size={22} />
                  </span>
                  <p className="mt-4 text-heading-sm text-neutral-900">{title}</p>
                  <p className="mt-1.5 text-body-sm text-neutral-600">{desc}</p>
                </li>
              ))}
            </ol>
          </section>

          <footer className="border-t border-neutral-200 py-8 text-center text-body-sm text-neutral-600">
            神苑スタッフ 参加管理システム
          </footer>
        </main>
      </div>
    </div>
  );
}
