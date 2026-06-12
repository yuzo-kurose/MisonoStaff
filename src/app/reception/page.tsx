"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, AttendanceBadge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { QrScanner } from "@/components/QrScanner";
import type { AttendanceStatus } from "@/lib/mock/data";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

type Candidate = {
  participant_id: string;
  event_name: string;
  venue: string | null;
  attendance_status: AttendanceStatus;
  user_name: string;
};
type ProfileHit = { id: string; name: string; kana: string; checkin_token: string };

export default function ReceptionPage() {
  const supabase = createClient();
  const [date, setDate] = useState(todayStr());
  const [venue, setVenue] = useState("");
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProfileHit[]>([]);
  const [person, setPerson] = useState<string | null>(null);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCandidates(t: string, name: string | null) {
    setMsg(null);
    setLoading(true);

    // 対象者名を先に確定する。スキャン（name=null）でもトークンから氏名を引き、
    // 当日の対象イベントが0件でも対象者欄に実名を即表示するため。
    let displayName = name;
    if (!displayName) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("name")
        .eq("checkin_token", t)
        .maybeSingle();
      displayName = (prof as { name: string } | null)?.name ?? null;
    }

    const { data, error } = await supabase.rpc("checkin_candidates", {
      p_token: t,
      p_date: date,
      p_venue: venue || undefined,
    } as never);
    setLoading(false);
    if (error) {
      setMsg({ ok: false, text: `取得に失敗：${error.message}` });
      return;
    }
    const list = (data ?? []) as unknown as Candidate[];

    // 氏名も候補も無い＝該当者なし（無効トークン等）。対象者欄は出さずに案内する。
    const resolvedName = displayName ?? list[0]?.user_name ?? null;
    if (!resolvedName) {
      setRows([]);
      setSelected(new Set());
      setPerson(null);
      setHits([]);
      setMsg({ ok: false, text: "QRに該当する対象者が見つかりませんでした。トークンをご確認ください。" });
      return;
    }

    setRows(list);
    setPerson(resolvedName);
    setSelected(
      new Set(list.filter((r) => r.attendance_status !== "checked_in").map((r) => r.participant_id)),
    );
    setHits([]);
  }

  async function search() {
    setMsg(null);
    setHits([]);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,kana,checkin_token")
      .ilike("name", `%${query}%`)
      .limit(10);
    if (error) {
      setMsg({ ok: false, text: `検索に失敗：${error.message}` });
      return;
    }
    setHits((data ?? []) as ProfileHit[]);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function batchCheckIn(method: "qr" | "name_search") {
    const ids = rows
      .filter((r) => selected.has(r.participant_id) && r.attendance_status !== "checked_in")
      .map((r) => r.participant_id);
    if (ids.length === 0) return;
    const { data, error } = await supabase.rpc("batch_check_in", {
      p_participant_ids: ids,
      p_method: method,
    } as never);
    if (error) {
      setMsg({ ok: false, text: `受付に失敗：${error.message}` });
      return;
    }
    setMsg({ ok: true, text: `${(data as unknown as number) ?? ids.length} 件を受付しました。` });
    // 再取得して状態反映
    const tok = token || hits[0]?.checkin_token;
    if (tok) await loadCandidates(tok, person);
  }

  async function dayCancel(participantId: string) {
    const { error } = await supabase.rpc("mark_day_cancelled", {
      p_participant_id: participantId,
    } as never);
    if (error) {
      setMsg({ ok: false, text: `更新に失敗：${error.message}` });
      return;
    }
    const tok = token || hits[0]?.checkin_token;
    if (tok) await loadCandidates(tok, person);
  }

  const pending = rows.filter(
    (r) => selected.has(r.participant_id) && r.attendance_status !== "checked_in",
  ).length;

  return (
    <AppShell role="reception">
      <PageHeader title="当日受付" description="QRトークン または 氏名検索で対象者を呼び出します。" />

      <Alert variant="info">
        参加者のQR（人単位）を読み取ると、その人が当日参加する全イベントをまとめて受付できます。
      </Alert>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="受付日">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="会場（任意で絞り込み）">
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="本殿 など" />
        </Field>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>呼び出し</CardTitle>
          <div className="mt-4 space-y-4">
            <QrScanner
              onScan={(value) => {
                setToken(value);
                loadCandidates(value, null);
              }}
            />
            <Field label="QRトークン（スキャン値）">
              <div className="flex gap-2">
                <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="checkin_token" />
                <Button variant="secondary" onClick={() => token && loadCandidates(token, null)} disabled={!token || loading}>
                  読み込み
                </Button>
              </div>
            </Field>
            <Field label="氏名で検索">
              <div className="flex gap-2">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="山田 太郎" />
                <Button variant="secondary" onClick={search} disabled={!query}>
                  検索
                </Button>
              </div>
            </Field>
            {hits.length > 0 && (
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                {hits.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <span className="text-body-md text-neutral-900">{h.name}</span>{" "}
                      <span className="text-body-sm text-neutral-600">{h.kana}</span>
                    </span>
                    <Button size="md" onClick={() => loadCandidates(h.checkin_token, h.name)}>
                      呼び出す
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          {!person ? (
            <div className="space-y-3">
              {msg && !msg.ok && <Alert variant="error">{msg.text}</Alert>}
              <p className="py-12 text-center text-body-md text-neutral-600">
                QRトークンを読み込むか、氏名で検索してください。
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <CardTitle>{person}</CardTitle>
                <Badge variant="info">当日 {rows.length} 件</Badge>
              </div>

              {msg && (
                <div className="mt-3">
                  <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
                </div>
              )}

              {rows.length === 0 ? (
                <p className="mt-4 text-body-sm text-neutral-600">
                  この日に受付対象（確定／支払済）のイベントはありません。
                </p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2">
                    {rows.map((r) => {
                      const checkedIn = r.attendance_status === "checked_in";
                      const cancelled = r.attendance_status === "day_cancelled";
                      return (
                        <li
                          key={r.participant_id}
                          className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={selected.has(r.participant_id)}
                            disabled={checkedIn || cancelled}
                            onChange={() => toggle(r.participant_id)}
                          />
                          <div className="flex-1">
                            <p className="text-body-md text-neutral-900">{r.event_name}</p>
                            {r.venue && <p className="text-body-sm text-neutral-600">{r.venue}</p>}
                          </div>
                          <AttendanceBadge status={r.attendance_status} />
                          {!checkedIn && !cancelled && (
                            <Button variant="ghost" size="md" onClick={() => dayCancel(r.participant_id)}>
                              当日キャンセル
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4">
                    <Button
                      fullWidth
                      size="lg"
                      disabled={pending === 0}
                      onClick={() => batchCheckIn(token ? "qr" : "name_search")}
                    >
                      まとめて受付（{pending}件）
                    </Button>
                  </div>
                  <p className="mt-2 text-center text-body-sm text-neutral-600">
                    特定イベントだけ欠席ならチェックを外してください。
                  </p>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
