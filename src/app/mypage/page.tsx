import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Archive,
  ChevronRight,
  CalendarPlus,
  CreditCard,
  FileText,
  UserCog,
  Settings,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { yen, jpDate } from "@/lib/format";
import { getMyProfile, getMyParticipations } from "@/lib/queries/me";
import { getBranches } from "@/lib/queries/branches";
import { getPublishedAnnouncements } from "@/lib/queries/announcements";
import { getCurrentUser } from "@/lib/supabase/server";
import { QrCard } from "./QrCard";

export default async function MyPage() {
  const [profile, participations, branches, announcements] = await Promise.all([
    getMyProfile(),
    getMyParticipations(),
    getBranches(),
    getPublishedAnnouncements(),
  ]);

  const branchName = branches.find((b) => b.id === profile?.branch_id)?.name ?? "—";
  const heroImage = profile?.hero_image_url || "/syuugou.jpeg";
  const today = new Date().toISOString().slice(0, 10);

  // 申込中・参加予定（取消以外）。開催日順。
  const active = participations
    .filter((p) => p.status !== "cancelled")
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));

  // 参加ステータス集計
  const stats = {
    confirmed: participations.filter((p) => p.status === "confirmed").length,
    applying: participations.filter((p) => p.status === "applying").length,
    paid: participations.filter((p) => p.status === "paid").length,
    cancelled: participations.filter((p) => p.status === "cancelled").length,
  };
  const unpaidTotal = participations
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);

  // 直近の参加予定イベント（QRカードのカウントダウン用）
  const nextEvent = active.find((p) => (p.eventDate ?? "") >= today) ?? active[0] ?? null;
  const daysLeft = nextEvent?.eventDate
    ? Math.max(
        0,
        Math.round((new Date(nextEvent.eventDate).getTime() - new Date(today).getTime()) / 86400000),
      )
    : null;

  const isRecent = (iso: string) =>
    (new Date().getTime() - new Date(iso).getTime()) / 86400000 <= 7;

  const statTiles = [
    { key: "confirmed", label: "確定", value: stats.confirmed, icon: CheckCircle2, tone: "text-info-900 bg-info-100" },
    { key: "applying", label: "申込中", value: stats.applying, icon: Clock, tone: "text-warning-900 bg-warning-100" },
    { key: "paid", label: "完了", value: stats.paid, icon: ClipboardCheck, tone: "text-success-900 bg-success-100" },
    { key: "cancelled", label: "キャンセル", value: stats.cancelled, icon: Archive, tone: "text-neutral-500 bg-neutral-100" },
  ];

  const quickActions = [
    { href: "/events", label: "イベントに申し込む", icon: CalendarPlus },
    { href: "/payment", label: "決済状況を確認", icon: CreditCard },
    { href: "/mypage/history", label: "申込履歴を見る", icon: FileText },
    { href: "/mypage/profile", label: "プロフィール編集", icon: UserCog },
  ];

  return (
    <AppShell role="participant">
      <PageHeader title="マイページ" description={`${profile?.name ?? ""} さん（${branchName}）`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ヒーロー */}
        <section className="relative min-h-[220px] overflow-hidden rounded-2xl lg:col-span-7">
          {/* 本人がアップロードした画像（外部URL）と既定画像の両対応のため img を使用 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/85 via-neutral-900/45 to-neutral-900/15" />
          <div className="relative flex h-full min-h-[220px] flex-col justify-end gap-3 p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-full ring-2 ring-neutral-white/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="" className="h-full w-full object-cover" />
              </span>
              <div>
                <p className="text-heading-lg font-bold text-neutral-white">
                  こんにちは、{profile?.name ?? ""} さん
                </p>
                <p className="text-body-sm text-neutral-white/85">
                  神苑スタッフとしての活動をサポートします。
                </p>
              </div>
            </div>
            <Link
              href="/mypage/profile"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-900/55 px-4 py-2 text-body-sm text-neutral-white ring-1 ring-neutral-white/30 backdrop-blur transition-colors hover:bg-neutral-900/70"
            >
              <Settings size={16} /> プロフィールを編集
            </Link>
          </div>
        </section>

        {/* 受付用QR */}
        <div className="lg:col-span-5">
          <QrCard
            token={profile?.checkin_token ?? "no-token"}
            daysLeft={daysLeft}
            dateLabel={nextEvent?.eventDate ? jpDate(nextEvent.eventDate) : null}
            venue={nextEvent?.venue ?? null}
          />
        </div>

        {/* クイックアクション（写真の下） */}
        <section className="rounded-2xl border border-neutral-200 bg-neutral-white p-5 shadow-sm lg:col-span-12">
          <h2 className="mb-4 text-heading-sm text-neutral-900">クイックアクション</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md active:translate-y-0 active:shadow-sm"
              >
                <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary-50 text-primary-900 transition-colors group-hover:bg-primary-100">
                  <a.icon size={20} />
                </span>
                <span className="text-body-md font-medium text-neutral-900">{a.label}</span>
                <ChevronRight
                  size={18}
                  className="ml-auto flex-none text-neutral-300 transition-colors group-hover:text-primary-700"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* 参加ステータス */}
        <section className="rounded-2xl border border-neutral-200 bg-neutral-white p-5 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-heading-sm text-neutral-900">あなたの参加ステータス</h2>
            <Badge variant="neutral">累計</Badge>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {statTiles.map((s) => (
              <div key={s.key} className="flex flex-col items-center gap-1.5 text-center">
                <span className={`grid h-11 w-11 place-items-center rounded-full ${s.tone}`}>
                  <s.icon size={20} />
                </span>
                <span className="text-heading-lg leading-none text-neutral-900">{s.value}</span>
                <span className="text-label-sm text-neutral-600">{s.label}</span>
              </div>
            ))}
          </div>
          <Link
            href="/mypage/history"
            className="mt-4 inline-flex items-center gap-1 text-body-sm font-medium text-primary-900 hover:underline"
          >
            申込履歴をすべて見る <ChevronRight size={15} />
          </Link>
        </section>

        {/* お知らせ */}
        <section className="rounded-2xl border border-neutral-200 bg-neutral-white p-5 shadow-sm lg:col-span-7">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-heading-sm text-neutral-900">神苑からのお知らせ</h2>
            <Link href="/" className="text-body-sm text-primary-900 hover:underline">
              すべて見る
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="py-6 text-center text-body-md text-neutral-600">お知らせはありません。</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-body-md text-neutral-900">
                      {isRecent(a.published_at) && <Badge variant="error">NEW</Badge>}
                      <span className="truncate">{a.title}</span>
                    </p>
                    <p className="mt-0.5 truncate text-body-sm text-neutral-600">{a.body}</p>
                    <p className="mt-0.5 text-label-sm text-neutral-500">{jpDate(a.published_at)}</p>
                  </div>
                  <ChevronRight size={16} className="mt-1 flex-none text-neutral-300" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 申込中・参加予定のイベント */}
        <section className="rounded-2xl border border-neutral-200 bg-neutral-white p-5 shadow-sm lg:col-span-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-heading-sm text-neutral-900">申込中・参加予定のイベント</h2>
            <Link href="/events" className="inline-flex items-center gap-1 text-body-sm text-primary-900 hover:underline">
              すべてのイベントを見る <ChevronRight size={15} />
            </Link>
          </div>

          {unpaidTotal > 0 && (
            <div className="mb-4">
              <Alert variant="warning">
                未決済の参加費が {yen(unpaidTotal)} あります。確定済みのイベントはまとめて1回で決済できます。
              </Alert>
            </div>
          )}

          {active.length === 0 ? (
            <p className="py-8 text-center text-body-md text-neutral-600">
              申込中・参加予定のイベントはありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {active.map((p) => (
                <div key={p.participantId} className="flex gap-3 rounded-xl border border-neutral-200 p-3">
                  <div className="flex-none overflow-hidden rounded-lg">
                    <Image src="/syuugou.jpeg" alt="" width={72} height={72} className="h-[72px] w-[72px] object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-label-sm text-neutral-500">
                        {p.eventDate ? jpDate(p.eventDate) : ""}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="truncate text-body-md font-medium text-neutral-900">{p.eventName}</p>
                    {p.venue && (
                      <p className="flex items-center gap-1 truncate text-body-sm text-neutral-600">
                        <MapPin size={13} className="flex-none text-neutral-400" /> {p.venue}
                      </p>
                    )}
                    <p className="mt-1 text-body-sm text-neutral-700">参加費 {yen(p.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unpaidTotal > 0 && (
            <div className="mt-4">
              <ButtonLink href="/payment" size="lg">
                確定分をまとめて決済（{yen(unpaidTotal)}）
              </ButtonLink>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
