import Link from "next/link";
import { Calendar, CheckCircle2, Users, Coins } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard, StatGrid } from "@/components/ui/StatCard";
import { Table, Th, Td } from "@/components/ui/Table";
import { yen, jpDate, eventPeriod } from "@/lib/format";
import { getAdminEvents, getDeletedEvents, getEventStats } from "@/lib/queries/events";
import { EventRowActions } from "./EventRowActions";
import { RestoreEventButton } from "./RestoreEventButton";

const statusBadge: Record<string, React.ReactNode> = {
  draft: <Badge variant="neutral">下書き</Badge>,
  published: <Badge variant="success">公開中</Badge>,
  closed: <Badge variant="warning">締切</Badge>,
};

export default async function AdminEventsPage() {
  const [events, deletedEvents, stats] = await Promise.all([
    getAdminEvents(),
    getDeletedEvents(),
    getEventStats(),
  ]);

  return (
    <AppShell role="admin">
      <PageHeader
        title="イベント管理"
        description="イベントの作成・編集・コピー・削除、締切・対象拠点・定員を管理します。"
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
            <Td>{statusBadge[e.status]}</Td>
            <Td>
              <EventRowActions eventId={e.id} eventName={e.name} />
            </Td>
          </tr>
        ))}
      </Table>

      {deletedEvents.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-heading-md text-neutral-900">削除済みイベント</h2>
          <p className="mb-3 text-body-sm text-neutral-600">
            一覧から非表示のイベントです。復元すると元の状態に戻ります（申込・決済データは保持されています）。
          </p>
          <Table
            head={
              <tr>
                <Th>イベント名</Th>
                <Th>開催期間</Th>
                <Th>締切</Th>
                <Th>状態</Th>
                <Th>操作</Th>
              </tr>
            }
          >
            {deletedEvents.map((e) => (
              <tr key={e.id}>
                <Td>{e.name}</Td>
                <Td>{eventPeriod(e.start_date, e.event_date)}</Td>
                <Td>{jpDate(e.application_deadline)}</Td>
                <Td>{statusBadge[e.status]}</Td>
                <Td>
                  <RestoreEventButton eventId={e.id} eventName={e.name} />
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </AppShell>
  );
}
