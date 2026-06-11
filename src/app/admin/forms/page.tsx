import Link from "next/link";
import { Pencil, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Th, Td } from "@/components/ui/Table";
import { jpDate } from "@/lib/format";
import { getAdminEvents } from "@/lib/queries/events";

export default async function FormsListPage() {
  const events = await getAdminEvents();

  return (
    <AppShell role="admin">
      <PageHeader
        title="フォーム管理"
        description="イベントごとに申込フォームを作成・編集します。"
        action={
          <Link href="/admin/events/new">
            <Button>＋ イベントを作成してフォームを作る</Button>
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="フォームを編集できるイベントがありません"
          description="まずイベントを作成すると、申込フォームの編集ができるようになります。"
          action={
            <Link href="/admin/events/new">
              <Button>＋ イベントを作成</Button>
            </Link>
          }
        />
      ) : (
        <Table
          head={
            <tr>
              <Th>イベント</Th>
              <Th>開催日</Th>
              <Th>フォーム名</Th>
              <Th>項目数</Th>
              <Th>操作</Th>
            </tr>
          }
        >
          {events.map((e) => (
            <tr key={e.id}>
              <Td>{e.name}</Td>
              <Td>{jpDate(e.event_date)}</Td>
              <Td>{e.formName}</Td>
              <Td>
                <Badge variant="info">{e.fieldCount} 項目</Badge>
              </Td>
              <Td>
                <Link href={`/admin/forms/${e.id}`}>
                  <Button variant="ghost" size="md">
                    <Pencil size={15} /> フォームを編集
                  </Button>
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </AppShell>
  );
}
