-- マイページのヒーロー画像（本人がアップロードできる）。
-- 既存データへの影響：既存 profiles は hero_image_url が NULL（＝既定画像を表示）。

alter table public.profiles
  add column if not exists hero_image_url text;

-- 画像保存用バケット（公開読み取り）。
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- 読み取りは公開。書き込み・更新・削除は本人のフォルダ（先頭が自分のuid）のみ。
drop policy if exists profile_images_read on storage.objects;
create policy profile_images_read on storage.objects
  for select using (bucket_id = 'profile-images');

drop policy if exists profile_images_insert on storage.objects;
create policy profile_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_images_update on storage.objects;
create policy profile_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_images_delete on storage.objects;
create policy profile_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
