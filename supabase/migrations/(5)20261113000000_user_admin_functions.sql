-- =====================================================================
-- YP-MMS — Tahap 2a: Fungsi administrasi pengguna (khusus Super Admin)
-- Prasyarat: 20261111000000_auth_profiles.sql dan 20261112000000_org_structure.sql.
-- Jalankan di SQL Editor (seluruh file). Bila dashboard menanyakan RLS,
-- pilih "tanpa RLS": file ini tidak membuat tabel.
-- Sumber: PRD FR-002, FR-003, bagian 5 (role), 5.1 (default deny).
--
-- Mengapa fungsi, bukan UPDATE langsung dari aplikasi?
-- Kolom role dan is_active sengaja TIDAK bisa diubah klien (hak kolom). Fungsi
-- ini (SECURITY DEFINER) memeriksa sendiri bahwa pemanggilnya Super Admin, dan
-- aturan penting dijaga di database, bukan hanya di tombol/kode aplikasi.
-- Catatan: tanpa "select ... into" (dashboard Supabase salah membacanya sebagai CREATE TABLE).
-- =====================================================================

begin;

-- 1. Invarian: selalu ada minimal satu Super Admin aktif ------------------
-- Berlaku untuk SEMUA jalur (aplikasi, SQL Editor, penghapusan akun auth).
create or replace function public.profiles_keep_super_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  demoting boolean;
begin
  if old.role = 'super_admin' and old.is_active then
    if tg_op = 'DELETE' then
      demoting := true;
    else
      demoting := (new.role <> 'super_admin' or not new.is_active);
    end if;

    if demoting and not exists (
      select 1 from public.profiles p
       where p.id <> old.id and p.role = 'super_admin' and p.is_active
    ) then
      raise exception 'Minimal harus ada satu Super Admin aktif.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger profiles_keep_super_admin
  before update of role, is_active or delete on public.profiles
  for each row execute function public.profiles_keep_super_admin();

-- 2. Ubah nama dan NOID --------------------------------------------------
create or replace function public.admin_update_user(p_user uuid, p_full_name text, p_employee_no text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_full_name, ''));
  v_no   text := nullif(btrim(coalesce(p_employee_no, '')), '');
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

  update public.profiles set full_name = v_name, employee_no = v_no where id = p_user;

  if not found then
    raise exception 'Pengguna tidak ditemukan.';
  end if;
end;
$$;

-- 3. Ubah role -------------------------------------------------------------
create or replace function public.admin_set_user_role(p_user uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  update public.profiles set role = p_role where id = p_user;

  if not found then
    raise exception 'Pengguna tidak ditemukan.';
  end if;
end;
$$;

-- 4. Aktifkan / nonaktifkan akun ---------------------------------------------
create or replace function public.admin_set_user_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;

  update public.profiles set is_active = p_active where id = p_user;

  if not found then
    raise exception 'Pengguna tidak ditemukan.';
  end if;
end;
$$;

-- 5. Ganti seluruh penugasan seorang pengguna (atomik) -----------------------
-- p_items: [{"org_node_id": "<uuid>", "position_id": "<uuid>"}, ...]
-- Penugasan yang sudah ada dan tetap dipertahankan TIDAK disentuh (jadi penugasan
-- lama ke unit yang kini nonaktif tidak menghalangi perubahan penugasan lainnya).
create or replace function public.admin_set_user_assignments(p_user uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  -- hapus yang tidak lagi diinginkan
  delete from public.user_assignments ua
   where ua.user_id = p_user
     and not exists (
       select 1 from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid)
        where x.org_node_id = ua.org_node_id and x.position_id = ua.position_id
     );

  -- tambah yang baru saja (yang sudah ada dibiarkan)
  insert into public.user_assignments (user_id, org_node_id, position_id)
  select p_user, x.org_node_id, x.position_id
    from jsonb_to_recordset(p_items) as x(org_node_id uuid, position_id uuid)
   where not exists (
     select 1 from public.user_assignments ua
      where ua.user_id = p_user
        and ua.org_node_id = x.org_node_id
        and ua.position_id = x.position_id
   );
end;
$$;

revoke execute on function public.admin_update_user(uuid, text, text)         from public, anon;
revoke execute on function public.admin_set_user_role(uuid, public.app_role)  from public, anon;
revoke execute on function public.admin_set_user_active(uuid, boolean)        from public, anon;
revoke execute on function public.admin_set_user_assignments(uuid, jsonb)     from public, anon;
grant  execute on function public.admin_update_user(uuid, text, text)         to authenticated;
grant  execute on function public.admin_set_user_role(uuid, public.app_role)  to authenticated;
grant  execute on function public.admin_set_user_active(uuid, boolean)        to authenticated;
grant  execute on function public.admin_set_user_assignments(uuid, jsonb)     to authenticated;

commit;

-- =====================================================================
-- ROLLBACK (jalankan terpisah bila perlu):
--   begin;
--   drop function if exists public.admin_set_user_assignments(uuid, jsonb);
--   drop function if exists public.admin_set_user_active(uuid, boolean);
--   drop function if exists public.admin_set_user_role(uuid, public.app_role);
--   drop function if exists public.admin_update_user(uuid, text, text);
--   drop trigger  if exists profiles_keep_super_admin on public.profiles;
--   drop function if exists public.profiles_keep_super_admin();
--   commit;
-- =====================================================================
