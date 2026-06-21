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
import { PublicMobileNav } from "@/components/layout/PublicMobileNav";
import { Card } from "@/components/ui/Card";
import { jpDate } from "@/lib/format";
import { getPublishedAnnouncements } from "@/lib/queries/announcements";
import type { AnnouncementLevel } from "@/types/database";

const levelMeta: Record<AnnouncementLevel, { label: string; tone: string }> = {
  important: { label: "重要", tone: "bg-error-100 text-error-900" },
  info: { label: "お知らせ", tone: "bg-info-100 text-info-900" },
};

// 利用の流れ（時系列タイムライン）。各段階に「担当する役割」を添える。
const timelineSteps: {
  icon: LucideIcon;
  title: string;
  role: string;
  roleTone: string;
  desc: string;
}[] = [
  {
    icon: Settings2,
    title: "イベント公開",
    role: "管理者",
    roleTone: "bg-neutral-900 text-neutral-white",
    desc: "管理者がイベントを作成し、申込フォームを設定して公開します。",
  },
  {
    icon: ClipboardList,
    title: "参加申込",
    role: "参加者",
    roleTone: "bg-primary-100 text-primary-900",
    desc: "スマホから所属・参加するイベントを選んで申し込みます。",
  },
  {
    icon: Users,
    title: "名簿・確定",
    role: "代表者",
    roleTone: "bg-success-100 text-success-900",
    desc: "代表者が拠点メンバーの申込を取りまとめ、参加を確定します。",
  },
  {
    icon: CreditCard,
    title: "事前決済",
    role: "参加者",
    roleTone: "bg-primary-100 text-primary-900",
    desc: "確定後、カードで事前にお支払い。複数イベントも1回でまとめて決済できます。",
  },
  {
    icon: QrCode,
    title: "当日受付",
    role: "受付",
    roleTone: "bg-warning-100 text-warning-900",
    desc: "当日はマイページのQRをかざすだけ。参加する全イベントが一度に受付されます。",
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
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* 全幅トップヘッダー（白）。アプリ画面と同様、中央にブランド・右端にロゴ。 */}
      <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-2 border-b border-neutral-200 bg-neutral-white px-3 md:px-4">
        {/* モバイル：ドロワーを開くハンバーガー */}
        <PublicMobileNav />
        {/* 左：ロゴ＋ブランド＝ホームへ戻る */}
        <Link href="/" title="ホームへ戻る" className="flex items-center gap-2 rounded-lg p-1 hover:bg-neutral-100">
          <Image src="/mark.png" alt="神慈秀明会" width={36} height={36} className="flex-none" priority />
          <span className="text-heading-md font-bold text-neutral-900 sm:text-heading-lg">神苑スタッフ</span>
        </Link>

        {/* 右：アカウント（ログイン／ユーザーアイコン） */}
        <div className="ml-auto flex items-center gap-2">
          <HomeUserMenu />
        </div>
      </header>

      {/* ヘッダー下：サイドバー＋メイン */}
      <div className="flex flex-1">
        <PublicSidebar />

        <main className="min-w-0 flex-1">
          {/* 連絡事項＋ご利用の流れ：PCは2列 */}
          <div className="mx-auto max-w-5xl space-y-6 px-4 pt-10 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0 md:px-8 md:pt-12">
          {/* 連絡事項 */}
          <Card>
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
                    className="rounded-lg border border-neutral-200 border-l-4 border-l-primary-700 p-4"
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
          </Card>

          {/* ご利用の流れ（時系列タイムライン） */}
          <Card>
            <div className="flex items-center gap-2.5">
              <span className="h-6 w-1.5 rounded-full bg-primary-700" />
              <h2 className="text-heading-md text-neutral-900">ご利用の流れ</h2>
            </div>
            <p className="mt-1 text-body-sm text-neutral-600">
              申込から当日受付まで、時間の流れに沿って進みます。
            </p>
            <ol className="mt-6">
              {timelineSteps.map(({ icon: StepIcon, title, role, roleTone, desc }, i) => {
                const last = i === timelineSteps.length - 1;
                return (
                  <li key={title} className="relative flex gap-4 pb-8 last:pb-0">
                    {/* 段階をつなぐ縦線（最後の段階には引かない） */}
                    {!last && (
                      <span
                        aria-hidden
                        className="absolute left-[22px] top-11 h-[calc(100%-2.75rem)] w-px bg-neutral-200"
                      />
                    )}
                    {/* ノード（アイコン） */}
                    <span className="relative z-10 grid h-11 w-11 flex-none place-items-center rounded-full bg-primary-700 text-neutral-white shadow-sm">
                      <StepIcon size={20} />
                    </span>
                    {/* 内容 */}
                    <div className="pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-label-sm font-medium text-neutral-500">
                          STEP {i + 1}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-label-sm font-medium ${roleTone}`}>
                          {role}
                        </span>
                      </div>
                      <p className="mt-1 text-heading-sm text-neutral-900">{title}</p>
                      <p className="mt-1 text-body-sm text-neutral-600">{desc}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
          </div>

          {/* 役割別の使い方＝カードでまとめる */}
          <section className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-12">
            <Card>
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
                  className="rounded-lg border border-neutral-200 p-4"
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
            </Card>
          </section>

          <footer className="border-t border-neutral-200 py-8 text-center text-body-sm text-neutral-600">
            神苑スタッフ 参加管理システム
          </footer>
        </main>
      </div>
    </div>
  );
}
