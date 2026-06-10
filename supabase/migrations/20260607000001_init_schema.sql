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
