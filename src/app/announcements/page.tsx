import { AppShell } from "@/components/layout/AppShell";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { jpDate } from "@/lib/format";
import { getPublishedAnnouncements } from "@/lib/queries/announcements";

export default async function AnnouncementsPage() {
  const announcements = await getPublishedAnnouncements();
  const isRecent = (iso: string) =>
    (new Date().getTime() - new Date(iso).getTime()) / 86400000 <= 7;

  return (
    <AppShell role="participant">
      <PageHeader title="神苑からのお知らせ" description="運営からの連絡事項を確認できます。" />

      <div className="max-w-3xl">
        <Card>
          {announcements.length === 0 ? (
            <p className="py-6 text-center text-body-md text-neutral-600">お知らせはありません。</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {announcements.map((a) => (
                <li key={a.id} className="py-4">
                  <p className="flex items-center gap-2 text-body-md font-medium text-neutral-900">
                    {isRecent(a.published_at) && <Badge variant="error">NEW</Badge>}
                    {a.title}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-body-sm text-neutral-700">{a.body}</p>
                  <p className="mt-1.5 text-label-sm text-neutral-500">{jpDate(a.published_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
