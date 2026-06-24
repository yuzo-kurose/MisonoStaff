import Link from "next/link";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { jpDate, eventPeriod } from "@/lib/format";
import { getAdminEvents, getDeletedEvents, type EventListItem } from "@/lib/queries/events";
import { EventRowActions } from "./EventRowActions";
import { RestoreEventButton } from "./RestoreEventButton";

const statusBadge: Record<string, React.ReactNode> = {
  draft: <Badge variant="neutral">下書き</Badge>,
  published: <Badge variant="success">公開中</Badge>,
  closed: <Badge variant="warning">締切</Badge>,
};

/** 有効イベント一覧（スマホ＝カード／PC＝テーブル）。 */
function ActiveEventList({ list }: { list: EventListItem[] }) {
  return (
    <>
      {/* スマホ：カード表示 */}
      <div className="space-y-2 md:hidden">
        {list.map((e) => (
          <MobileRecord
            key={e.id}
            title={e.name}
            badge={statusBadge[e.status]}
            rows={[
              { label: "開催期間", value: eventPeriod(e.start_date, e.event_date) },
              { label: "締切", value: jpDate(e.application_deadline) },
              { label: "定員", value: e.capacity ?? "—" },
            ]}
            action={<EventRowActions eventId={e.id} eventName={e.name} />}
          />
        ))}
      </div>

      {/* PC：テーブル表示 */}
      <div className="hidden md:block">
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
          {list.map((e) => (
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
      </div>
    </>
  );
}

export default async function AdminEventsPage() {
  const [events, deletedEvents] = await Promise.all([getAdminEvents(), getDeletedEvents()]);
  const today = new Date().toISOString().slice(0, 10);
  const drafts = events.filter((e) => e.status === "draft"); // 公開前（下書き）
  const nonDraft = events.filter((e) => e.status !== "draft");
  const published = nonDraft.filter((e) => e.event_date >= today); // 開催前・開催中
  const ended = nonDraft.filter((e) => e.event_date < today); // 終了済（開催日が過去）

  return (
    <>
      <PageHeader
        title="イベント管理"
        description="イベントの作成・編集・コピー・削除、締切・対象拠点・定員を管理します。"
        action={
          <Link href="/admin/events/new">
            <Button>＋ イベントを作成</Button>
          </Link>
        }
      />

      {/* 公開中イベント */}
      <section>
        <h2 className="mb-3 text-heading-md text-neutral-900">公開中イベント</h2>
        {published.length > 0 ? (
          <ActiveEventList list={published} />
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-white py-8 text-center text-body-sm text-neutral-500">
            公開中のイベントはありません。
          </p>
        )}
      </section>

      {/* 下書きイベント（公開前） */}
      <section className="mt-8">
        <h2 className="mb-3 text-heading-md text-neutral-900">下書きイベント</h2>
        {drafts.length > 0 ? (
          <ActiveEventList list={drafts} />
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-white py-8 text-center text-body-sm text-neutral-500">
            下書きのイベントはありません。
          </p>
        )}
      </section>

      {/* 終了済イベント（開催日が過去・折りたたみ・既定は閉じる） */}
      {ended.length > 0 && (
        <details className="mt-8 rounded-xl border border-neutral-200 bg-neutral-white">
          <summary className="cursor-pointer px-4 py-3 text-heading-sm text-neutral-900">
            終了済イベント（{ended.length}）
          </summary>
          <div className="border-t border-neutral-200 p-4">
            <p className="mb-3 text-body-sm text-neutral-600">
              開催日が過ぎたイベントです。内容の確認・コピーができます。
            </p>
            <ActiveEventList list={ended} />
          </div>
        </details>
      )}

      {/* 削除済みイベント（折りたたみ・既定は閉じる） */}
      {deletedEvents.length > 0 && (
        <details className="mt-8 rounded-xl border border-neutral-200 bg-neutral-white">
          <summary className="cursor-pointer px-4 py-3 text-heading-sm text-neutral-900">
            削除済みイベント（{deletedEvents.length}）
          </summary>
          <div className="border-t border-neutral-200 p-4">
            <p className="mb-3 text-body-sm text-neutral-600">
              一覧から非表示のイベントです。復元すると元の状態に戻ります（申込・決済データは保持されています）。
            </p>
            <div className="space-y-2 md:hidden">
              {deletedEvents.map((e) => (
                <MobileRecord
                  key={e.id}
                  title={e.name}
                  badge={statusBadge[e.status]}
                  rows={[
                    { label: "開催期間", value: eventPeriod(e.start_date, e.event_date) },
                    { label: "締切", value: jpDate(e.application_deadline) },
                  ]}
                  action={<RestoreEventButton eventId={e.id} eventName={e.name} />}
                />
              ))}
            </div>
            <div className="hidden md:block">
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
          </div>
        </details>
      )}
    </>
  );
}
