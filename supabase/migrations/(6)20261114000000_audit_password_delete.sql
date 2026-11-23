-- =====================================================================
-- YP-MMS — Tahap 2b: Audit log, status kata sandi, hapus pengguna
-- Prasyarat: 20261111..., 20261112..., 20261113... sudah dijalankan.
-- Jalankan di SQL Editor (seluruh file). Bila dashboard menanyakan RLS saat
-- mengeksekusi: file ini MEMBUAT satu tabel (audit_logs) dan sudah mengaktifkan
-- RLS-nya sendiri, jadi pilih opsi yang mengaktifkan RLS.
-- Tanpa "select ... into" (dashboard Supabase salah membacanya sebagai CREATE TABLE).
--
-- Isi:
--  1. audit_logs: tabel jejak audit, hanya-tambah (tidak bisa diubah/dihapus siapa pun).
--  2. write_audit(): satu-satunya jalur menulis audit; TIDAK bisa dipanggil klien (anti-pemalsuan).
--  3. admin_list_users(): ditambah kolom password_set (sudah punya kata sandi atau belum).
--  4. my_password_set(): dipakai aplikasi untuk memaksa pengguna baru membuat kata sandi.
--  5. Fungsi admin pengguna yang ada kini MENCATAT audit di transaksi yang sama.
--  6. admin_delete_user(): hapus akun permanen oleh Super Admin (tanpa perlu DBA).
--  7. admin_log_invite(): mencatat undangan/kirim ulang.
-- =====================================================================

begin;

-- 1. Audit log -----------------------------------------------------------
create table public.audit_logs (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  actor_id      uuid,                                  -- tanpa FK: tetap ada walau akun dihapus
  actor_name    text not null,
  action        text not null check (char_length(action) between 1 and 40),
  object_type   text not null check (char_length(object_type) between 1 and 40),
  object_label  text not null,
  summary       text not null,
  changes       jsonb                                  -- [{"field","before","after"}]
);

create index audit_logs_at_idx on public.audit_logs (at desc);

comment on table public.audit_logs is 'Jejak audit hanya-tambah (FR-016). Ditulis lewat write_audit(), bukan langsung dari klien.';

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit log tidak dapat diubah atau dihapus.';
end;
$$;

create trigger audit_logs_no_change
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.audit_logs_immutable();

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated using ((select public.is_super_admin()));

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

-- 2. Satu-satunya jalur menulis audit ---------------------------------------
create or replace function public.write_audit(
  p_action text,
  p_object_type text,
  p_object_label text,
  p_summary text,
  p_changes jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name  text;
begin
  v_name := coalesce((select p.full_name from public.profiles p where p.id = v_actor), 'Sistem');

  insert into public.audit_logs (actor_id, actor_name, action, object_type, object_label, summary, changes)
  values (v_actor, v_name, p_action, p_object_type, p_object_label, p_summary, p_changes);
end;
$$;

-- Klien TIDAK boleh memanggil ini langsung (mencegah pemalsuan jejak audit).
-- Fungsi admin di bawah berjalan sebagai pemilik, sehingga tetap bisa memanggilnya.
revoke execute on function public.write_audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- 3. Daftar pengguna + status kata sandi ---------------------------------------
-- Tipe kembalian berubah (kolom baru), jadi fungsi harus di-drop lalu dibuat ulang.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id                 uuid,
  email              text,
  full_name          text,
  employee_no        text,
  role               public.app_role,
  is_active          boolean,
  invited_at         timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at    timestamptz,
  created_at         timestamptz,
  password_set       boolean
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
           u.invited_at, u.email_confirmed_at, u.last_sign_in_at, p.created_at,
           (u.encrypted_password is not null and u.encrypted_password <> '')
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.full_name;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant  execute on function public.admin_list_users() to authenticated;

-- 4. Apakah pengguna yang sedang login sudah membuat kata sandi? --------------------
-- Pengguna undangan yang hanya mengklik tautan sudah punya sesi tetapi BELUM punya kata sandi.
create or replace function public.my_password_set()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where u.id = (select auth.uid())
       and u.encrypted_password is not null
       and u.encrypted_password <> ''
  );
$$;

revoke execute on function public.my_password_set() from public, anon;
grant  execute on function public.my_password_set() to authenticated;

-- 5. Fungsi admin pengguna: kini mencatat audit di transaksi yang sama ----------------
-- Teks penugasan yang mudah dibaca ("Program LAZ — Manager; ..."), untuk before/after audit.
create or replace function public.assignments_text(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select string_agg(n.name || ' — ' || ps.name, '; ' order by n.name, ps.name)
       from public.user_assignments ua
       join public.org_nodes n  on n.id  = ua.org_node_id
       join public.positions ps on ps.id = ua.position_id
      where ua.user_id = p_user),
    '(tanpa penugasan)'
  );
$$;

revoke execute on function public.assignments_text(uuid) from public, anon, authenticated;

create or replace function public.admin_update_user(p_user uuid, p_full_name text, p_employee_no text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name     text := btrim(coalesce(p_full_name, ''));
  v_no       text := nullif(btrim(coalesce(p_employee_no, '')), '');
  v_old_name text;
  v_old_no   text;
  v_changes  jsonb := '[]'::jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  if char_length(v_name) not between 2 and 120 then
    raise exception 'Nama lengkap harus 2–120 karakter.';
  end if;

  if v_no is not null and char_length(v_no) > 30 then
    raise exception 'NOID maksimal 30 karakter.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  v_old_name := (select p.full_name from public.profiles p where p.id = p_user);
  v_old_no   := (select p.employee_no from public.profiles p where p.id = p_user);

  update public.profiles set full_name = v_name, employee_no = v_no where id = p_user;

  if v_old_name is distinct from v_name then
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'Nama', 'before', v_old_name, 'after', v_name));
  end if;

  if v_old_no is distinct from v_no then
    v_changes := v_changes || jsonb_build_array(jsonb_build_object('field', 'NOID', 'before', v_old_no, 'after', v_no));
  end if;

  if jsonb_array_length(v_changes) > 0 then
    perform public.write_audit('Ubah', 'Pengguna', v_name, 'Profil pengguna diubah.', v_changes);
  end if;
end;
$$;

create or replace function public.admin_set_user_role(p_user uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old  public.app_role;
  v_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  v_old  := (select p.role from public.profiles p where p.id = p_user);
  v_name := (select p.full_name from public.profiles p where p.id = p_user);

  if v_old is null then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  if v_old = p_role then
    return;
  end if;

  update public.profiles set role = p_role where id = p_user;

  perform public.write_audit(
    'Ubah role', 'Pengguna', v_name, 'Role pengguna diubah.',
    jsonb_build_array(jsonb_build_object('field', 'Role', 'before', v_old::text, 'after', p_role::text))
  );
end;
$$;

create or replace function public.admin_set_user_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old  boolean;
  v_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  v_old  := (select p.is_active from public.profiles p where p.id = p_user);
  v_name := (select p.full_name from public.profiles p where p.id = p_user);

  if v_old is null then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  if v_old = p_active then
    return;
  end if;

  update public.profiles set is_active = p_active where id = p_user;

  perform public.write_audit(
    case when p_active then 'Aktifkan' else 'Nonaktifkan' end,
    'Pengguna', v_name,
    case when p_active then 'Akun diaktifkan kembali.' else 'Akun dinonaktifkan.' end,
    jsonb_build_array(jsonb_build_object(
      'field', 'Status',
      'before', case when v_old then 'Aktif' else 'Nonaktif' end,
      'after',  case when p_active then 'Aktif' else 'Nonaktif' end
    ))
  );
end;
$$;

create or replace function public.admin_set_user_assignments(p_user uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before text;
  v_after  text;
  v_name   text;
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Format penugasan tidak valid.';
  end if;

  if jsonb_array_length(p_items) > 20 then
    raise exception 'Maksimal 20 penugasan per pengguna.';
  end if;

  if (select count(*) from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid))
     <> (select count(*) from (
           select distinct x.org_node_id, x.position_id
             from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid)
         ) d) then
    raise exception 'Ada penugasan ganda.';
  end if;

  v_name   := (select p.full_name from public.profiles p where p.id = p_user);
  v_before := public.assignments_text(p_user);

  delete from public.user_assignments ua
   where ua.user_id = p_user
     and not exists (
       select 1 from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid)
        where x.org_node_id = ua.org_node_id and x.position_id = ua.position_id
     );

  insert into public.user_assignments (user_id, org_node_id, position_id)
  select p_user, x.org_node_id, x.position_id
    from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid)
   where not exists (
     select 1 from public.user_assignments ua
      where ua.user_id = p_user
        and ua.org_node_id = x.org_node_id
        and ua.position_id = x.position_id
   );

  v_after := public.assignments_text(p_user);

  if v_before is distinct from v_after then
    perform public.write_audit(
      'Ubah', 'Pengguna', v_name, 'Penugasan pengguna diubah.',
      jsonb_build_array(jsonb_build_object('field', 'Penugasan', 'before', v_before, 'after', v_after))
    );
  end if;
end;
$$;

-- 6. Hapus akun permanen (Super Admin) -----------------------------------------------
-- Aturan: bukan akun sendiri; Super Admin aktif terakhir tidak bisa dihapus (trigger profiles);
-- akun yang punya riwayat (tabel rapat/notulen/tugas di tahap berikutnya, FK RESTRICT) ditolak
-- oleh database dan harus DINONAKTIFKAN. Audit ditulis di transaksi yang sama: bila hapus gagal,
-- catatan audit ikut dibatalkan.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_name  text;
  v_role  public.app_role;
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  if p_user = (select auth.uid()) then
    raise exception 'Anda tidak dapat menghapus akun sendiri.';
  end if;

  v_email := (select u.email::text from auth.users u where u.id = p_user);
  v_name  := (select p.full_name from public.profiles p where p.id = p_user);
  v_role  := (select p.role from public.profiles p where p.id = p_user);

  if v_email is null and v_name is null then
    raise exception 'Pengguna tidak ditemukan.';
  end if;

  perform public.write_audit(
    'Hapus', 'Pengguna', coalesce(v_name, v_email),
    'Akun dihapus permanen: ' || coalesce(v_email, '(tanpa email)'),
    jsonb_build_array(
      jsonb_build_object('field', 'Email', 'before', v_email),
      jsonb_build_object('field', 'Role',  'before', v_role::text)
    )
  );

  delete from auth.users where id = p_user;
end;
$$;

-- 7. Catat undangan / kirim ulang (undangan dikirim lewat Auth Admin API di server) ----
create or replace function public.admin_log_invite(p_email text, p_full_name text, p_role public.app_role, p_resend boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  perform public.write_audit(
    'Undang', 'Pengguna', coalesce(nullif(btrim(p_full_name), ''), p_email),
    case when p_resend then 'Undangan dikirim ulang ke ' else 'Undangan dikirim ke ' end || p_email,
    jsonb_build_array(jsonb_build_object('field', 'Role', 'after', p_role::text))
  );
end;
$$;

-- Hak eksekusi: hanya pengguna login (fungsi memeriksa Super Admin sendiri); anon tidak boleh.
revoke execute on function public.admin_update_user(uuid, text, text)           from public, anon;
revoke execute on function public.admin_set_user_role(uuid, public.app_role)    from public, anon;
revoke execute on function public.admin_set_user_active(uuid, boolean)          from public, anon;
revoke execute on function public.admin_set_user_assignments(uuid, jsonb)       from public, anon;
revoke execute on function public.admin_delete_user(uuid)                       from public, anon;
revoke execute on function public.admin_log_invite(text, text, public.app_role, boolean) from public, anon;
grant  execute on function public.admin_update_user(uuid, text, text)           to authenticated;
grant  execute on function public.admin_set_user_role(uuid, public.app_role)    to authenticated;
grant  execute on function public.admin_set_user_active(uuid, boolean)          to authenticated;
grant  execute on function public.admin_set_user_assignments(uuid, jsonb)       to authenticated;
grant  execute on function public.admin_delete_user(uuid)                       to authenticated;
grant  execute on function public.admin_log_invite(text, text, public.app_role, boolean) to authenticated;

commit;

-- =====================================================================
-- ROLLBACK (jalankan terpisah; MENGHAPUS data audit):
--   begin;
--   drop function if exists public.admin_log_invite(text, text, public.app_role, boolean);
--   drop function if exists public.admin_delete_user(uuid);
--   drop function if exists public.my_password_set();
--   drop function if exists public.assignments_text(uuid);
--   drop function if exists public.write_audit(text, text, text, text, jsonb);
--   drop table    if exists public.audit_logs;
--   drop function if exists public.audit_logs_immutable();
--   -- kembalikan admin_list_users() lama (tanpa password_set) dan 4 fungsi admin tanpa audit
--   -- dengan menjalankan ulang 20261113000000_user_admin_functions.sql bagian fungsinya,
--   -- serta definisi admin_list_users() di 20261112000000_org_structure.sql setelah drop function.
--   commit;
-- =====================================================================
