"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { UserPlus, Upload, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, SectionCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { registerProxyMember, getProxyFields, type ProxyField } from "./actions";

type EventOpt = { id: string; name: string; venue: string | null; date: string };
type DivisionOpt = { value: string; label: string };

type CellValue = { value: string; optionIds: string[] };
type Row = { name: string; email: string; values: Record<string, CellValue> };
const emptyRow = (): Row => ({ name: "", email: "", values: {} });
const initialRows = (): Row[] => [emptyRow(), emptyRow(), emptyRow()];

export function ProxyClient({
  events,
  divisions,
  branches,
}: {
  events: EventOpt[];
  divisions: DivisionOpt[];
  branches: { id: string; name: string }[];
}) {
  const [eventId, setEventId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [division, setDivision] = useState("");
  const [rows, setRows] = useState<Row[]>(initialRows());
  const [fields, setFields] = useState<ProxyField[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // 選択イベントのフォーム項目を取得し、一覧表の列として展開する。
  useEffect(() => {
    let active = true;
    if (!eventId) {
      setFields([]);
      return;
    }
    getProxyFields([eventId]).then((fs) => {
      if (active) setFields(fs);
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  // イベント選択リスト（開催日昇順。日付つきで表示）。
  const eventOptions = useMemo(
    () =>
      [...events]
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        .map((e) => ({
          id: e.id,
          label: `${e.date ? e.date.replace(/-/g, "/") + "　" : ""}${e.name}`,
        })),
    [events],
  );

  // 一覧表の行操作
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  // フォーム項目セルの値操作
  const cellOf = (r: Row, fieldId: string): CellValue => r.values[fieldId] ?? { value: "", optionIds: [] };
  const setCell = (i: number, fieldId: string, patch: Partial<CellValue>) =>
    setRows((rs) =>
      rs.map((r, idx) =>
        idx === i
          ? { ...r, values: { ...r.values, [fieldId]: { ...cellOf(r, fieldId), ...patch } } }
          : r,
      ),
    );
  const toggleCellOption = (i: number, fieldId: string, optionId: string) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const cur = cellOf(r, fieldId).optionIds;
        const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
        return { ...r, values: { ...r.values, [fieldId]: { ...cellOf(r, fieldId), optionIds: next } } };
      }),
    );

  // フォーム項目1セル分の入力UI（項目タイプごとに出し分け）。
  const fieldInput = (i: number, f: ProxyField) => {
    const c = cellOf(rows[i], f.id);
    if (f.fieldType === "select_single") {
      return (
        <Select value={c.optionIds[0] ?? ""} onChange={(e) => setCell(i, f.id, { optionIds: e.target.value ? [e.target.value] : [] })}>
          <option value="">未選択</option>
          {f.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }
    if (f.fieldType === "select_multiple") {
      return (
        <div className="space-y-1">
          {f.options.map((o) => (
            <label key={o.id} className="flex items-center gap-1.5 text-body-sm">
              <input
                type="checkbox"
                className="h-4 w-4 flex-none"
                checked={c.optionIds.includes(o.id)}
                onChange={() => toggleCellOption(i, f.id, o.id)}
              />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
        </div>
      );
    }
    const type = f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text";
    return (
      <Input type={type} value={c.value} onChange={(e) => setCell(i, f.id, { value: e.target.value })} />
    );
  };

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
    if (!eventId) {
      setMsg({ ok: false, text: "参加イベントを選択してください。" });
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
          eventIds: [eventId],
          branchId,
          name: r.name,
          email: r.email,
          division,
          values: fields.map((f) => {
            const c = cellOf(r, f.id);
            return { fieldId: f.id, value: c.value || null, optionIds: c.optionIds };
          }),
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

  // CSV: 氏名,メール。拠点・部・イベントは画面の登録条件を使用する。
  const runCsv = (file: File) => {
    setMsg(null);
    if (!branchId || !division || !eventId) {
      setMsg({ ok: false, text: "先に登録条件（拠点・部・参加イベント）を選択してください。" });
      return;
    }
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
        const [cName, cEmail] = cols;
        const res = await registerProxyMember({
          eventIds: [eventId],
          branchId,
          name: cName ?? "",
          email: cEmail ?? "",
          division,
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
        {/* 共通条件：登録先拠点・部・参加イベント（表の全行に適用） */}
        <SectionCard
          title="登録条件"
          description="ここで選んだ拠点・部・イベントが、下の表のすべてのメンバーに適用されます。イベントごとに登録します。"
        >
          <div className="grid gap-4 sm:grid-cols-3">
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
              <Select className="max-w-[14rem]" value={division} onChange={(e) => setDivision(e.target.value)}>
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

            <Field label="参加イベント" required hint="登録するイベントを選択します">
              {eventOptions.length === 0 ? (
                <p className="text-body-sm text-neutral-600">公開中のイベントがありません。</p>
              ) : (
                <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  <option value="" disabled>
                    選択してください
                  </option>
                  {eventOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
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
                  <th className="min-w-[8rem] px-2 pb-2 font-medium">氏名 *</th>
                  <th className="min-w-[12rem] px-2 pb-2 font-medium">メールアドレス *</th>
                  {fields.map((f) => (
                    <th key={f.id} className="min-w-[9rem] px-2 pb-2 font-medium">
                      {f.label}
                      {f.isRequired && <span className="text-error-900"> *</span>}
                    </th>
                  ))}
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
                    {fields.map((f) => (
                      <td key={f.id} className="px-2 py-1.5">
                        {fieldInput(i, f)}
                      </td>
                    ))}
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
          description="列: 氏名, メール。拠点・部・イベントは上の登録条件を使用します。1行目が見出しなら自動でスキップします。"
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
