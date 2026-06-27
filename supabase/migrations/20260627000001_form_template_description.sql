-- =============================================================
-- 20260627000001_form_template_description.sql
-- 申込フォームのテンプレートに「説明文」を保存できるようにする。
--   既存データへの影響なし（NULL 許容で追加）。
-- =============================================================

alter table public.form_templates
  add column if not exists description text;
