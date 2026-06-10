-- =============================================================
-- 20260607000002_auth_profile_sync.sql
-- Supabase Auth 連携:
--  (1) サインアップ時に profiles を自動作成
--  (2) profiles.role を auth.users.app_metadata に同期（RLS高速化用）
-- =============================================================

-- ---------- (1) 新規ユーザ → profiles 自動作成 ----------
-- 自己登録時。raw_user_meta_data.name を初期氏名に使う。
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, kana, division, branch_id, role, created_via)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'kana', ''),
    (new.raw_user_meta_data ->> 'division')::division,
    (new.raw_user_meta_data ->> 'branch_id')::uuid,
    'participant',
    'self'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- (2) role を app_metadata へ同期 ----------
-- RLS ポリシーは auth.jwt() から role を読むため、profiles.role 変更を
-- auth.users.raw_app_meta_data.role に複製する。
create or replace function public.sync_role_to_auth()
returns trigger
language plpgsql security definer set search_path = public, auth
as $$
begin
  update auth.users
     set raw_app_meta_data =
         coalesce(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('role', new.role::text)
   where id = new.id;
  return new;
end;
$$;

create trigger trg_sync_role_to_auth
  after insert or update of role on public.profiles
  for each row execute function public.sync_role_to_auth();

-- 注意:
--  ・app_metadata の更新は次回トークン発行時に JWT へ反映される。
--    既存ログインユーザの role を変えた場合はトークン再発行（再ログイン/refresh）が必要。
--  ・代行入力（proxy）でのアカウント発行は、サーバ側(service_role)で auth.admin.createUser を
--    用い、その後 profiles.created_via を 'proxy' に更新する運用とする。
