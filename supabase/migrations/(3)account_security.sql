alter table public.profiles
  add column if not exists session_revoked_at timestamptz;

create or replace function public.profiles_end_sessions_on_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Perubahan oleh pemilik profil sendiri: jangan putus sesi, dan jangan biarkan
  -- pemilik menghapus penanda pencabutan yang dipasang admin.
  if auth.uid() is not distinct from new.id then
    new.session_revoked_at := old.session_revoked_at;
    return new;
  end if;

  new.session_revoked_at := now();
  delete from auth.sessions where user_id = new.id;

  return new;
end;
$$;

revoke all on function public.profiles_end_sessions_on_change() from public, anon, authenticated;

drop trigger if exists profiles_end_sessions on public.profiles;

create trigger profiles_end_sessions
  before update on public.profiles
  for each row
  when (old.* is distinct from new.*)
  execute function public.profiles_end_sessions_on_change();

-- Benar hanya jika akun aktif dan token terbit setelah pencabutan terakhir.
create or replace function public.is_session_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.is_active
         and (
           p.session_revoked_at is null
           or coalesce((auth.jwt() ->> 'iat')::bigint, 0)
              >= floor(extract(epoch from p.session_revoked_at))::bigint
         )
      from public.profiles p
      where p.id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.is_session_valid() from public, anon;
grant execute on function public.is_session_valid() to authenticated;

-- Sesi super admin yang sudah dicabut tidak lagi lolos sampai token kedaluwarsa.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_session_valid()
     and exists (
       select 1
       from public.profiles
       where id = (select auth.uid())
         and role = 'super_admin'
     );
$$;