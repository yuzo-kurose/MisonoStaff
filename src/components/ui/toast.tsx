"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; text: string; variant: ToastVariant };

// 画面のどこにいても完了/失敗を通知するための簡易トースト。
// import { toast } して任意のクライアントから呼べる（プロバイダ不要）。
let listeners: ((t: ToastItem) => void)[] = [];
let counter = 0;

export function toast(text: string, variant: ToastVariant = "success") {
  const item: ToastItem = { id: ++counter, text, variant };
  listeners.forEach((l) => l(item));
}

/** ルートに一度だけ配置するトースト表示器。 */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(onToast);
    return () => {
      listeners = listeners.filter((l) => l !== onToast);
    };
  }, []);

  const dismiss = (id: number) => setItems((s) => s.filter((x) => x.id !== id));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-body-md shadow-lg ${
            t.variant === "success"
              ? "border-success-200 bg-success-50 text-success-900"
              : "border-error-200 bg-error-50 text-error-900"
          }`}
        >
          {t.variant === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 flex-none" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 flex-none" />
          )}
          <span className="flex-1">{t.text}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="閉じる"
            className="flex-none rounded p-0.5 hover:bg-neutral-900/5"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
