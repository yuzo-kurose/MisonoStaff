-- =====================================================================
-- 神苑スタッフ : リセット＆一括適用（再実行可能）
-- 既存の自前オブジェクトを削除 → スキーマ/RLS/関数/トリガ/シードを再構築
-- ※実データ（参加者/決済）がある場合は実行しないこと。今は安全（シードのみ）。
-- =====================================================================

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



-- =====================================================================
-- 神苑スタッフ システム : 一括適用スクリプト（自動生成）
-- Supabase ダッシュボード SQL Editor に貼り付けて実行してください。
-- 構成: migrations(5) を順に適用 → seed 投入
-- =====================================================================


-- ---------------------------------------------------------------------
-- FILE: supabase/migrations/20260607000001_init_schema.sql
-- ---------------------------------------------------------------------
-- =============================================================
-- 神苑(misono)スタッフ参加申込システム
-- 20260607000001_init_schema.sql
-- enum型・テーブル・インデックス・updated_atトリガ
-- 前提: データ定義書 v2 (Supabase + Stripe)
-- =============================================================

-- ---------- 拡張 ----------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- enum 型 ----------
create type user_role           as enum ('participant','representative','admin','reception');
-- 部（所属組織区分）: 学生部/大学生部/成人部/男子部/一般
create type division            as enum ('student','university','adult','mens','general');
create type account_status      as enum ('active','inactive');
create type created_via         as enum ('self','proxy');
create type entered_via         as enum ('self','proxy');
create type event_status        as enum ('draft','published','closed');
create type field_type          as enum ('text','textarea','select_single','select_multiple','number','date');
create type price_calc_type     as enum ('none','per_unit','option_based');
create type application_status   as enum ('open','confirmed');
create type participant_status   as enum ('applying','confirmed','paid','cancelled');
create type payment_method       as enum ('credit_card','paypay');
create type payment_status       as enum ('requested','completed','failed','refunded');
create type attendance_status    as enum ('not_arrived','checked_in','day_cancelled');
create type attendance_method    as enum ('qr','name_search');
create type notification_type    as enum ('application_complete','payment_request','payment_reminder','payment_complete','cancellation','refund');
create type notification_channel as enum ('email','line');
create type notification_status  as enum ('sent','failed');

-- ---------- 共通: updated_at 自動更新 ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- アカウント・マスタ
-- =============================================================

-- profiles（auth.users と 1:1。認証情報は auth.users 側）
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        varchar(100) not null default '',
  kana        varchar(100) not null default '',  -- 読み仮名
  role        user_role    not null default 'participant',
  division    division,                   -- 部（学生部/大学生部/成人部/男子部/一般）
  branch_id   uuid,                       -- 所属拠点。FK は branches 作成後に付与
  line_user_id varchar(100),
  status      account_status not null default 'active',
  created_via created_via  not null default 'self',
  -- 当日受付用の人単位QRトークン（イベント別ではない。1スキャンで複数イベント受付に使用）
  checkin_token uuid not null unique default gen_random_uuid(),
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- branches（拠点マスタ）
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(100) not null,
  code        varchar(50) unique,
  representative_user_id uuid references public.profiles(id) on delete set null,
  region      varchar(100),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- profiles.branch_id の FK を後付け
alter table public.profiles
  add constraint profiles_branch_id_fkey
  foreign key (branch_id) references public.branches(id) on delete set null;

create index idx_profiles_branch on public.profiles(branch_id);
create index idx_branches_rep    on public.branches(representative_user_id);

-- =============================================================
-- イベント・フォーム
-- =============================================================

create table public.forms (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(150) not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(150) not null,
  event_date  date not null,
  venue       varchar(150),               -- 会場（同日複数会場の受付スコープ用）
  application_deadline date not null,
  capacity    integer,
  form_id     uuid not null references public.forms(id),
  status      event_status not null default 'draft',
  duplicated_from_event_id uuid references public.events(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_events_status on public.events(status);

create table public.event_branches (
  event_id  uuid not null references public.events(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (event_id, branch_id)
);

create table public.form_fields (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.forms(id) on delete cascade,
  label       varchar(150) not null,
  field_type  field_type not null,
  is_required boolean not null default false,
  sort_order  integer not null,
  price_calc_type price_calc_type not null default 'none',
  unit_price  integer,                    -- per_unit 時（円）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_form_fields_form on public.form_fields(form_id);

create table public.form_field_options (
  id            uuid primary key default gen_random_uuid(),
  form_field_id uuid not null references public.form_fields(id) on delete cascade,
  label         varchar(150) not null,
  price         integer,                  -- option_based 時（円）
  sort_order    integer not null
);
create index idx_field_options_field on public.form_field_options(form_field_id);

-- =============================================================
-- 申込・参加者
-- =============================================================

create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  branch_id    uuid not null references public.branches(id),
  status       application_status not null default 'open',
  confirmed_at timestamptz,
  confirmed_by_user_id uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, branch_id)
);
create index idx_applications_event  on public.applications(event_id);
create index idx_applications_branch on public.applications(branch_id);

create table public.participants (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id        uuid not null references public.profiles(id),
  status         participant_status not null default 'applying',
  total_amount   integer not null default 0,  -- 円
  entered_via    entered_via not null,
  entered_by_user_id uuid references public.profiles(id),
  cancelled_at   timestamptz,
  cancel_reason  varchar(255),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, user_id)
);
create index idx_participants_app    on public.participants(application_id);
create index idx_participants_user   on public.participants(user_id);
create index idx_participants_status on public.participants(status);

create table public.participant_values (
  id            uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  form_field_id  uuid not null references public.form_fields(id),
  value          varchar(500),
  unique (participant_id, form_field_id)
);
create index idx_pvalues_participant on public.participant_values(participant_id);

create table public.participant_value_options (
  participant_value_id uuid not null references public.participant_values(id) on delete cascade,
  form_field_option_id uuid not null references public.form_field_options(id),
  primary key (participant_value_id, form_field_option_id)
);

-- =============================================================
-- 決済・返金（Stripe / まとめ決済対応）
--   payment_groups : 実際のStripe取引（1人が複数イベントを1回で決済）
--   payments       : payment_group 内の「イベント(participant)ごとの按分」
--   refunds        : payments(イベント単位)に対する返金（部分返金可）
-- =============================================================

-- payment_groups（Stripe Checkout / PaymentIntent 1件 = 1グループ）
create table public.payment_groups (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id),  -- 支払者本人
  total_amount   integer not null,         -- 円（按分合計）
  method         payment_method,
  status         payment_status not null default 'requested',
  stripe_customer_id          varchar(100),
  stripe_checkout_session_id  varchar(100),
  stripe_payment_intent_id    varchar(100) unique,
  checkout_url        text,
  checkout_expires_at timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_paygroups_user   on public.payment_groups(user_id);
create index idx_paygroups_status on public.payment_groups(status);

-- payments（イベント=participant ごとの按分。1 participant につき1行）
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  payment_group_id uuid not null references public.payment_groups(id) on delete cascade,
  participant_id   uuid not null unique references public.participants(id) on delete cascade,
  amount           integer not null,       -- 円（このイベント分）
  status           payment_status not null default 'requested',
  refunded_amount  integer not null default 0,  -- 部分返金累計
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_payments_group       on public.payments(payment_group_id);
create index idx_payments_participant  on public.payments(participant_id);
create index idx_payments_status       on public.payments(status);

create table public.refunds (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.payments(id) on delete cascade,
  amount      integer not null,            -- 円（イベント単位／原則全額）
  reason      varchar(255),
  refunded_by_user_id uuid not null references public.profiles(id),
  stripe_refund_id varchar(100) unique,
  refunded_at timestamptz not null default now()
);
create index idx_refunds_payment on public.refunds(payment_id);

-- =============================================================
-- 受付・出欠
-- =============================================================

create table public.attendances (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  status         attendance_status not null default 'not_arrived',
  checked_in_at  timestamptz,
  received_by_user_id uuid references public.profiles(id),
  method         attendance_method,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- =============================================================
-- ログ
-- =============================================================

create table public.notification_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id),
  participant_id uuid references public.participants(id) on delete set null,
  type        notification_type not null,
  channel     notification_channel not null,
  destination varchar(255) not null,
  status      notification_status not null,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_notif_user on public.notification_logs(user_id);

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id),
  action       varchar(50) not null,
  target_type  varchar(50) not null,
  target_id    uuid not null,
  detail       jsonb,
  created_at   timestamptz not null default now()
);
create index idx_audit_target on public.audit_logs(target_type, target_id);

-- =============================================================
-- updated_at トリガを各テーブルへ
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','branches','forms','events','form_fields',
    'applications','participants','payment_groups','payments','attendances'
  ] loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- FILE: supabase/migrations/20260607000002_auth_profile_sync.sql
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- FILE: supabase/migrations/20260607000003_rls_policies.sql
-- ---------------------------------------------------------------------
-- =============================================================
-- 20260607000003_rls_policies.sql
-- RLS 有効化 + ヘルパ関数 + ポリシー
-- 方針サマリ（データ定義書 v2 §8）:
--   participant : 自分のデータを SELECT（修正・削除不可）
--   representative: 自拠点の申込/参加者を編集・確定
--   admin       : 全件全操作
--   reception   : 受付(attendances)の SELECT/UPDATE、参加者検索 SELECT
--   service_role: RLS をバイパス（Stripe Webhook・通知・監査の書込）
-- =============================================================

-- ---------- ヘルパ関数 ----------

-- JWT の app_metadata.role（未設定時は participant）
create or replace function public.auth_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'participant');
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_reception()
returns boolean language sql stable as $$
  select public.auth_role() in ('reception','admin');
$$;

-- 指定拠点の代表者か（branches.representative_user_id が authoritative）
create or replace function public.is_rep_of_branch(b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.branches
     where id = b and representative_user_id = auth.uid()
  );
$$;

-- 申込IDから拠点IDを取得（ポリシー内の再利用用）
create or replace function public.branch_of_application(app_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select branch_id from public.applications where id = app_id;
$$;

-- 参加者IDから拠点IDを取得
create or replace function public.branch_of_participant(p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.branch_id
    from public.participants p
    join public.applications a on a.id = p.application_id
   where p.id = p_id;
$$;

-- 参加者の本人user_idを取得
create or replace function public.owner_of_participant(p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.participants where id = p_id;
$$;

-- =============================================================
-- RLS 有効化
-- =============================================================
alter table public.profiles                  enable row level security;
alter table public.branches                  enable row level security;
alter table public.forms                     enable row level security;
alter table public.events                    enable row level security;
alter table public.event_branches            enable row level security;
alter table public.form_fields               enable row level security;
alter table public.form_field_options        enable row level security;
alter table public.applications              enable row level security;
alter table public.participants             enable row level security;
alter table public.participant_values       enable row level security;
alter table public.participant_value_options enable row level security;
alter table public.payment_groups            enable row level security;
alter table public.payments                  enable row level security;
alter table public.refunds                   enable row level security;
alter table public.attendances               enable row level security;
alter table public.notification_logs         enable row level security;
alter table public.audit_logs                enable row level security;

-- =============================================================
-- profiles
-- =============================================================
-- 本人は自分の行を参照
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());
-- 代表者は自拠点メンバーを参照
create policy profiles_select_rep on public.profiles
  for select using (public.is_rep_of_branch(branch_id));
-- 管理者・受付は全件参照
create policy profiles_select_staff on public.profiles
  for select using (public.auth_role() in ('admin','reception'));
-- 本人は自分の行を更新（role/branch_id は変更させない: WITH CHECK で固定）
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and branch_id is not distinct from (select branch_id from public.profiles where id = auth.uid())
  );
-- 管理者は全件更新・追加
create policy profiles_all_admin on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- branches / forms / events / event_branches / form_fields / form_field_options
--   読み取り = 認証済み全員（イベント/拠点/フォーム選択UI用）
--   書き込み = 管理者のみ
-- =============================================================
create policy branches_select_auth on public.branches
  for select using (auth.role() = 'authenticated');
create policy branches_write_admin on public.branches
  for all using (public.is_admin()) with check (public.is_admin());

create policy forms_select_auth on public.forms
  for select using (auth.role() = 'authenticated');
create policy forms_write_admin on public.forms
  for all using (public.is_admin()) with check (public.is_admin());

-- events: 公開済みは全員、draft等は管理者のみ
create policy events_select_published on public.events
  for select using (status = 'published' or public.is_admin());
create policy events_write_admin on public.events
  for all using (public.is_admin()) with check (public.is_admin());

create policy ebr_select_auth on public.event_branches
  for select using (auth.role() = 'authenticated');
create policy ebr_write_admin on public.event_branches
  for all using (public.is_admin()) with check (public.is_admin());

create policy ff_select_auth on public.form_fields
  for select using (auth.role() = 'authenticated');
create policy ff_write_admin on public.form_fields
  for all using (public.is_admin()) with check (public.is_admin());

create policy ffo_select_auth on public.form_field_options
  for select using (auth.role() = 'authenticated');
create policy ffo_write_admin on public.form_field_options
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- applications（拠点単位の束）
-- =============================================================
-- 参照: 管理者 / 自拠点代表者 / 自分が参加する申込の本人
create policy app_select on public.applications
  for select using (
    public.is_admin()
    or public.is_rep_of_branch(branch_id)
    or exists (
      select 1 from public.participants p
       where p.application_id = applications.id and p.user_id = auth.uid()
    )
  );
-- 作成: 認証済み（自己申込の find-or-create / 代表者の代行）。status は open のみ
create policy app_insert on public.applications
  for insert with check (
    status = 'open'
    and (public.is_admin() or public.is_rep_of_branch(branch_id) or auth.role() = 'authenticated')
  );
-- 更新（確定など）: 自拠点代表者 or 管理者
create policy app_update on public.applications
  for update using (public.is_admin() or public.is_rep_of_branch(branch_id))
  with check (public.is_admin() or public.is_rep_of_branch(branch_id));
-- 削除: 管理者のみ
create policy app_delete on public.applications
  for delete using (public.is_admin());

-- =============================================================
-- participants（個人）
-- =============================================================
-- 参照: 本人 / 自拠点代表者 / 管理者 / 受付
create policy part_select on public.participants
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_reception()
    or public.is_rep_of_branch(public.branch_of_application(application_id))
  );
-- 作成: 本人の自己申込(self) / 自拠点代表者の代行 / 管理者
create policy part_insert on public.participants
  for insert with check (
    public.is_admin()
    or public.is_rep_of_branch(public.branch_of_application(application_id))
    or (user_id = auth.uid() and entered_via = 'self')
  );
-- 更新・削除: 代表者(自拠点)・管理者のみ（本人は不可＝要件14）
create policy part_update on public.participants
  for update using (public.is_admin() or public.is_rep_of_branch(public.branch_of_application(application_id)))
  with check  (public.is_admin() or public.is_rep_of_branch(public.branch_of_application(application_id)));
create policy part_delete on public.participants
  for delete using (public.is_admin() or public.is_rep_of_branch(public.branch_of_application(application_id)));

-- =============================================================
-- participant_values
--   参照は participant の可視性に準ずる。編集は 本人(self,作成時)/代表者/管理者
-- =============================================================
create policy pv_select on public.participant_values
  for select using (
    public.owner_of_participant(participant_id) = auth.uid()
    or public.is_admin()
    or public.is_reception()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  );
create policy pv_insert on public.participant_values
  for insert with check (
    public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
    or public.owner_of_participant(participant_id) = auth.uid()
  );
create policy pv_update on public.participant_values
  for update using (public.is_admin() or public.is_rep_of_branch(public.branch_of_participant(participant_id)))
  with check  (public.is_admin() or public.is_rep_of_branch(public.branch_of_participant(participant_id)));
create policy pv_delete on public.participant_values
  for delete using (public.is_admin() or public.is_rep_of_branch(public.branch_of_participant(participant_id)));

-- participant_value_options は親 participant_values に追従
create policy pvo_select on public.participant_value_options
  for select using (
    exists (select 1 from public.participant_values v
             where v.id = participant_value_id
               and (public.owner_of_participant(v.participant_id) = auth.uid()
                    or public.is_admin() or public.is_reception()
                    or public.is_rep_of_branch(public.branch_of_participant(v.participant_id))))
  );
create policy pvo_write on public.participant_value_options
  for all using (
    exists (select 1 from public.participant_values v
             where v.id = participant_value_id
               and (public.is_admin()
                    or public.is_rep_of_branch(public.branch_of_participant(v.participant_id))
                    or public.owner_of_participant(v.participant_id) = auth.uid()))
  )
  with check (
    exists (select 1 from public.participant_values v
             where v.id = participant_value_id
               and (public.is_admin()
                    or public.is_rep_of_branch(public.branch_of_participant(v.participant_id))
                    or public.owner_of_participant(v.participant_id) = auth.uid()))
  );

-- =============================================================
-- payment_groups（まとめ決済の取引単位。書込は service_role のみ）
-- =============================================================
create policy paygroup_select on public.payment_groups
  for select using (
    user_id = auth.uid()        -- 支払者本人
    or public.is_admin()
  );
-- INSERT/UPDATE/DELETE ポリシーなし → service_role 以外は書込不可

-- =============================================================
-- payments（イベント按分。書込は service_role のみ。クライアントは参照のみ）
-- =============================================================
create policy pay_select on public.payments
  for select using (
    public.owner_of_participant(participant_id) = auth.uid()
    or public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  );
-- INSERT/UPDATE/DELETE ポリシーは作らない → service_role 以外は書込不可

-- =============================================================
-- refunds（参照=本人/管理者。書込=service_role のみ）
-- =============================================================
create policy refund_select on public.refunds
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
       where p.id = refunds.payment_id
         and public.owner_of_participant(p.participant_id) = auth.uid()
    )
  );

-- =============================================================
-- attendances（受付/代表者/管理者が編集。本人は自分の出欠参照）
-- =============================================================
create policy att_select on public.attendances
  for select using (
    public.owner_of_participant(participant_id) = auth.uid()
    or public.is_reception()
    or public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  );
create policy att_insert on public.attendances
  for insert with check (
    public.is_reception() or public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  );
create policy att_update on public.attendances
  for update using (
    public.is_reception() or public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  )
  with check (
    public.is_reception() or public.is_admin()
    or public.is_rep_of_branch(public.branch_of_participant(participant_id))
  );

-- =============================================================
-- notification_logs / audit_logs（参照=管理者のみ。書込=service_role）
-- =============================================================
create policy notif_select_admin on public.notification_logs
  for select using (public.is_admin());

create policy audit_select_admin on public.audit_logs
  for select using (public.is_admin());

-- 監査ログは本人参照を許す場合は別途追加可。


-- ---------------------------------------------------------------------
-- FILE: supabase/migrations/20260607000004_reception_rpc.sql
-- ---------------------------------------------------------------------
-- =============================================================
-- 20260607000004_reception_rpc.sql
-- 当日受付（1スキャンで複数イベント一括受付）用の RPC
--   いずれも SECURITY INVOKER = 呼び出し元の RLS が効く
--   （受付/代表者/管理者のみ実質的に実行可能）
-- =============================================================

-- 受付候補の取得:
--   人単位QRトークン(p_token) + 受付日(p_date)[ + 会場(p_venue)] から、
--   その人が当日参加する（確定/支払済の）イベントと受付状況を一覧で返す。
create or replace function public.checkin_candidates(
  p_token uuid,
  p_date  date,
  p_venue text default null
)
returns table (
  participant_id     uuid,
  event_id           uuid,
  event_name         text,
  venue              text,
  branch_id          uuid,
  participant_status participant_status,
  attendance_status  attendance_status,
  user_id            uuid,
  user_name          text
)
language sql stable security invoker set search_path = public as $$
  select
    p.id,
    e.id,
    e.name::text,
    e.venue::text,
    a.branch_id,
    p.status,
    coalesce(att.status, 'not_arrived'::attendance_status),
    pr.id,
    pr.name::text
  from public.profiles pr
  join public.participants p  on p.user_id = pr.id
  join public.applications a  on a.id = p.application_id
  join public.events e        on e.id = a.event_id
  left join public.attendances att on att.participant_id = p.id
  where pr.checkin_token = p_token
    and e.event_date = p_date
    and (p_venue is null or e.venue = p_venue)
    and p.status in ('confirmed', 'paid')
  order by e.name;
$$;

-- 一括受付:
--   指定 participant 群を一括で checked_in に。既に checked_in の行は変更しない。
--   返り値 = 新たに受付済みにした件数。
create or replace function public.batch_check_in(
  p_participant_ids uuid[],
  p_method attendance_method default 'qr'
)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  n integer;
begin
  insert into public.attendances
    (participant_id, status, checked_in_at, received_by_user_id, method)
  select pid, 'checked_in', now(), auth.uid(), p_method
  from unnest(p_participant_ids) as pid
  on conflict (participant_id) do update
    set status              = 'checked_in',
        checked_in_at       = now(),
        received_by_user_id = auth.uid(),
        method              = p_method
    where public.attendances.status <> 'checked_in';

  get diagnostics n = row_count;
  return n;
end;
$$;

-- 当日キャンセル（イベント個別。複数参加でも特定イベントだけ欠席を記録）
create or replace function public.mark_day_cancelled(
  p_participant_id uuid
)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  insert into public.attendances
    (participant_id, status, received_by_user_id)
  values (p_participant_id, 'day_cancelled', auth.uid())
  on conflict (participant_id) do update
    set status              = 'day_cancelled',
        received_by_user_id = auth.uid();
end;
$$;


-- ---------------------------------------------------------------------
-- FILE: supabase/migrations/20260609000001_event_period.sql
-- ---------------------------------------------------------------------
-- =============================================================
-- 20260609000001_event_period.sql
-- 開催を「期間」に対応：start_date（開催初日＝受付日）を追加。
--   event_date は従来どおり「開催当日（最終日）」として扱う。
--   開催期間 = start_date 〜 event_date（例：土曜受付〜日曜当日）
-- 受付候補は「受付日が開催期間内」で判定するよう変更。
-- =============================================================

alter table public.events
  add column if not exists start_date date;

-- 既存データは単日扱い（start_date = event_date）
update public.events set start_date = event_date where start_date is null;

-- 受付候補：p_date が [start_date, event_date] の範囲に入るイベントを対象に
create or replace function public.checkin_candidates(
  p_token uuid,
  p_date  date,
  p_venue text default null
)
returns table (
  participant_id     uuid,
  event_id           uuid,
  event_name         text,
  venue              text,
  branch_id          uuid,
  participant_status participant_status,
  attendance_status  attendance_status,
  user_id            uuid,
  user_name          text
)
language sql stable security invoker set search_path = public as $$
  select
    p.id,
    e.id,
    e.name::text,
    e.venue::text,
    a.branch_id,
    p.status,
    coalesce(att.status, 'not_arrived'::attendance_status),
    pr.id,
    pr.name::text
  from public.profiles pr
  join public.participants p  on p.user_id = pr.id
  join public.applications a  on a.id = p.application_id
  join public.events e        on e.id = a.event_id
  left join public.attendances att on att.participant_id = p.id
  where pr.checkin_token = p_token
    and p_date between coalesce(e.start_date, e.event_date) and e.event_date
    and (p_venue is null or e.venue = p_venue)
    and p.status in ('confirmed', 'paid')
  order by e.name;
$$;


-- ---------------------------------------------------------------------
-- FILE: supabase/seed.sql
-- ---------------------------------------------------------------------
-- =============================================================
-- seed.sql  動作確認用サンプルデータ
--   supabase db reset 時に自動適用、または SQL Editor で実行。
--   ※ users/profiles は auth.users への FK があるため、
--     管理者アカウントは Supabase Auth でユーザー作成後に §4 を実行する。
-- =============================================================

-- ---------- 1. 拠点マスタ ----------
insert into public.branches (id, name, code, region, is_active) values
  ('11111111-1111-1111-1111-111111111111', '東京拠点', 'TKY', '関東', true),
  ('22222222-2222-2222-2222-222222222222', '大阪拠点', 'OSK', '近畿', true),
  ('33333333-3333-3333-3333-333333333333', '福岡拠点', 'FUK', '九州', true);

-- ---------- 2. フォーム（イベントごとに1つ）----------
insert into public.forms (id, name, description) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '元旦祭 申込フォーム', null),
  ('aaaaaaa1-0000-0000-0000-000000000002', '記念大祭 設営フォーム', null),
  ('aaaaaaa1-0000-0000-0000-000000000003', '合宿 申込フォーム', null);

-- 元旦祭フォーム項目
insert into public.form_fields
  (id, form_id, label, field_type, is_required, sort_order, price_calc_type, unit_price) values
  ('bbbbbbb1-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', '食事', 'select_single', true, 1, 'option_based', null),
  ('bbbbbbb1-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', '送迎バス利用人数', 'number', false, 2, 'per_unit', 500);
insert into public.form_field_options (form_field_id, label, price, sort_order) values
  ('bbbbbbb1-0000-0000-0000-000000000001', 'なし', 0, 1),
  ('bbbbbbb1-0000-0000-0000-000000000001', 'お弁当（並）', 800, 2),
  ('bbbbbbb1-0000-0000-0000-000000000001', 'お弁当（特上）', 1500, 3);

-- 記念大祭 設営フォーム項目
insert into public.form_fields
  (id, form_id, label, field_type, is_required, sort_order, price_calc_type, unit_price) values
  ('bbbbbbb2-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000002', '希望作業', 'select_single', true, 1, 'none', null),
  ('bbbbbbb2-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000002', 'スタッフTシャツ', 'select_single', false, 2, 'option_based', null);
insert into public.form_field_options (form_field_id, label, price, sort_order) values
  ('bbbbbbb2-0000-0000-0000-000000000001', '設営', 0, 1),
  ('bbbbbbb2-0000-0000-0000-000000000001', '受付補助', 0, 2),
  ('bbbbbbb2-0000-0000-0000-000000000001', '撤収', 0, 3),
  ('bbbbbbb2-0000-0000-0000-000000000002', '不要', 0, 1),
  ('bbbbbbb2-0000-0000-0000-000000000002', 'S', 1200, 2),
  ('bbbbbbb2-0000-0000-0000-000000000002', 'M', 1200, 3),
  ('bbbbbbb2-0000-0000-0000-000000000002', 'L', 1200, 4);

-- 合宿フォーム項目
insert into public.form_fields
  (id, form_id, label, field_type, is_required, sort_order, price_calc_type, unit_price) values
  ('bbbbbbb3-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000003', '宿泊数', 'number', true, 1, 'per_unit', 3000),
  ('bbbbbbb3-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000003', '食物アレルギー', 'textarea', false, 2, 'none', null);

-- ---------- 3. イベント（同日複数開催の例：7/12に2件）----------
insert into public.events
  (id, name, event_date, venue, application_deadline, capacity, form_id, status) values
  ('ccccccc1-0000-0000-0000-000000000001', '元旦祭 奉仕',       '2026-07-12', '本殿',       '2026-06-25', 300, 'aaaaaaa1-0000-0000-0000-000000000001', 'published'),
  ('ccccccc1-0000-0000-0000-000000000002', '記念大祭 設営奉仕', '2026-07-12', '第二会場',   '2026-06-25', 150, 'aaaaaaa1-0000-0000-0000-000000000002', 'published'),
  ('ccccccc1-0000-0000-0000-000000000003', '奉仕体験合宿',     '2026-08-03', '研修センター', '2026-07-25',  80, 'aaaaaaa1-0000-0000-0000-000000000003', 'published');

-- 対象拠点（全拠点を対象に）
insert into public.event_branches (event_id, branch_id)
select e.id, b.id from public.events e cross join public.branches b;

-- =============================================================
-- 4. 管理者プロフィール（※先に Supabase Auth でユーザー作成）
--    Authentication > Users で管理者を作成し、その UUID を控えて以下を実行。
--    handle_new_user トリガで profiles 行は自動作成されるので、role を更新するだけ。
-- =============================================================
-- update public.profiles
--   set role = 'admin', name = '管理者'
--   where id = '<auth.users の UUID>';
--
-- 拠点代表者を設定する例：
-- update public.profiles set role='representative', branch_id='11111111-1111-1111-1111-111111111111'
--   where id = '<代表者の UUID>';
-- update public.branches set representative_user_id='<代表者の UUID>'
--   where id = '11111111-1111-1111-1111-111111111111';

