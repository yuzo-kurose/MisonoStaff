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
