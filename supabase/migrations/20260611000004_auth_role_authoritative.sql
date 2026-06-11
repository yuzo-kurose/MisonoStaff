-- =============================================================
-- 20260611000004_auth_role_authoritative.sql
-- 【根本修正】role を JWT ではなく profiles から権威的に判定する。
--
-- 問題:
--   auth_role() は従来 JWT(app_metadata.role) を読んでいた。app_metadata は
--   トークン再発行（再ログイン/自動refresh）までJWTに反映されないため、role 同期前に
--   発行された access token では role が欠落し、RLS の is_admin() が false になる。
--   一方ミドルウェアは getUser()（DBの最新app_metadataを返す）で判定するため、
--   「管理画面は開けるが INSERT が new row violates row-level security policy で弾かれる」
--   という食い違いが起きていた（部署マスタ追加で顕在化）。
--
-- 対策:
--   auth_role() を security definer にして profiles.role を直接読む。
--   ・profiles.role はトリガ同期済みかつ本人変更不可（profiles_update_self が WITH CHECK で
--     role を固定）なので、JWT 同様に改ざんできず権威として信頼できる。
--   ・security definer なので内部の profiles 参照は RLS を迂回する＝profiles ポリシーが
--     auth_role() を呼んでも再帰しない（is_rep_of_branch と同じ方式）。
--   ・トークンの鮮度に一切依存しないため、再ログインなしで即時に正しく判定される。
--   これで is_admin()/is_reception() に依存する全テーブルのRLS書き込みが恒久的に直る。
-- =============================================================

create or replace function public.auth_role()
returns text
language sql stable
security definer set search_path = public
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid()),
    'participant'
  );
$$;
