"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, SectionCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Fieldset, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { StickyActionBar } from "@/components/ui/StickyActionBar";
import { registerProxyMember } from "./actions";

type EventOpt = { id: string; name: string; venue: string | null };
type DivisionOpt = { value: string; label: string };

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
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [division, setDivision] = useState("");
  const [department, setDepartment] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleEvent = (id: string) =>
    setEventIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addOne = () => {
    setMsg(null);
    if (!branchId) {
      setMsg({ ok: false, text: "登録先拠点を選択してください。" });
      return;
    }
    startTransition(async () => {
      const res = await registerProxyMember({ eventIds, branchId, name, email, division, department });
      if (res.ok) {
        setMsg({ ok: true, text: `${name} さんを登録しました。続けて入力できます。` });
        setName("");
        setEmail("");
        // eventIds・division・department は連続入力のため保持
      } else {
        setMsg({ ok: false, text: res.error ?? "登録に失敗しました。" });
      }
    });
  };

  // CSV: 氏名,メール,部(値),部署(任意),イベントID(；区切り・省略時は画面選択)
  const onCsv = (file: File) => {
    setMsg(null);
    startTransition(async () => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const rows =
        lines[0] && /氏名|name|メール|email/i.test(lines[0]) ? lines.slice(1) : lines;
      let ok = 0;
      let ng = 0;
      const errs: string[] = [];
      for (const line of rows) {
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
          division: cDivision ?? "",
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
        className="mx-auto max-w-2xl space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          addOne();
        }}
      >
        <SectionCard
          title="メンバーを追加"
          description="1名分を入力して追加すると、続けて次のメンバーを入力できます。"
        >
          <div className="space-y-4">
            <Field label="登録先拠点" required hint="この拠点の名簿に登録されます">
              {branches.length === 0 ? (
                <p className="text-body-sm text-error-900">
                  担当拠点がありません。管理者に拠点マスタでの代表設定を依頼してください。
                </p>
              ) : (
                <Select
                  className="max-w-sm"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                >
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
            <Fieldset label="参加イベント" required hint="複数選択可（同日分はまとめて受付されます）">
              {events.length === 0 ? (
                <p className="text-body-sm text-neutral-600">公開中のイベントがありません。</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {events.map((e) => {
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="氏名" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="田中 花子" />
              </Field>
              <Field label="メールアドレス" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hanako@example.com"
                />
              </Field>
              <Field label="部" required>
                <Select value={division} onChange={(e) => setDivision(e.target.value)}>
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
              <Field label="部署（配置先）" hint="任意">
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">未選択</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCsv(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={18} /> CSVファイルを選択して取り込み
          </Button>
        </SectionCard>

        <StickyActionBar left={<span>入力した内容は本人のアカウントとして発行されます</span>}>
          <ButtonLink href="/rep/roster" variant="secondary" size="lg">
            キャンセル
          </ButtonLink>
          <Button type="submit" size="lg" disabled={pending}>
            <UserPlus size={18} /> {pending ? "処理中…" : "追加して続けて入力"}
          </Button>
        </StickyActionBar>
      </form>
    </AppShell>
  );
}
