-- =============================================================
-- 20260622000002_change_requests.sql
-- 確定済み申込に対する「編集依頼／キャンセル依頼」。
--   参加者本人が代表者へ依頼を出し、代表者/管理者が対応する。
-- =============================================================

create table if not exists public.change_requests (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  type           varchar(10) not null check (type in ('edit', 'cancel')),
  message        text,
  status         varchar(10) not null default 'open' check (status in ('open', 'done')),
  requested_by   uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index if not exists idx_change_requests_participant on public.change_requests(participant_id);
create index if not exists idx_change_requests_status on public.change_requests(status);

alter table public.change_requests enable row level security;

-- 本人は自分のparticipantに対して依頼を作成・参照できる。
drop policy if exists cr_self on public.change_requests;
create policy cr_self on public.change_requests
  for select using (
    exists (select 1 from public.participants p where p.id = participant_id and p.user_id = auth.uid())
  );
drop policy if exists cr_self_insert on public.change_requests;
create policy cr_self_insert on public.change_requests
  for insert with check (
    exists (select 1 from public.participants p where p.id = participant_id and p.user_id = auth.uid())
  );

-- 代表者(自拠点)・管理者は参照・更新（対応済みにする）できる。
drop policy if exists cr_staff on public.change_requests;
create policy cr_staff on public.change_requests
  for all using (
    public.is_admin()
    or exists (
      select 1
      from public.participants p
      join public.applications a on a.id = p.application_id
      join public.branches b on b.id = a.branch_id
      where p.id = participant_id and b.representative_user_id = auth.uid()
    )
  ) with check (true);
