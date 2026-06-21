-- =============================================================
-- 20260622000001_form_templates.sql
-- 申込フォームのテンプレート保存。
--   フォーム項目一式(JSON)を名前付きで保存し、別イベントのフォーム作成時に読み込める。
--   管理者のみ作成・参照・削除できる（is_admin）。
-- =============================================================

create table if not exists public.form_templates (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(150) not null,
  fields      jsonb not null default '[]'::jsonb,  -- ClientField[] 相当
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.form_templates enable row level security;

drop policy if exists form_templates_admin on public.form_templates;
create policy form_templates_admin on public.form_templates
  for all using (public.is_admin()) with check (public.is_admin());
