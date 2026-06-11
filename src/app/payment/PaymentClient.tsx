"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, CreditCard, CalendarCheck2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { yen, jpDate } from "@/lib/format";
import { createCheckout } from "./actions";

export type PayItem = {
  participantId: string;
  eventName: string;
  eventDate: string;
  venue: string | null;
  amount: number;
};

export function PaymentClient({ items }: { items: PayItem[] }) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onPay = () => {
    setError(null);
    startTransition(async () => {
      const res = await createCheckout();
      if (res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error ?? "決済を開始できませんでした。");
      }
    });
  };

  return (
    <AppShell role="participant">
      <PageHeader
        title="まとめて決済"
        description="確定済みの複数イベントを1回でお支払いいただけます。"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="お支払い対象はありません"
          description="代表者による確定後、ここに支払い対象が表示されます。確定状況はマイページでご確認ください。"
        />
      ) : (
        <Card className="mx-auto max-w-xl">
          <CardTitle>お支払い明細</CardTitle>
          <ul className="mt-4 divide-y divide-neutral-200">
            {items.map((i) => (
              <li key={i.participantId} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-md text-neutral-900">{i.eventName}</p>
                  <p className="text-body-sm text-neutral-600">
                    {i.eventDate ? jpDate(i.eventDate) : ""}
                  </p>
                </div>
                <span className="flex-none tabular-nums text-body-md text-neutral-900">
                  {yen(i.amount)}
                </span>
              </li>
            ))}
          </ul>

          {/* 合計（強調） */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
            <span className="text-body-md font-medium text-neutral-900">
              合計（{items.length}件）
            </span>
            <span className="text-display-sm font-bold tabular-nums text-primary-900">
              {yen(total)}
            </span>
          </div>

          {error && (
            <div className="mt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="mt-6">
            <Button fullWidth size="lg" disabled={pending} onClick={onPay}>
              <CreditCard size={18} />
              {pending ? "決済画面へ移動中…" : "支払いに進む（カード／PayPay）"}
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-body-sm text-neutral-600">
            <ShieldCheck size={18} className="mt-0.5 flex-none text-success-900" />
            <span>
              決済は Stripe の安全な画面で行われます。カード情報は当システムに保存されません。完了後、自動でマイページに戻ります。
            </span>
          </div>
          <p className="mt-3 text-body-sm text-neutral-500">
            ※ キャンセルは前日まで全額返金、当日は返金なし。イベント単位での部分返金にも対応します。
          </p>
        </Card>
      )}
    </AppShell>
  );
}
