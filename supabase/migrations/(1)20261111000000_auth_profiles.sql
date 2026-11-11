-- =====================================================================
-- YP-MMS — Fondasi autentikasi: tabel profiles, role, dan RLS
-- Jalankan di Supabase Dashboard → SQL Editor (atau `supabase db push`).
-- Sumber: PRD v1.0 FR-001, FR-003, bagian 5 (role) dan 5.1 (default deny).
-- =====================================================================

-- 1. Role aplikasi (harus sama dengan src/lib/auth/roles.ts) ------------
create type public.app_role as enum (
  'super_admin',
  'ceo',
  'direktur_unit',
  'manager',
  'kepala_divisi',
  'notulis',
  'staff',
  'pimpinan_rapat'
);

-- 2. Tabel profiles: 1 baris per pengguna auth.users -------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 120),
  employee_no text unique,                       -- NOID karyawan (opsional)
  role        public.app_role not null default 'staff',
  is_active   boolean not null default true,     -- FR-001: akun aktif/nonaktif
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Profil pengguna YP-MMS. role & is_active hanya boleh diubah server/admin.';

-- 3. updated_at otomatis ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Buat profil otomatis saat pengguna dibuat/diundang -----------------
-- KEAMANAN: role TIDAK PERNAH dibaca dari raw_user_meta_data, karena data
-- itu bisa dikontrol pengguna. Semua akun baru berperan 'staff'; admin
-- yang menaikkan role lewat server (service role) atau SQL Editor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        split_part(new.email, '@', 1)
      ),
      120
    )
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Fungsi bantu untuk kebijakan RLS ----------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
      and is_active
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
grant  execute on function public.is_super_admin() to authenticated;

-- 6. RLS (default deny) -------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_select_super_admin"
  on public.profiles for select to authenticated
  using (public.is_super_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Hak tabel: anon tidak punya akses; pengguna hanya boleh membaca dan
-- mengubah KOLOM full_name miliknya. role/is_active tidak bisa diubah dari klien.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
-- =====================================================================
-- LANGKAH MANUAL SETELAH MIGRASI (sekali saja)
-- 1. Authentication → Users → "Add user" / "Invite user" untuk akun pertama.
-- 2. Jadikan Super Admin (ganti emailnya), jalankan di SQL Editor:
--
--    update public.profiles
--       set role = 'super_admin', full_name = 'Nama Lengkap Admin'
--     where id = (select id from auth.users where email = 'admin@contoh.org');
--
-- 3. Menonaktifkan pengguna (FR-001):
--    update public.profiles set is_active = false where id = '<uuid>';
-- =====================================================================