import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { QrPlaceholder } from "@/components/QrPlaceholder";
import { CalendarClock } from "lucide-react";
import { yen, jpDate } from "@/lib/format";
import { getMyProfile, getMyParticipations, getMyApplicationHistory } from "@/lib/queries/me";
import { getBranches } from "@/lib/queries/branches";
import { getPublishedEvents } from "@/lib/queries/events";
import { getDepartmentNames } from "@/lib/queries/departments";
import { getCurrentUser } from "@/lib/supabase/server";
import { ProfileCard } from "./ProfileCard";
import { ChangePasswordCard } from "./ChangePasswordCard";

export default async function MyPage() {
  const [user, profile, participations, history, branches, events, departmentOptions] =
    await Promise.all([
      getCurrentUser(),
      getMyProfile(),
      getMyParticipations(),
      getMyApplicationHistory(),
      getBranches(),
      getPublishedEvents(),
      getDepartmentNames(),
    ]);

  // 申込中・参加予定は取消を除いた現行のみ。
  const activeParticipations = participations.filter((p) => p.status !== "cancelled");

  const branchName = branches.find((b) => b.id === profile?.branch_id)?.name ?? "—";
  const unpaidTotal = participations
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);

  // 直近の申込締切（今日以降で最も近い公開イベント）
  const today = new Date().toISOString().slice(0, 10);
  const nextDeadline = events
    .filter((e) => e.application_deadline >= today)
    .sort((a, b) => a.application_deadline.localeCompare(b.application_deadline))[0];
  const daysLeft = nextDeadline
    ? Math.round(
        (new Date(nextDeadline.application_deadline).getTime() - new Date(today).getTime()) /
          86400000,
      )
    : null;

  return (
    <AppShell role="participant">
      <PageHeader
        title="マイページ"
        description={`${profile?.name ?? ""} さん（${branchName}）`}
      />

      {nextDeadline && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary-100 text-primary-900">
            <CalendarClock size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-label-sm text-primary-900">直近の申込締切</p>
            <p className="truncate text-body-md text-neutral-900">
              <span className="font-medium">{nextDeadline.name}</span>
              <span className="mx-2 text-neutral-400">/</span>
              {jpDate(nextDeadline.application_deadline)}まで
            </p>
          </div>
          <span
            className={`ml-auto flex-none rounded-full px-3 py-1 text-label-sm font-medium ${
              daysLeft !== null && daysLeft <= 3
                ? "bg-error-100 text-error-900"
                : "bg-neutral-white text-primary-900"
            }`}
          >
            {daysLeft === 0 ? "本日締切" : `あと${daysLeft}日`}
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[auto,1fr]">
        <CollapsibleCard title="当日受付" className="md:self-start">
          <div className="flex flex-col items-center">
            <p className="mb-3 text-center text-body-sm text-neutral-700">
              このQRを受付で提示すると、
              <br />
              当日参加する全イベントが一度に受付されます。
            </p>
            <QrPlaceholder token={profile?.checkin_token ?? "no-token"} />
          </div>
        </CollapsibleCard>

        <div className="space-y-4">
          {unpaidTotal > 0 && (
            <Alert variant="warning">
              未決済の参加費が {yen(unpaidTotal)} あります。確定済みのイベントは
              まとめて1回で決済できます。
            </Alert>
          )}
          <CollapsibleCard title="申込中・参加予定">
            <div className="mb-3 flex justify-end">
              <ButtonLink href="/events" variant="ghost">
                ＋ 新しく申し込む
              </ButtonLink>
            </div>

            {activeParticipations.length === 0 ? (
              <p className="py-6 text-center text-body-md text-neutral-600">
                まだ申込がありません。
                <br />
                「＋ 新しく申し込む」からイベントに申し込めます。
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {activeParticipations.map((p) => (
                  <li
                    key={p.participantId}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-body-md text-neutral-900">{p.eventName}</p>
                      <p className="text-body-sm text-neutral-600">
                        {p.eventDate ? jpDate(p.eventDate) : ""} / {yen(p.amount)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}

            {unpaidTotal > 0 && (
              <div className="mt-4">
                <ButtonLink href="/payment" fullWidth size="lg">
                  確定分をまとめて決済（{yen(unpaidTotal)}）
                </ButtonLink>
              </div>
            )}
          </CollapsibleCard>

          <CollapsibleCard title="申込履歴">
            <p className="mb-3 text-body-sm text-neutral-600">
              過去の申込（取消分を含む）を確認できます。
            </p>
            {history.length === 0 ? (
              <p className="py-4 text-center text-body-md text-neutral-600">
                申込履歴はまだありません。
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {history.map((h) => (
                  <li key={h.participantId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-neutral-900">{h.eventName}</p>
                      <p className="text-body-sm text-neutral-600">
                        {h.eventDate ? jpDate(h.eventDate) : ""}
                        <span className="mx-1.5 text-neutral-300">/</span>
                        {yen(h.amount)}
                        {h.status === "cancelled" && h.cancelledAt && (
                          <>
                            <span className="mx-1.5 text-neutral-300">/</span>
                            {jpDate(h.cancelledAt)} 取消
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleCard>

          <ProfileCard
            name={profile?.name ?? ""}
            division={profile?.division ?? ""}
            department={profile?.department ?? ""}
            departmentOptions={departmentOptions}
            branchName={branchName}
            email={user?.email ?? "—"}
          />

          <ChangePasswordCard email={user?.email ?? ""} />
        </div>
      </div>
    </AppShell>
  );
}
