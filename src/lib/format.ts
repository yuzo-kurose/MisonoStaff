/** 円表記（整数・カンマ区切り） */
export function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/** 日付表記 YYYY/MM/DD（曜日付き） */
export function jpDate(iso: string): string {
  const d = new Date(iso);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}（${w}）`;
}

/** 開催期間表記。初日と当日が異なれば「初日 〜 当日」、同じなら単日。 */
export function eventPeriod(start: string | null | undefined, end: string): string {
  if (start && start !== end) return `${jpDate(start)} 〜 ${jpDate(end)}`;
  return jpDate(end);
}
