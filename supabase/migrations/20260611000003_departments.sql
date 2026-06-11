-- =============================================================
-- 部署（配置先）マスタ
--   当日の持ち場の選択肢。登録/代行入力/マイページのプルダウンで使う。
--   profiles.department は名称(varchar)を非正規化で保持しているため、
--   このテーブルは「選択肢の一覧」を管理する。行を消しても既存 profiles の
--   値はそのまま残る（表示はされるが今後は選択肢に出ない）。
--   閲覧は未ログイン（サインアップ画面）でも必要なので anon にも許可。
--   追加・編集・削除は管理者のみ（RLS）。
-- =============================================================
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(50) not null unique,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_departments_order on public.departments (sort_order, name);

alter table public.departments enable row level security;

grant select on public.departments to anon, authenticated;
grant insert, update, delete on public.departments to authenticated;

-- 有効な部署は全員閲覧可（未ログインのサインアップ画面でも選べる）。管理者は無効分も閲覧可。
drop policy if exists dept_select_active on public.departments;
create policy dept_select_active on public.departments
  for select using (is_active = true or public.is_admin());

-- 追加・更新・削除は管理者のみ
drop policy if exists dept_write_admin on public.departments;
create policy dept_write_admin on public.departments
  for all using (public.is_admin()) with check (public.is_admin());

-- 初期データ（既存の固定24件。表示順を保持）
insert into public.departments (name, sort_order)
values
  ('教祖殿エントランス', 1),
  ('教祖殿地下', 2),
  ('サンクチュアリ', 3),
  ('プラザ', 4),
  ('みたらし', 5),
  ('参道', 6),
  ('天門', 7),
  ('スクエア', 8),
  ('宗務棟', 9),
  ('講堂棟', 10),
  ('研修棟', 11),
  ('設営', 12),
  ('キッチン', 13),
  ('配布', 14),
  ('浄化', 15),
  ('交通本部', 16),
  ('参拝報告', 17),
  ('P1', 18),
  ('P2', 19),
  ('P3', 20),
  ('P4', 21),
  ('P5', 22),
  ('P6', 23),
  ('守山', 24),
  ('未割当', 25)
on conflict (name) do nothing;
