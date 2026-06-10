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
