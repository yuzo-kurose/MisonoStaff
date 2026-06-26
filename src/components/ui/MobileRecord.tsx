"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * スマホ用のレコード行（アコーディオン）。
 * - 折りたたみ時：氏名（title）＋要約（summary：金額など）＋バッジ＋開閉アイコンの1行でコンパクト表示。
 * - 展開時：詳細（rows）と操作（action）を表示。
 * 一覧の件数が多くてもスクロール量を抑え、必要な行だけ詳細を開ける。
 * 使い方：`<div className="md:hidden space-y-2">` 内に並べ、PC では Table を `hidden md:block` で出す。
 */
export function MobileRecord({
  title,
  badge,
  summary,
  rows,
  action,
  defaultOpen = false,
}: {
  title: ReactNode;
  badge?: ReactNode;
  summary?: ReactNode; // 折りたたみ時に見せる要約値（例：金額）
  rows: { label: string; value: ReactNode }[];
  action?: ReactNode;
  defaultOpen?: boolean;
}) {
  const hasDetails = rows.length > 0 || !!action;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-white shadow-sm">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={hasDetails ? open : undefined}
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left ${
          hasDetails ? "hover:bg-neutral-50" : "cursor-default"
        }`}
      >
        <p className="min-w-0 flex-1 truncate text-body-md font-medium text-neutral-900">{title}</p>
        {summary && (
          <span className="flex-none text-body-sm tabular-nums text-neutral-700">{summary}</span>
        )}
        {badge}
        {hasDetails && (
          <ChevronDown
            size={18}
            className={`flex-none text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        )}
      </button>

      {open && hasDetails && (
        <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
          {rows.length > 0 && (
            <dl className="space-y-1">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-3 text-body-sm">
                  <dt className="flex-none text-neutral-500">{r.label}</dt>
                  <dd className="text-right text-neutral-900">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>
      )}
    </div>
  );
}
