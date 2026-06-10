"use client";

import { useState, useTransition } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardTitle, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
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
        <Alert variant="info">決済対象（確定済み・未決済）はありません。</Alert>
      ) : (
        <Card className="mx-auto max-w-xl">
          <CardTitle>お支払い明細</CardTitle>
          <ul className="mt-4 divide-y divide-neutral-200">
            {items.map((i) => (
              <li key={i.participantId} className="flex justify-between py-3">
                <div>
                  <p className="text-body-md text-neutral-900">{i.eventName}</p>
                  <p className="text-body-sm text-neutral-600">
                    {i.eventDate ? jpDate(i.eventDate) : ""}
                  </p>
                </div>
                <span className="text-body-md text-neutral-900">{yen(i.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4">
            <span className="text-heading-sm text-neutral-900">合計</span>
            <span className="text-heading-sm text-primary-900">{yen(total)}</span>
          </div>

          {error && (
            <div className="mt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <div className="mt-6">
            <Button fullWidth size="lg" disabled={pending} onClick={onPay}>
              {pending ? "決済画面へ移動中…" : "支払いに進む（カード／PayPay）"}
            </Button>
          </div>
          <div className="mt-4">
            <Alert variant="info">
              決済は Stripe の安全な画面で行われます。完了後、自動でマイページに戻ります。
            </Alert>
          </div>
          <p className="mt-3 text-body-sm text-neutral-600">
            ※ キャンセルは前日まで全額返金、当日は返金なし。イベント単位での部分返金にも対応します。
          </p>
        </Card>
      )}
    </AppShell>
  );
}
