"use client";

import { useState, useTransition } from "react";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Table, Th, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Field";
import { MobileRecord } from "@/components/ui/MobileRecord";
import { yen, jpDate } from "@/lib/format";
import type { RosterGroup } from "@/lib/queries/roster";
import { confirmApplication, confirmParticipant, removeParticipant, resolveChangeRequest } from "./actions";
import { refundParticipant } from "@/app/admin/applications/actions";

export function RosterClient({ groups, isAdmin }: { groups: RosterGroup[]; isAdmin: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // イベント単位にまとめる（イベント → 拠点(application) → メンバー）。
  const byEvent = (() => {
    const m = new Map<
      string,
      { eventId: string; eventName: string; eventDate: string; apps: RosterGroup[] }
    >();
    for (const g of groups) {
      const e =
        m.get(g.eventId) ?? { eventId: g.eventId, eventName: g.eventName, eventDate: g.eventDate, apps: [] };
      e.apps.push(g);
      m.set(g.eventId, e);
    }
    return [...m.values()].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  })();

  // 選択中のイベント（既定は先頭＝開催日が近い順）。
  const [eventId, setEventId] = useState(() => byEvent[0]?.eventId ?? "");
  const selectedEvent = byEvent.find((e) => e.eventId === eventId) ?? byEvent[0];

  // イベント内の未確定を含む application をまとめて確定する。
  const confirmAll = (applicationIds: string[]) => {
    if (applicationIds.length === 0) return;
    setMsg(null);
    startTransition(async () => {
      let err = "";
      for (const id of applicationIds) {
        const res = await confirmApplication(id);
        if (!res.ok) err = res.error ?? "不明なエラー";
      }
      setMsg(
        err
          ? { ok: false, text: `確定に失敗：${err}` }
          : { ok: true, text: "未確定の名簿を確定しました。確定者へ決済依頼が可能です。" },
      );
    });
  };

  // 人単位の確定。
  const confirmRow = (participantId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await confirmParticipant(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "確定しました。確定者へ決済依頼を送信しました。" }
          : { ok: false, text: `確定に失敗：${res.error}` },
      );
    });
  };

  // 削除（名簿から外す＝キャンセル）。決済前のキャンセルは名簿除外で完結。確認ダイアログを出す。
  const remove = (participantId: string) => {
    if (!window.confirm("この申込を名簿から削除（キャンセル）します。よろしいですか？")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await removeParticipant(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "削除（キャンセル）しました。" }
          : { ok: false, text: `削除に失敗：${res.error}` },
      );
    });
  };

  // 決済済みのキャンセル＝Stripe全額返金＋キャンセル（管理者のみ実行可）。
  const refund = (participantId: string) => {
    if (
      !window.confirm(
        "決済済みです。Stripeで全額返金してキャンセルします。よろしいですか？\n（前日まで全額返金／開催当日以降は返金できません）",
      )
    )
      return;
    setMsg(null);
    startTransition(async () => {
      const res = await refundParticipant(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "返金してキャンセルしました。" }
          : { ok: false, text: `返金に失敗：${res.error}` },
      );
    });
  };

  const resolve = (participantId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await resolveChangeRequest(participantId);
      setMsg(
        res.ok
          ? { ok: true, text: "依頼を対応済みにしました。" }
          : { ok: false, text: `更新に失敗：${res.error}` },
      );
    });
  };

  // 変更依頼（編集/キャンセル）の表示＋対応済みボタン。
  const reqInfo = (m: RosterGroup["members"][number]) =>
    m.request ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Badge variant="warning">
          {m.request.type === "cancel" ? "キャンセル依頼" : "編集依頼"}
        </Badge>
        {m.request.message && (
          <span className="text-body-sm text-neutral-600">{m.request.message}</span>
        )}
        <Button variant="ghost" size="md" onClick={() => resolve(m.participantId)}>
          対応済み
        </Button>
      </span>
    ) : null;

  // 1メンバーの操作（確定・削除）。表・スマホカードで共用。
  const memberAction = (m: RosterGroup["members"][number]) => {
    // 決済済みはキャンセル＝Stripe返金（管理者のみ）。
    if (m.status === "paid")
      return isAdmin ? (
        <Button
          variant="ghost"
          size="md"
          disabled={pending}
          onClick={() => refund(m.participantId)}
          className="text-error-900 hover:bg-error-100"
        >
          削除（返金）
        </Button>
      ) : (
        <span className="text-body-sm text-neutral-500">返金は管理者へ</span>
      );
    // 申込中／確定（未決済）：確定（申込中のみ）＋編集＋削除。
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {m.status === "applying" && (
          <Button size="md" disabled={pending} onClick={() => confirmRow(m.participantId)}>
            確定
          </Button>
        )}
        <ButtonLink href={`/rep/roster/${m.participantId}/edit`} variant="secondary" size="md">
          編集
        </ButtonLink>
        <Button
          variant="ghost"
          size="md"
          disabled={pending}
          onClick={() => remove(m.participantId)}
          className="text-error-900 hover:bg-error-100"
        >
          削除
        </Button>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="申込名簿"
        description="申込締切（毎月25日）までに確定してください。確定後、各参加者へまとめて決済依頼が可能になります。"
      />

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      {groups.length === 0 ? (
        <Alert variant="info">対象の名簿がありません。</Alert>
      ) : (
        <div className="space-y-8">
          {byEvent.filter((ev) => ev.eventId === selectedEvent?.eventId).map((ev) => {
            // イベント内の全メンバーを所属付きで1リストに統合（所属→氏名でソート）。
            const flat = ev.apps
              .flatMap((g) => g.members.map((m) => ({ ...m, branchName: g.branchName })))
              .sort((a, b) => a.branchName.localeCompare(b.branchName, "ja") || a.name.localeCompare(b.name, "ja"));
            const pendingAppIds = ev.apps
              .filter((g) => g.members.some((m) => m.status === "applying"))
              .map((g) => g.applicationId);
            const applyingCount = flat.filter((m) => m.status === "applying").length;
            // 申込フォーム項目（列見出し）。同一イベントは同じフォームなので先頭から取得。
            const fields = ev.apps[0]?.fields ?? [];
            return (
              <div key={ev.eventId}>
                {/* 一覧のすぐ上：イベント選択＋件数＋一括確定ボタン */}
                <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                  <div className="max-w-md flex-1">
                    <label className="mb-1 block text-label-sm text-neutral-600">イベント</label>
                    <Select value={selectedEvent?.eventId ?? ""} onChange={(e) => setEventId(e.target.value)}>
                      {byEvent.map((e2) => (
                        <option key={e2.eventId} value={e2.eventId}>
                          {e2.eventName}（{jpDate(e2.eventDate)}）
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pb-0.5">
                    <span className="text-body-sm text-neutral-600">
                      {flat.length}名（未確定 {applyingCount}名）
                    </span>
                    <Button
                      size="md"
                      disabled={pending || pendingAppIds.length === 0}
                      onClick={() => confirmAll(pendingAppIds)}
                    >
                      未確定をまとめて確定する
                    </Button>
                  </div>
                </div>

                <Card>
                {/* スマホ：カード表示 */}
                <div className="space-y-2 md:hidden">
                  {flat.map((m, i) => (
                    <MobileRecord
                      key={m.participantId}
                      title={`${i + 1}. ${m.name}`}
                      badge={<StatusBadge status={m.status} />}
                      rows={[
                        { label: "所属", value: m.branchName || "—" },
                        { label: "金額", value: yen(m.amount) },
                        ...fields.map((f) => ({ label: f.label, value: m.values[f.id] || "—" })),
                        ...(m.request ? [{ label: "依頼", value: reqInfo(m) }] : []),
                      ]}
                      action={memberAction(m) ?? undefined}
                    />
                  ))}
                </div>

                {/* PC：テーブル表示 */}
                <div className="hidden overflow-x-auto md:block">
                  <Table
                    head={
                      <tr>
                        <Th>No</Th>
                        <Th>所属</Th>
                        <Th>氏名</Th>
                        <Th>金額</Th>
                        {fields.map((f) => (
                          <Th key={f.id}>{f.label}</Th>
                        ))}
                        <Th>状態</Th>
                        <Th>操作</Th>
                      </tr>
                    }
                  >
                    {flat.map((m, i) => (
                      <tr key={m.participantId}>
                        <Td>
                          <span className="tabular-nums text-neutral-500">{i + 1}</span>
                        </Td>
                        <Td>{m.branchName || <span className="text-neutral-400">—</span>}</Td>
                        <Td>
                          {m.name}
                          {m.request && <div className="mt-1">{reqInfo(m)}</div>}
                        </Td>
                        <Td>{yen(m.amount)}</Td>
                        {fields.map((f) => (
                          <Td key={f.id}>
                            {m.values[f.id] || <span className="text-neutral-400">—</span>}
                          </Td>
                        ))}
                        <Td>
                          <StatusBadge status={m.status} />
                        </Td>
                        <Td>{memberAction(m) ?? <span className="text-body-sm text-neutral-600">—</span>}</Td>
                      </tr>
                    ))}
                  </Table>
                </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
