-- =====================================================================
-- YP-MMS — Tahap 1: Struktur organisasi, jabatan, penugasan, pengaturan
-- Prasyarat: migrasi 20261111000000_auth_profiles.sql sudah dijalankan.
-- Jalankan di Supabase Dashboard → SQL Editor (seluruh file sekaligus).
-- Dibungkus transaksi: bila ada satu error, TIDAK ada yang terpasang.
-- Sumber: PRD v1.0 bagian 6 (struktur), 5 & 5.1 (role, default deny),
--         FR-002, FR-003, 20.2 (keputusan terbuka → app_settings).
-- =====================================================================

begin;

-- 1. Jenis node organisasi ---------------------------------------------
create type public.org_kind as enum ('grup', 'unit', 'departemen', 'divisi');

-- 2. Pohon organisasi: Grup → Unit → Departemen → Divisi ----------------
-- Dinamis (PRD 6): admin menambah/ubah/nonaktifkan lewat aplikasi.
-- TIDAK ADA hapus: data lama dinonaktifkan agar riwayat rapat tetap utuh.
create table public.org_nodes (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.org_nodes (id) on delete restrict,
  kind        public.org_kind not null,
  name        text not null check (char_length(btrim(name)) between 2 and 80),
  code        text check (code is null or code ~ '^[A-Z0-9]{2,6}$'),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- hanya 'grup' yang tidak punya induk
  constraint org_nodes_root_check check ((kind = 'grup') = (parent_id is null))
);

comment on table public.org_nodes is 'Struktur organisasi bertingkat. Nonaktifkan, jangan hapus.';
comment on column public.org_nodes.code is 'Kode singkat untuk nomor rapat (mis. LAZ, PRG). 2–6 huruf kapital/angka.';

-- hanya satu grup
create unique index org_nodes_one_group on public.org_nodes (kind) where kind = 'grup';
-- nama tidak boleh kembar pada induk yang sama (tanpa membedakan huruf besar/kecil)
create unique index org_nodes_sibling_name
  on public.org_nodes (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));
-- kode tidak boleh kembar pada induk yang sama
create unique index org_nodes_sibling_code
  on public.org_nodes (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  where code is not null;
create index org_nodes_parent_idx on public.org_nodes (parent_id);

-- Aturan hierarki + aktivasi
create or replace function public.org_nodes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p_kind   public.org_kind;
  p_active boolean;
begin
  -- Jenis dan induk bersifat tetap (memindahkan node mengubah cakupan akses dan nomor rapat).
  if tg_op = 'UPDATE' and (new.kind is distinct from old.kind or new.parent_id is distinct from old.parent_id) then
    raise exception 'Jenis dan induk node organisasi tidak dapat diubah.';
  end if;

  if new.kind = 'grup' and not new.is_active then
    raise exception 'Grup tidak dapat dinonaktifkan.';
  end if;

  if new.parent_id is not null then
    select n.kind, n.is_active into p_kind, p_active
      from public.org_nodes n
     where n.id = new.parent_id;

    if not found then
      raise exception 'Induk organisasi tidak ditemukan.';
    end if;

    if tg_op = 'INSERT' and not (
         (new.kind = 'unit'       and p_kind = 'grup')
      or (new.kind = 'departemen' and p_kind = 'unit')
      or (new.kind = 'divisi'     and p_kind in ('departemen', 'divisi'))
    ) then
      raise exception '% tidak boleh berada di bawah %.', new.kind, p_kind;
    end if;

    -- Mengaktifkan/menambah di bawah induk nonaktif tidak diizinkan.
    if new.is_active and not p_active and (tg_op = 'INSERT' or not old.is_active) then
      raise exception 'Aktifkan induknya terlebih dahulu.';
    end if;
  end if;

  return new;
end;
$$;

create trigger org_nodes_guard
  before insert or update on public.org_nodes
  for each row execute function public.org_nodes_guard();

-- Menonaktifkan sebuah node menonaktifkan seluruh turunannya
-- (anak yang diubah akan memicu trigger ini lagi untuk cucunya).
create or replace function public.org_nodes_cascade_inactive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_active and not new.is_active then
    update public.org_nodes set is_active = false where parent_id = new.id and is_active;
  end if;

  return null;
end;
$$;

create trigger org_nodes_cascade_inactive
  after update of is_active on public.org_nodes
  for each row execute function public.org_nodes_cascade_inactive();

create trigger org_nodes_set_updated_at
  before update on public.org_nodes
  for each row execute function public.set_updated_at();

-- 3. Master jabatan (BUKAN role aplikasi — PRD bagian 6) ----------------
create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 40),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index positions_name_unique on public.positions (lower(btrim(name)));

-- 4. Penugasan pengguna: many-to-many (satu orang bisa di banyak unit/jabatan) ----
create table public.user_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  org_node_id  uuid not null references public.org_nodes (id) on delete restrict,
  position_id  uuid not null references public.positions (id) on delete restrict,
  created_at   timestamptz not null default now(),
  unique (user_id, org_node_id, position_id)
);

create index user_assignments_user_idx on public.user_assignments (user_id);
create index user_assignments_node_idx on public.user_assignments (org_node_id);

comment on table public.user_assignments is 'Penugasan = node organisasi terdalam yang ditempati + jabatan. Dasar cakupan akses (scope).';

create or replace function public.user_assignments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.org_nodes n where n.id = new.org_node_id and n.is_active) then
    raise exception 'Tidak dapat menugaskan ke unit/departemen yang nonaktif.';
  end if;

  return new;
end;
$$;

create trigger user_assignments_guard
  before insert on public.user_assignments
  for each row execute function public.user_assignments_guard();

-- 5. Pengaturan aplikasi: tempat asumsi PRD 20.2 yang masih terbuka --------
-- Semua nilai di bawah adalah ASUMSI sampai klien memutuskan, dan dapat diubah
-- kapan saja tanpa mengubah kode (UPDATE nilai di sini, atau lewat halaman pengaturan nanti).
create table public.app_settings (
  key          text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value        jsonb not null,
  description  text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);

create or replace function public.app_settings_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

create trigger app_settings_touch
  before update on public.app_settings
  for each row execute function public.app_settings_touch();

-- 6. Fungsi bantu untuk RLS tahap berikutnya -----------------------------
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.is_active;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active);
$$;

-- Seluruh node yang menjadi cakupan pengguna: node penugasannya + semua turunannya.
create or replace function public.my_org_scope()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive scope as (
    select a.org_node_id as id
      from public.user_assignments a
     where a.user_id = (select auth.uid())
    union
    select n.id
      from public.org_nodes n
      join scope s on n.parent_id = s.id
  )
  select id from scope;
$$;

-- Daftar pengguna lengkap dengan email & status undangan, KHUSUS Super Admin.
-- (email tersimpan di auth.users yang tidak boleh dibaca langsung dari klien)
create or replace function public.admin_list_users()
returns table (
  id                uuid,
  email             text,
  full_name         text,
  employee_no       text,
  role              public.app_role,
  is_active         boolean,
  invited_at        timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at   timestamptz,
  created_at        timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.full_name, p.employee_no, p.role, p.is_active,
           u.invited_at, u.email_confirmed_at, u.last_sign_in_at, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.full_name;
end;
$$;

revoke execute on function public.my_role()          from public, anon;
revoke execute on function public.is_active_user()   from public, anon;
revoke execute on function public.my_org_scope()     from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
grant  execute on function public.my_role()          to authenticated;
grant  execute on function public.is_active_user()   to authenticated;
grant  execute on function public.my_org_scope()     to authenticated;
grant  execute on function public.admin_list_users() to authenticated;

-- 7. RLS (default deny) ---------------------------------------------------
alter table public.org_nodes        enable row level security;
alter table public.positions        enable row level security;
alter table public.user_assignments enable row level security;
alter table public.app_settings     enable row level security;

-- org_nodes: semua pengguna login boleh membaca struktur (untuk pilihan unit);
-- hanya Super Admin yang boleh menambah/mengubah. Tidak ada hapus.
create policy "org_nodes_select" on public.org_nodes
  for select to authenticated using (true);
create policy "org_nodes_insert_admin" on public.org_nodes
  for insert to authenticated with check ((select public.is_super_admin()));
create policy "org_nodes_update_admin" on public.org_nodes
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- positions
create policy "positions_select" on public.positions
  for select to authenticated using (true);
create policy "positions_insert_admin" on public.positions
  for insert to authenticated with check ((select public.is_super_admin()));
create policy "positions_update_admin" on public.positions
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "positions_delete_admin" on public.positions
  for delete to authenticated using ((select public.is_super_admin()));

-- user_assignments: pengguna melihat penugasannya sendiri; Super Admin melihat dan mengelola semua.
create policy "assignments_select_own" on public.user_assignments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "assignments_select_admin" on public.user_assignments
  for select to authenticated using ((select public.is_super_admin()));
create policy "assignments_insert_admin" on public.user_assignments
  for insert to authenticated with check ((select public.is_super_admin()));
create policy "assignments_update_admin" on public.user_assignments
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "assignments_delete_admin" on public.user_assignments
  for delete to authenticated using ((select public.is_super_admin()));

-- app_settings: dibaca semua pengguna login; hanya Super Admin yang mengubah nilainya.
create policy "settings_select" on public.app_settings
  for select to authenticated using (true);
create policy "settings_update_admin" on public.app_settings
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- Hak tabel: anon tidak punya akses sama sekali.
revoke all on public.org_nodes, public.positions, public.user_assignments, public.app_settings from anon, authenticated;
grant select, insert, update         on public.org_nodes        to authenticated;
grant select, insert, update, delete on public.positions        to authenticated;
grant select, insert, update, delete on public.user_assignments to authenticated;
grant select, update                 on public.app_settings     to authenticated;

-- 8. Data awal (sesuai PRD bagian 6 dan data yang dipakai di aplikasi) ----
insert into public.org_nodes (kind, name, code, sort_order)
values ('grup', 'Yuk Peduli Grup', null, 0)
on conflict do nothing;

insert into public.org_nodes (parent_id, kind, name, code, sort_order)
select g.id, 'unit'::public.org_kind, v.name, v.code, v.ord
  from public.org_nodes g,
       (values ('LAZ Yuk Peduli', 'LAZ', 1),
               ('Badan Wakaf Yuk Peduli', 'WKF', 2),
               ('TKQ Madinatul Quran', 'TKQ', 3),
               ('RTQ Madinatul Quran', 'RTQ', 4),
               ('Kemasjidan', 'MSJ', 5)) as v(name, code, ord)
 where g.kind = 'grup'
on conflict do nothing;

insert into public.org_nodes (parent_id, kind, name, code, sort_order)
select u.id, 'departemen'::public.org_kind, v.name, v.code, v.ord
  from public.org_nodes u,
       (values ('Fundraising', 'FND', 1),
               ('Program', 'PRG', 2),
               ('Keuangan', 'KEU', 3),
               ('CRM', 'CRM', 4),
               ('Marketing', 'MKT', 5)) as v(name, code, ord)
 where u.kind = 'unit' and u.code = 'LAZ'
on conflict do nothing;

insert into public.positions (name) values
  ('CEO'), ('Direktur'), ('Mudir'), ('Manager'),
  ('Kepala Divisi'), ('Koordinator'), ('Staff'), ('Notulis')
on conflict do nothing;

-- Asumsi atas keputusan terbuka PRD 20.2 (ubah bila klien memutuskan lain).
insert into public.app_settings (key, value, description) values
  ('meeting_number_format',
   '{"pattern": "YP/{unit}/{dept}/{seq}/{roman_month}/{year}", "seq_pad": 3, "seq_reset": "yearly_per_unit"}'::jsonb,
   'PRD 20.2 no.4 (ASUMSI): format nomor rapat mengikuti contoh PRD; urutan direset per tahun per unit.'),
  ('attendance_statuses',
   '["Belum konfirmasi", "Hadir", "Online", "Terlambat", "Izin", "Sakit", "Tidak hadir"]'::jsonb,
   'PRD 20.2 no.5 (ASUMSI): daftar status kehadiran peserta.'),
  ('verification_mode',
   '{"mode": "separate_verifier"}'::jsonb,
   'PRD 20.2 no.6 (ASUMSI): tugas selesai diverifikasi verifikator terpisah (bukan pimpinan rapat otomatis).'),
  ('notification_channels',
   '{"in_app": true, "email": false}'::jsonb,
   'PRD 20.2 no.8 (ASUMSI): notifikasi dalam aplikasi saja untuk MVP; email belum aktif.'),
  ('minute_review_sla_days',
   '2'::jsonb,
   'Batas hari notulen menunggu review sebelum ditandai perlu segera (dipakai halaman Persetujuan).')
on conflict (key) do nothing;

commit;

-- =====================================================================
-- ROLLBACK (hanya bila perlu membatalkan tahap ini; HAPUS DATA tahap ini!)
-- Salin ke SQL Editor dan jalankan secara terpisah:
--
--   begin;
--   drop function if exists public.admin_list_users();
--   drop function if exists public.my_org_scope();
--   drop function if exists public.is_active_user();
--   drop function if exists public.my_role();
--   drop table if exists public.app_settings;
--   drop table if exists public.user_assignments;
--   drop table if exists public.positions;
--   drop table if exists public.org_nodes;
--   drop function if exists public.app_settings_touch();
--   drop function if exists public.user_assignments_guard();
--   drop function if exists public.org_nodes_cascade_inactive();
--   drop function if exists public.org_nodes_guard();
--   drop type if exists public.org_kind;
--   commit;
-- =====================================================================