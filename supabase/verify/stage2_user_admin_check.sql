-- =====================================================================
-- Verifikasi Tahap 2a. Jalankan SETELAH 20261113000000_user_admin_functions.sql.
-- Memerlukan minimal satu Super Admin aktif di public.profiles (akun Anda).
-- Auth di SQL Editor kosong (auth.uid() = null), jadi skrip ini MENIRU sesi login
-- lewat set_config('request.jwt.claims', ...). Semua perubahan dibatalkan otomatis.
-- Tanpa "select ... into" (dashboard salah membacanya). Hasil akhir: satu baris
-- 'SEMUA PENGUJIAN TAHAP 2A LOLOS'; blok yang gagal berhenti dengan 'GAGAL: ...'.
-- =====================================================================

-- 1. Fungsi menolak pemanggil yang bukan Super Admin ------------------------
do $$
declare v_admin uuid; msg text;
begin
  v_admin := (select id from public.profiles where role = 'super_admin' and is_active limit 1);
  if v_admin is null then raise exception 'GAGAL: belum ada Super Admin aktif di public.profiles'; end if;

  -- sesi tiruan: pengguna acak yang bukan siapa-siapa
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);

  msg := null;
  begin
    perform public.admin_set_user_role(v_admin, 'staff');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('Tidak berwenang' in msg) = 0 then
    raise exception 'GAGAL: admin_set_user_role oleh bukan admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    perform public.admin_set_user_active(v_admin, false);
  exception when others then msg := sqlerrm; end;
  if msg is null or position('Tidak berwenang' in msg) = 0 then
    raise exception 'GAGAL: admin_set_user_active oleh bukan admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    perform public.admin_set_user_assignments(v_admin, '[]'::jsonb);
  exception when others then msg := sqlerrm; end;
  if msg is null or position('Tidak berwenang' in msg) = 0 then
    raise exception 'GAGAL: admin_set_user_assignments oleh bukan admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    perform public.admin_update_user(v_admin, 'Nama Uji', null);
  exception when others then msg := sqlerrm; end;
  if msg is null or position('Tidak berwenang' in msg) = 0 then
    raise exception 'GAGAL: admin_update_user oleh bukan admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  raise notice 'OK: keempat fungsi menolak pemanggil yang bukan Super Admin';
end $$;

-- 2. Invarian "minimal satu Super Admin aktif" (perubahan dibatalkan otomatis) ----
do $$
declare v_admin uuid; n_admins int; msg text;
begin
  v_admin := (select id from public.profiles where role = 'super_admin' and is_active order by created_at limit 1);
  n_admins := (select count(*) from public.profiles where role = 'super_admin' and is_active);
  if v_admin is null then raise exception 'GAGAL: belum ada Super Admin aktif'; end if;

  if n_admins = 1 then
    -- hanya satu admin: menurunkan / menonaktifkan harus ditolak oleh trigger
    msg := null;
    begin
      update public.profiles set role = 'staff' where id = v_admin;
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Minimal harus ada satu Super Admin aktif' in msg) = 0 then
      raise exception 'GAGAL: menurunkan satu-satunya admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    msg := null;
    begin
      update public.profiles set is_active = false where id = v_admin;
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Minimal harus ada satu Super Admin aktif' in msg) = 0 then
      raise exception 'GAGAL: menonaktifkan satu-satunya admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    msg := null;
    begin
      delete from public.profiles where id = v_admin;
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Minimal harus ada satu Super Admin aktif' in msg) = 0 then
      raise exception 'GAGAL: menghapus satu-satunya admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    raise notice 'OK: invarian satu Super Admin terjaga (ubah, nonaktif, hapus)';
  else
    raise notice 'LEWAT: ada % Super Admin aktif, pengujian penolakan butuh tepat 1 (invarian tetap berlaku)', n_admins;
  end if;
end $$;

-- 3. Jalur sukses: nama/NOID, role (tanpa perubahan), penugasan (dibatalkan otomatis) ----
do $$
declare
  v_admin uuid; v_wkf uuid; v_lazprg uuid; v_mgr uuid; v_staff uuid;
  n int; msg text; v_name text;
  b_count int; b_name text; b_no text; b_wkf_active boolean;
begin
  v_admin  := (select id from public.profiles where role = 'super_admin' and is_active order by created_at limit 1);
  v_wkf    := (select id from public.org_nodes where kind = 'unit' and code = 'WKF');
  v_lazprg := (select id from public.org_nodes where kind = 'departemen' and code = 'PRG');
  v_mgr    := (select id from public.positions where name = 'Manager');
  v_staff  := (select id from public.positions where name = 'Staff');
  if v_admin is null or v_wkf is null or v_lazprg is null then raise exception 'GAGAL: data awal/tahap 1 tidak lengkap'; end if;
  if v_mgr is null or v_staff is null then raise exception 'GAGAL: jabatan Manager/Staff tidak ditemukan'; end if;
  if not (select is_active from public.org_nodes where id = v_wkf)
     or not (select is_active from public.org_nodes where id = v_lazprg) then
    raise exception 'GAGAL (prasyarat): unit Badan Wakaf dan departemen Program (LAZ) harus aktif saat pengujian';
  end if;

  -- catat keadaan awal agar bisa dibandingkan setelah pembatalan
  b_count      := (select count(*) from public.user_assignments where user_id = v_admin);
  b_name       := (select full_name from public.profiles where id = v_admin);
  b_no         := (select employee_no from public.profiles where id = v_admin);
  b_wkf_active := (select is_active from public.org_nodes where id = v_wkf);

  begin
    -- Sesi tiruan sebagai Super Admin
perform set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', v_admin,
    'role', 'authenticated',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint
  )::text,
  true
);

    -- nama dan NOID
    perform public.admin_update_user(v_admin, '  Nama   Uji  Admin ', ' YP-UJI ');
    v_name := (select full_name from public.profiles where id = v_admin);
    if v_name <> 'Nama   Uji  Admin' then raise exception 'GAGAL: nama setelah update = [%] (seharusnya [Nama   Uji  Admin])', v_name; end if;
    if (select employee_no from public.profiles where id = v_admin) <> 'YP-UJI' then
      raise exception 'GAGAL: NOID tidak tersimpan/dirapikan';
    end if;

    -- validasi nama
    msg := null;
    begin perform public.admin_update_user(v_admin, 'A', null);
    exception when others then msg := sqlerrm; end;
    if msg is null or position('2–120' in msg) = 0 then
      raise exception 'GAGAL: nama 1 huruf — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    -- pengguna tak dikenal
    msg := null;
    begin perform public.admin_set_user_role(gen_random_uuid(), 'staff');
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Pengguna tidak ditemukan' in msg) = 0 then
      raise exception 'GAGAL: role pengguna tak dikenal — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    -- penugasan: dua penugasan baru
    perform public.admin_set_user_assignments(v_admin, json_build_array(
      json_build_object('org_node_id', v_wkf,    'position_id', v_mgr),
      json_build_object('org_node_id', v_lazprg, 'position_id', v_staff))::jsonb);
    n := (select count(*) from public.user_assignments where user_id = v_admin);
    if n <> 2 then raise exception 'GAGAL: penugasan = % (seharusnya 2)', n; end if;

    -- ganti ke satu penugasan: yang lain terhapus, yang dipertahankan tidak disentuh
    perform public.admin_set_user_assignments(v_admin, json_build_array(
      json_build_object('org_node_id', v_wkf, 'position_id', v_mgr))::jsonb);
    n := (select count(*) from public.user_assignments where user_id = v_admin);
    if n <> 1 then raise exception 'GAGAL: setelah penggantian penugasan = % (seharusnya 1)', n; end if;

    -- duplikat ditolak
    msg := null;
    begin perform public.admin_set_user_assignments(v_admin, json_build_array(
      json_build_object('org_node_id', v_wkf, 'position_id', v_mgr),
      json_build_object('org_node_id', v_wkf, 'position_id', v_mgr))::jsonb);
    exception when others then msg := sqlerrm; end;
    if msg is null or position('penugasan ganda' in msg) = 0 then
      raise exception 'GAGAL: penugasan ganda — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    -- bukan array ditolak
    msg := null;
    begin perform public.admin_set_user_assignments(v_admin, '{"a":1}'::jsonb);
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Format penugasan tidak valid' in msg) = 0 then
      raise exception 'GAGAL: format bukan array — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    -- penugasan lama ke unit yang KINI nonaktif tidak boleh menghalangi penyimpanan ulang
    -- (penugasan sudah ada ke WKF; nonaktifkan WKF lalu simpan daftar yang sama + 1 baru)
    update public.org_nodes set is_active = false where id = v_wkf;
    perform public.admin_set_user_assignments(v_admin, json_build_array(
      json_build_object('org_node_id', v_wkf,    'position_id', v_mgr),
      json_build_object('org_node_id', v_lazprg, 'position_id', v_staff))::jsonb);
    n := (select count(*) from public.user_assignments where user_id = v_admin);
    if n <> 2 then raise exception 'GAGAL: penugasan lama ke unit nonaktif menghalangi simpan (n=%)', n; end if;

    -- tetapi penugasan BARU ke unit nonaktif ditolak
    msg := null;
    begin perform public.admin_set_user_assignments(v_admin, json_build_array(
      json_build_object('org_node_id', v_wkf,    'position_id', v_mgr),
      json_build_object('org_node_id', v_lazprg, 'position_id', v_staff),
      json_build_object('org_node_id', v_wkf,    'position_id', v_staff))::jsonb);
    exception when others then msg := sqlerrm; end;
    if msg is null or position('nonaktif' in msg) = 0 then
      raise exception 'GAGAL: penugasan baru ke unit nonaktif — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;

  -- pastikan semua kembali seperti semula
  if (select count(*) from public.user_assignments where user_id = v_admin) <> b_count
     or (select is_active from public.org_nodes where id = v_wkf) is distinct from b_wkf_active
     or (select employee_no from public.profiles where id = v_admin) is distinct from b_no
     or (select full_name from public.profiles where id = v_admin) is distinct from b_name then
    raise exception 'GAGAL: data tidak kembali seperti semula setelah uji';
  end if;

  raise notice 'OK: nama/NOID, penugasan (ganti, dedup, unit nonaktif), semua dibatalkan';
end $$;

-- 4. Hak eksekusi: anon tidak boleh memanggil fungsi admin --------------------------
do $$
declare bad text;
begin
  bad := (
    select string_agg(f, ', ')
      from unnest(array[
        'public.admin_update_user(uuid, text, text)',
        'public.admin_set_user_role(uuid, public.app_role)',
        'public.admin_set_user_active(uuid, boolean)',
        'public.admin_set_user_assignments(uuid, jsonb)',
        'public.admin_list_users()'
      ]) as f
     where has_function_privilege('anon', f, 'execute')
  );
  if bad is not null then raise exception 'GAGAL: anon bisa mengeksekusi: %', bad; end if;
  raise notice 'OK: anon tidak bisa memanggil fungsi admin';
end $$;

select 'SEMUA PENGUJIAN TAHAP 2A LOLOS' as hasil;
