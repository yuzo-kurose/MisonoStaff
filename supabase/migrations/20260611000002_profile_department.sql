-- =============================================================
-- 20260611000002_profile_department.sql
-- profiles に「部署（配置先）」を追加。
--  ・部(division)とは別軸。当日の持ち場を表す固定リスト由来の任意項目。
--  ・固定リストだが将来の増減に耐えるよう enum ではなく varchar で保持する。
--  ・自己サインアップ時に user_metadata.department を保存するため
--    handle_new_user トリガを更新する。
-- =============================================================

alter table public.profiles
  add column if not exists department varchar(50);

-- 新規ユーザ → profiles 自動作成（department を追加）
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, kana, division, department, branch_id, role, created_via)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'kana', ''),
    (new.raw_user_meta_data ->> 'division')::division,
    nullif(new.raw_user_meta_data ->> 'department', ''),
    (new.raw_user_meta_data ->> 'branch_id')::uuid,
    'participant',
    'self'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
