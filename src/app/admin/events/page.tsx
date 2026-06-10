import Link from "next/link";
import { Calendar, CheckCircle2, Users, Coins } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Table, Th, Td } from "@/components/ui/Table";
import { yen, jpDate, eventPeriod } from "@/lib/format";
import { getAdminEvents, getEventStats } from "@/lib/queries/events";
import { duplicateEvent } from "./actions";

const statusBadge: Record<string, React.ReactNode> = {
  draft: <Badge variant="neutral">下書き</Badge>,
  published: <Badge variant="success">公開中</Badge>,
  closed: <Badge variant="warning">締切</Badge>,
};

export default async function AdminEventsPage() {
  const [events, stats] = await Promise.all([getAdminEvents(), getEventStats()]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="イベント管理"
        description="作成・編集・複製、締切・対象拠点・フォーム・定員を設定します。"
        action={
          <Link href="/admin/events/new">
            <Button>＋ イベントを作成</Button>
          </Link>
        }
      />

      <StatGrid>
        <StatCard icon={Calendar} label="イベント数" value={stats.eventCount} variant="primary" />
        <StatCard icon={CheckCircle2} label="公開中" value={stats.publishedCount} variant="success" />
        <StatCard icon={Users} label="申込総数" value={stats.participantCount} variant="info" />
        <StatCard icon={Coins} label="売上（支払済）" value={yen(stats.revenue)} variant="warning" />
      </StatGrid>

      <Table
        head={
          <tr>
            <Th>イベント名</Th>
            <Th>開催期間</Th>
            <Th>締切</Th>
            <Th>定員</Th>
            <Th>フォーム</Th>
            <Th>状態</Th>
            <Th>操作</Th>
          </tr>
        }
      >
        {events.map((e) => (
          <tr key={e.id}>
            <Td>{e.name}</Td>
            <Td>{eventPeriod(e.start_date, e.event_date)}</Td>
            <Td>{jpDate(e.application_deadline)}</Td>
            <Td>{e.capacity ?? "—"}</Td>
            <Td>
              <Link href={`/admin/forms/${e.id}`}>
                <Button variant="ghost" size="md">
                  {e.fieldCount}項目 編集
                </Button>
              </Link>
            </Td>
            <Td>{statusBadge[e.status]}</Td>
            <Td>
              <div className="flex gap-2">
                <Link href={`/admin/events/${e.id}/edit`}>
                  <Button variant="ghost" size="md">
                    編集
                  </Button>
                </Link>
                <form action={duplicateEvent}>
                  <input type="hidden" name="eventId" value={e.id} />
                  <Button type="submit" variant="ghost" size="md">
                    複製
                  </Button>
                </form>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </AppShell>
  );
}
