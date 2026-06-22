"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { UserPlus, Upload, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, SectionCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Fieldset, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { registerProxyMember } from "./actions";

type EventOpt = { id: string; name: string; venue: string | null; date: string };
type DivisionOpt = { value: string; label: string };

type Row = { name: string; email: string; department: string };
const emptyRow = (): Row => ({ name: "", email: "", department: "" });
const initialRows = (): Row[] => [emptyRow(), emptyRow(), emptyRow()];

export function ProxyClient({
  events,
  divisions,
  departments,
  branches,
}: {
  events: EventOpt[];
  divisions: DivisionOpt[];
  departments: string[];
  branches: { id: string; name: string }[];
}) {
  const [month, setMonth] = useState("");
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [division, setDivision] = useState("");
  const [rows, setRows] = useState<Row[]>(initialRows());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // 対象月の選択肢（イベント開催月の重複なし・昇順）。
  const monthOptions = useMemo(() => {
    const set = new Set(events.map((e) => (e.date ?? "").slice(0, 7)).filter(Boolean));
    return [...set].sort().map((ym) => {
      const [y, m] = ym.split("-");
      return { value: ym, label: `${y}年${Number(m)}月` };
    });
  }, [events]);

  // 選択中の対象月のイベントのみ表示する。
  const monthEvents = useMemo(
    () => (month ? events.filter((e) => (e.date ?? "").slice(0, 7) === month) : []),
    [events, month],
  );

  const changeMonth = (ym: string) => {
    setMonth(ym);
    setEventIds([]); // 対象月を変えたら選択をリセット
  };

  const toggleEvent = (id: string) =>
    setEventIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // 一覧表の行操作
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  // 入力済み（氏名 or メールがある）行のみ登録対象とする。
  const filledRows = rows.filter((r) => r.name.trim() || r.email.trim());

  const submitAll = () => {
    setMsg(null);
    if (!branchId) {
      setMsg({ ok: false, text: "登録先拠点を選択してください。" });
      return;
    }
    if (!division) {
      setMsg({ ok: false, text: "部を選択してください。" });
      return;
    }
    if (eventIds.length === 0) {
      setMsg({ ok: false, text: "参加イベントを1つ以上選択してください。" });
      return;
    }
    if (filledRows.length === 0) {
      setMsg({ ok: false, text: "登録するメンバーを1行以上入力してください。" });
      return;
    }
    startTransition(async () => {
      let ok = 0;
      let ng = 0;
      const errs: string[] = [];
      for (const r of filledRows) {
        const res = await registerProxyMember({
          eventIds,
          branchId,
          name: r.name,
          email: r.email,
          division,
          department: r.department,
        });
        if (res.ok) ok++;
        else {
          ng++;
          if (errs.length < 3) errs.push(`${r.name || r.email || "?"}：${res.error ?? "失敗"}`);
        }
      }
      setMsg({
        ok: ng === 0,
        text: `登録完了：成功 ${ok} 件 / 失敗 ${ng} 件${
          errs.length ? `（例: ${errs.join(" / ")}）` : ""
        }`,
      });
      if (ng === 0) setRows(initialRows());
    });
  };

  // CSV: 氏名,メール,部(値),部署(任意),イベントID(；区切り・省略時は画面選択)
  const runCsv = (file: File) => {
    setMsg(null);
    startTransition(async () => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const data =
        lines[0] && /氏名|name|メール|email/i.test(lines[0]) ? lines.slice(1) : lines;
      let ok = 0;
      let ng = 0;
      const errs: string[] = [];
      for (const line of data) {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const [cName, cEmail, cDivision, cDepartment, cEvents] = cols;
        const ids = cEvents
          ? cEvents.split(/[;；]/).map((s) => s.trim()).filter(Boolean)
          : eventIds;
        const res = await registerProxyMember({
          eventIds: ids,
          branchId,
          name: cName ?? "",
          email: cEmail ?? "",
          division: cDivision || division,
          department: cDepartment ?? "",
        });
        if (res.ok) ok++;
        else {
          ng++;
          if (errs.length < 3) errs.push(`${cName || cEmail || "?"}：${res.error ?? "失敗"}`);
        }
      }
      setMsg({
        ok: ng === 0,
        text: `CSV取り込み完了：成功 ${ok} 件 / 失敗 ${ng} 件${
          errs.length ? `（例: ${errs.join(" / ")}）` : ""
        }`,
      });
      setCsvFile(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  return (
    <AppShell role="representative">
      <PageHeader
        title="代行入力"
        description="拠点メンバー分の申込をまとめて入力します。入力時にアカウントが発行されます。"
      />

      <div className="mb-6">
        <Alert variant="info">
          メールアドレス宛に初回ログイン（パスワード設定）の案内を送る想定です。金額は本人/代表者が後から入力・確定します。
        </Alert>
      </div>

      {msg && (
        <div className="mb-4">
          <Alert variant={msg.ok ? "success" : "error"}>{msg.text}</Alert>
        </div>
      )}

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submitAll();
        }}
      >
        {/* 共通条件：登録先拠点・対象月・参加イベント（表の全行に適用） */}
        <SectionCard
          title="登録条件"
          description="ここで選んだ拠点・イベントが、下の表のすべてのメンバーに適用されます。"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="登録先拠点" required hint="この拠点の名簿に登録されます">
                {branches.length === 0 ? (
                  <p className="text-body-sm text-error-900">
                    担当拠点がありません。管理者に拠点マスタでの代表設定を依頼してください。
                  </p>
                ) : (
                  <Select className="max-w-[14rem]" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                    <option value="" disabled>
                      選択してください
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="部" required hint="この部として全メンバーを登録します">
                <Select className="max-w-[11rem]" value={division} onChange={(e) => setDivision(e.target.value)}>
                  <option value="" disabled>
                    選択してください
                  </option>
                  {divisions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="対象月" required hint="対象月を選ぶと、その月のイベントが表示されます">
              <Select className="max-w-[11rem]" value={month} onChange={(e) => changeMonth(e.target.value)}>
                <option value="" disabled>
                  選択してください
                </option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Fieldset label="参加イベント" required hint="複数選択可（同日分はまとめて受付されます）">
              {month === "" ? (
                <p className="text-body-sm text-neutral-600">先に対象月を選択してください。</p>
              ) : monthEvents.length === 0 ? (
                <p className="text-body-sm text-neutral-600">この月の公開中イベントはありません。</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {monthEvents.map((e) => {
                    const on = eventIds.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-body-md transition-colors ${
                          on
                            ? "border-primary-700 bg-primary-50 text-neutral-900"
                            : "border-neutral-200 bg-neutral-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 flex-none"
                          checked={on}
                          onChange={() => toggleEvent(e.id)}
                        />
                        <span className="truncate">
                          {e.name}
                          {e.venue && (
                            <span className="ml-1 text-body-sm text-neutral-600">（{e.venue}）</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Fieldset>
          </div>
        </SectionCard>

        {/* メンバー一覧表：1行＝1名。行ごとに 部／氏名／メール／部署 を入力 */}
        <SectionCard
          title="メンバー一覧"
          description="1行に1名分を入力します。行を追加して複数名をまとめて登録できます。氏名またはメールが空の行は登録されません。"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-body-sm">
              <thead>
                <tr className="text-left text-label-sm text-neutral-600">
                  <th className="w-10 px-2 pb-2 font-medium">#</th>
                  <th className="px-2 pb-2 font-medium">氏名 *</th>
                  <th className="px-2 pb-2 font-medium">メールアドレス *</th>
                  <th className="px-2 pb-2 font-medium">部署</th>
                  <th className="w-12 px-2 pb-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-2 py-1.5 text-neutral-500">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={r.name}
                        onChange={(e) => setRow(i, { name: e.target.value })}
                        placeholder="田中 花子"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="email"
                        value={r.email}
                        onChange={(e) => setRow(i, { email: e.target.value })}
                        placeholder="hanako@example.com"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={r.department} onChange={(e) => setRow(i, { department: e.target.value })}>
                        <option value="">未選択</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={pending || rows.length <= 1}
                        aria-label={`${i + 1}行目を削除`}
                        className="rounded p-2 text-neutral-500 transition-colors hover:bg-error-50 hover:text-error-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
            <Button type="button" variant="secondary" disabled={pending} onClick={addRow}>
              <Plus size={18} /> 行を追加
            </Button>
            <Button type="submit" disabled={pending}>
              <UserPlus size={18} /> {pending ? "登録中…" : `${filledRows.length}名を登録`}
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="CSVで一括取り込み"
          description="列: 氏名, メール, 部(値), 部署(任意), イベントID(；区切り・省略時は上で選択中のイベント)。1行目が見出しなら自動でスキップします。"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} /> CSVファイルを選択
            </Button>
            {csvFile && <span className="text-body-sm text-neutral-700">{csvFile.name}</span>}
            <Button type="button" disabled={pending || !csvFile} onClick={() => csvFile && runCsv(csvFile)}>
              {pending ? "取り込み中…" : "反映"}
            </Button>
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <ButtonLink href="/rep/roster" variant="ghost">
            名簿に戻る
          </ButtonLink>
        </div>
      </form>
    </AppShell>
  );
}
