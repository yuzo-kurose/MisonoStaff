import type { ReactNode } from "react";

/**
 * スマホ用のレコードカード。テーブル1行ぶんを縦積みで見やすく表示する。
 * 使い方：`<div className="md:hidden space-y-2">` 内に並べ、PC では従来の Table を
 * `hidden md:block` で表示する（テーブル↔カードの出し分け）。
 */
export function MobileRecord({
  title,
  badge,
  rows,
  action,
}: {
  title: ReactNode;
  badge?: ReactNode;
  rows: { label: string; value: ReactNode }[];
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-body-md font-medium text-neutral-900">{title}</p>
        {badge}
      </div>
      {rows.length > 0 && (
        <dl className="mt-2 space-y-1">
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
  );
}
