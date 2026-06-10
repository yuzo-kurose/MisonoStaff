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
