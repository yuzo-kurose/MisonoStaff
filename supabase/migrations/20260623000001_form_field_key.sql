-- フォーム項目に field_key を追加。
-- 固定項目（全イベント共通）を識別するためのキー。予備項目は NULL。
--   lodging  = 宿泊申込
--   outbound = 往路
--   return   = 復路
--   meal     = 食事申込
-- 既存データへの影響：既存の form_fields は field_key が NULL（＝予備項目扱い）になる。
-- 本システムは本番データ未投入のため、イベントは固定項目つきで作り直す運用とする。

alter table public.form_fields
  add column if not exists field_key text;

-- 同一フォーム内で固定キーが重複しないようにする（NULL は対象外）。
create unique index if not exists uq_form_fields_form_key
  on public.form_fields(form_id, field_key)
  where field_key is not null;
