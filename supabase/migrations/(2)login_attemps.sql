-- Pembatas percobaan masuk: 3 gagal berturut-turut → email dikunci 15 menit.
-- Jalankan sekali di Supabase (SQL Editor atau file migrasi).
-- Angka 3 / 15 menit diatur di actions.ts (MAX_FAILED_ATTEMPTS, LOCK_MINUTES,
-- ATTEMPT_WINDOW_MINUTES), bukan di sini.
--
-- Tabel dan fungsi hanya bisa dipakai service_role (dari server action).
-- anon dan authenticated tidak punya akses, sehingga hitungan tidak bisa
-- direset atau dimanipulasi dari browser.

create table if not exists public.login_attempts (
  key             text primary key,               -- sha256 dari email (huruf kecil)
  failed_count    integer     not null default 0,
  first_failed_at timestamptz not null default now(),
  locked_until    timestamptz
);

alter table public.login_attempts enable row level security;
-- Sengaja tanpa policy: tidak ada akses lewat API publik.
revoke all on table public.login_attempts from anon, authenticated;

-- Sisa detik kunci; 0 jika tidak sedang dikunci.
create or replace function public.login_attempt_status(p_key text)
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select greatest(ceil(extract(epoch from (locked_until - now())))::integer, 0)
      from public.login_attempts
      where key = p_key
        and locked_until is not null
    ),
    0
  );
$$;

-- Catat satu percobaan gagal.
-- Mengembalikan lama kunci (detik) jika batas tercapai pada panggilan ini,
-- sisa kunci jika sudah terkunci, selain itu 0.
create or replace function public.login_attempt_fail(
  p_key            text,
  p_max            integer,
  p_lock_minutes   integer,
  p_window_minutes integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.login_attempts%rowtype;
begin
  insert into public.login_attempts (key) values (p_key) on conflict (key) do nothing;

  select * into r from public.login_attempts where key = p_key for update;

  -- Sudah terkunci: jangan perpanjang, cukup laporkan sisa waktunya.
  if r.locked_until is not null and r.locked_until > now() then
    return ceil(extract(epoch from (r.locked_until - now())))::integer;
  end if;

  -- Jendela lama sudah lewat (atau baris baru): mulai hitungan dari 1.
  if r.failed_count = 0
     or r.first_failed_at <= now() - make_interval(mins => p_window_minutes) then
    r.failed_count := 1;
    r.first_failed_at := now();
  else
    r.failed_count := r.failed_count + 1;
  end if;

  if r.failed_count >= p_max then
    update public.login_attempts
       set failed_count    = 0,
           first_failed_at = now(),
           locked_until    = now() + make_interval(mins => p_lock_minutes)
     where key = p_key;

    return p_lock_minutes * 60;
  end if;

  update public.login_attempts
     set failed_count    = r.failed_count,
         first_failed_at = r.first_failed_at,
         locked_until    = null
   where key = p_key;

  return 0;
end;
$$;

-- Hapus hitungan setelah login berhasil.
create or replace function public.login_attempt_reset(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts where key = p_key;
$$;

revoke all on function public.login_attempt_status(text) from public, anon, authenticated;
revoke all on function public.login_attempt_fail(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.login_attempt_reset(text) from public, anon, authenticated;

grant execute on function public.login_attempt_status(text) to service_role;
grant execute on function public.login_attempt_fail(text, integer, integer, integer) to service_role;
grant execute on function public.login_attempt_reset(text) to service_role;