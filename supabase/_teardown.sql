-- =====================================================================
-- 既存の自前オブジェクトを安全に削除（再実行可能・IF EXISTS）
-- ※ public スキーマ自体は削除しない（Supabaseの権限を壊さないため）
-- ※ アプリ専用のテーブル/関数/型のみ対象。auth.users 等には触れない
-- =====================================================================

-- 1) テーブル（cascade で 依存するポリシー・トリガ・FK・索引も削除）
drop table if exists public.audit_logs                 cascade;
drop table if exists public.notification_logs          cascade;
drop table if exists public.attendances                cascade;
drop table if exists public.refunds                    cascade;
drop table if exists public.payments                   cascade;
drop table if exists public.payment_groups             cascade;
drop table if exists public.participant_value_options  cascade;
drop table if exists public.participant_values         cascade;
drop table if exists public.participants               cascade;
drop table if exists public.applications               cascade;
drop table if exists public.form_field_options         cascade;
drop table if exists public.form_fields                cascade;
drop table if exists public.event_branches             cascade;
drop table if exists public.events                     cascade;
drop table if exists public.forms                      cascade;
drop table if exists public.branches                   cascade;
drop table if exists public.profiles                   cascade;

-- 2) 関数（名前一意のため引数省略可。cascade で auth.users のトリガも除去）
drop function if exists public.checkin_candidates      cascade;
drop function if exists public.batch_check_in          cascade;
drop function if exists public.mark_day_cancelled      cascade;
drop function if exists public.owner_of_participant    cascade;
drop function if exists public.branch_of_participant   cascade;
drop function if exists public.branch_of_application   cascade;
drop function if exists public.is_rep_of_branch        cascade;
drop function if exists public.is_reception            cascade;
drop function if exists public.is_admin                cascade;
drop function if exists public.auth_role               cascade;
drop function if exists public.sync_role_to_auth       cascade;
drop function if exists public.handle_new_user         cascade;
drop function if exists public.set_updated_at          cascade;

-- 3) enum 型
drop type if exists notification_status   cascade;
drop type if exists notification_channel  cascade;
drop type if exists notification_type     cascade;
drop type if exists attendance_method     cascade;
drop type if exists attendance_status     cascade;
drop type if exists payment_status        cascade;
drop type if exists payment_method        cascade;
drop type if exists participant_status    cascade;
drop type if exists application_status    cascade;
drop type if exists price_calc_type       cascade;
drop type if exists field_type            cascade;
drop type if exists event_status          cascade;
drop type if exists entered_via           cascade;
drop type if exists created_via           cascade;
drop type if exists account_status        cascade;
drop type if exists division              cascade;
drop type if exists user_role             cascade;

