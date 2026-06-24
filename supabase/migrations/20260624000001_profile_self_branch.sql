-- 本人が自分の所属（branch_id）を変更できるようにする。
-- role は引き続き固定（権限の自己昇格を防ぐ）。氏名・部・部署・所属は本人が変更可能。
-- 既存ポリシー profiles_update_self を差し替える。

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );
