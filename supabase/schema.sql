-- 云朵名片 · Supabase schema（在 SQL Editor 中整段运行一次即可；可重复运行）
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  avatar_url   text not null default '' check (char_length(avatar_url) <= 500),
  gender       text not null default 'secret' check (char_length(gender) <= 12),
  birthday     date,
  show_year    boolean not null default false,
  tags         text[] not null default '{}' check (cardinality(tags) <= 12),
  bio_html     text not null default '' check (char_length(bio_html) <= 8000),
  theme        text not null default 'sky' check (theme in ('sky','mint','lavender','peach','night')),
  links        jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 20 and pg_column_size(links) <= 20000),
  updated_at   timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles owner insert" on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;
drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles public read"  on public.profiles for select using (true);
create policy "profiles owner insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles owner update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles owner delete" on public.profiles for delete to authenticated using ((select auth.uid()) = id);
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;

-- 头像存储：公开读取，单个文件 ≤ 1MB，只允许图片，用户只能写自己的 <uid>/ 目录
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/webp','image/png','image/jpeg'];

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars public read"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars owner delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
