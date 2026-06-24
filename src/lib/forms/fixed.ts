/**
 * 全イベント共通の固定フォーム項目。
 * - すべて単一選択（select_single）。
 * - 選択肢・金額は「イベントごと」にフォーム編集画面で設定する（option_based）。
 * - field_key で固定項目を識別する。予備項目（最大5個）は field_key = null。
 */
export const FIXED_FIELDS = [
  { key: "fee", label: "参加費" },
  { key: "outbound", label: "往路" },
  { key: "return", label: "復路" },
] as const;

export const FIXED_FIELD_KEYS = FIXED_FIELDS.map((f) => f.key) as readonly string[];

/** 予備項目（field_key=null）の最大数。 */
export const MAX_SPARE_FIELDS = 5;
