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
