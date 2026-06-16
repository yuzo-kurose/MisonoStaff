import Link from "next/link";
import Image from "next/image";
import {
  QrCode,
  ClipboardList,
  CreditCard,
  Megaphone,
  User,
  Users,
  Settings2,
  Check,
  type LucideIcon,
} from "lucide-react";
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

// 役割別の使い方（トップ画面で立場ごとの使い方を案内）。色はサイドバーの役割色に対応。
const roleGuides: {
  icon: LucideIcon;
  tone: string;
  role: string;
  summary: string;
  actions: string[];
}[] = [
  {
    icon: User,
    tone: "bg-primary-100 text-primary-900",
    role: "参加者",
    summary: "スタッフ本人。スマホで申込・決済し、当日はQRを見せるだけ。",
    actions: [
      "イベントを選んで参加申込",
      "確定後にカードで事前決済",
      "マイページのQRを当日受付で提示",
    ],
  },
  {
    icon: Users,
    tone: "bg-success-100 text-success-900",
    role: "代表者",
    summary: "拠点の取りまとめ役。メンバーの申込を確認・確定します。",
    actions: [
      "名簿でメンバーの申込を確認・確定",
      "代行入力で本人に代わって申込",
      "拠点の決済状況を確認",
    ],
  },
  {
    icon: QrCode,
    tone: "bg-warning-100 text-warning-900",
    role: "受付",
    summary: "当日の受付担当。QRを読み取って素早く受付します。",
    actions: [
      "参加者のQRを読み取り対象者を呼び出し",
      "当日参加する複数イベントをまとめて受付",
      "氏名検索でも呼び出し可能",
    ],
  },
  {
    icon: Settings2,
    tone: "bg-neutral-900 text-neutral-white",
    role: "管理者",
    summary: "システム全体の運営。イベントやマスタを管理します。",
    actions: [
      "イベント作成・公開、申込フォーム設定",
      "拠点・部署マスタの管理",
      "連絡事項の配信・申込一覧の把握",
    ],
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

          {/* 役割別の使い方 */}
          <section className="mx-auto max-w-5xl px-4 pb-10 md:px-8 md:pb-12">
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-1.5 rounded-full bg-primary-700" />
              <h2 className="text-heading-md text-neutral-900">役割別の使い方</h2>
            </div>
            <p className="mt-1 text-body-sm text-neutral-600">
              立場によってできることが異なります。あなたの役割をご確認ください。
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {roleGuides.map(({ icon: RoleIcon, tone, role, summary, actions }) => (
                <div
                  key={role}
                  className="rounded-xl border border-neutral-200 bg-neutral-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 flex-none place-items-center rounded-lg ${tone}`}>
                      <RoleIcon size={22} />
                    </span>
                    <div>
                      <p className="text-heading-sm text-neutral-900">{role}</p>
                      <p className="text-body-sm text-neutral-600">{summary}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {actions.map((a) => (
                      <li key={a} className="flex gap-2 text-body-sm text-neutral-700">
                        <Check size={16} className="mt-1 flex-none text-primary-700" />
                        <span>{a}</span>
                      </li>
                    ))}
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
