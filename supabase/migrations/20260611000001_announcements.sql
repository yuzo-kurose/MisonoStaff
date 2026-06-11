-- =============================================================
-- 連絡事項（お知らせ）テーブル
--   ホーム画面に表示。公開中(is_published)はログイン有無を問わず閲覧可。
--   作成・編集・削除は管理者のみ（RLS）。
-- =============================================================
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  level         varchar(16) not null default 'info',   -- 'important' | 'info'
  title         varchar(200) not null,
  body          text not null,
  is_published  boolean not null default true,
  published_at  timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint announcements_level_check check (level in ('important','info'))
);

create index if not exists idx_announcements_pub on public.announcements (is_published, published_at desc);

alter table public.announcements enable row level security;

-- 権限（RLSで最終的に制御するが、ロールにテーブル権限を付与）
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- 公開中は全員閲覧可（未ログインのホームでも表示）。管理者は非公開も閲覧可。
drop policy if exists ann_select_published on public.announcements;
create policy ann_select_published on public.announcements
  for select using (is_published = true or public.is_admin());

-- 作成・更新・削除は管理者のみ
drop policy if exists ann_write_admin on public.announcements;
create policy ann_write_admin on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());
