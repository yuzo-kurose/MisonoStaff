-- =============================================================
-- 20260617000001_event_soft_delete.sql
-- イベントの論理削除（ソフトデリート）対応。
--   events 削除は applications→participants→payments→refunds へ CASCADE するため、
--   物理削除は決済・返金履歴を巻き添えにする。deleted_at で非表示にし履歴は保持する。
-- =============================================================

alter table public.events
  add column if not exists deleted_at timestamptz;

-- 未削除イベントの絞り込みを高速化（一覧クエリは deleted_at is null で取得する）。
create index if not exists idx_events_deleted_at on public.events(deleted_at);
