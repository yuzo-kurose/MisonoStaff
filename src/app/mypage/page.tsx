import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { QrPlaceholder } from "@/components/QrPlaceholder";
import { yen, jpDate } from "@/lib/format";
import { getMyProfile, getMyParticipations } from "@/lib/queries/me";
import { getBranches } from "@/lib/queries/branches";

export default async function MyPage() {
  const [profile, participations, branches] = await Promise.all([
    getMyProfile(),
    getMyParticipations(),
    getBranches(),
  ]);

  const branchName = branches.find((b) => b.id === profile?.branch_id)?.name ?? "—";
  const unpaidTotal = participations
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell role="participant">
      <PageHeader
        title="マイページ"
        description={`${profile?.name ?? ""} さん（${branchName}）`}
      />

      <div className="grid gap-6 md:grid-cols-[auto,1fr]">
        <Card className="flex flex-col items-center">
          <CardTitle>当日受付</CardTitle>
          <p className="mb-3 mt-1 text-center text-body-sm text-neutral-700">
            このQRを受付で提示すると、
            <br />
            当日参加する全イベントが一度に受付されます。
          </p>
          <QrPlaceholder token={profile?.checkin_token ?? "no-token"} />
        </Card>

        <div className="space-y-4">
          {unpaidTotal > 0 && (
            <Alert variant="warning">
              未決済の参加費が {yen(unpaidTotal)} あります。確定済みのイベントは
              まとめて1回で決済できます。
            </Alert>
          )}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>申込中・参加予定</CardTitle>
              <ButtonLink href="/events" variant="ghost">
                ＋ 新しく申し込む
              </ButtonLink>
            </div>

            {participations.length === 0 ? (
              <p className="py-6 text-center text-body-md text-neutral-600">
                まだ申込がありません。
                <br />
                「＋ 新しく申し込む」からイベントに申し込めます。
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {participations.map((p) => (
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
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
