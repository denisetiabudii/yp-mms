-- =====================================================================
-- Verifikasi Tahap 2b. Jalankan SETELAH 20261114000000_audit_password_delete.sql.
-- Memerlukan minimal satu Super Admin aktif di public.profiles (akun Anda).
-- Auth di SQL Editor kosong, jadi skrip MENIRU sesi login lewat set_config(...).
-- Semua perubahan dibatalkan otomatis. Tanpa "select ... into".
-- Hasil akhir: satu baris 'SEMUA PENGUJIAN TAHAP 2B LOLOS'. Blok gagal -> 'GAGAL: ...'.
-- Blok yang tidak bisa dijalankan karena keterbatasan lingkungan ditandai 'LEWAT' (bukan lolos).
-- =====================================================================
-- CATATAN KOMPATIBILITAS (migrasi account_security): is_super_admin() kini juga memeriksa waktu terbit token
-- ('iat') terhadap profiles.session_revoked_at. Sesi tiruan di skrip ini karena itu menyertakan 'iat' = sekarang;
-- tanpa 'iat', pengguna yang pernah diubah admin dianggap sesinya dicabut dan pengujian gagal palsu
-- ("Tidak berwenang").

-- 1. Audit log: hanya-tambah, dan klien tidak bisa menulis/memalsukan ---------------
do $$
declare msg text;
begin
  -- klien tidak punya hak tulis/ubah/hapus pada audit_logs
  if has_table_privilege('authenticated', 'public.audit_logs', 'insert')
     or has_table_privilege('authenticated', 'public.audit_logs', 'update')
     or has_table_privilege('authenticated', 'public.audit_logs', 'delete')
     or has_table_privilege('anon', 'public.audit_logs', 'select') then
    raise exception 'GAGAL: hak tabel audit_logs terlalu longgar';
  end if;

  -- klien tidak boleh memanggil write_audit (anti-pemalsuan)
  if has_function_privilege('authenticated', 'public.write_audit(text, text, text, text, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.write_audit(text, text, text, text, jsonb)', 'execute') then
    raise exception 'GAGAL: write_audit bisa dipanggil klien';
  end if;

  begin
    perform public.write_audit('Uji', 'Uji', 'Label Uji', 'Ringkasan uji', null);

    msg := null;
    begin
      update public.audit_logs set summary = 'diubah' where object_label = 'Label Uji';
    exception when others then msg := sqlerrm; end;
    if msg is null or position('tidak dapat diubah atau dihapus' in msg) = 0 then
      raise exception 'GAGAL: UPDATE audit_logs — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    msg := null;
    begin
      delete from public.audit_logs where object_label = 'Label Uji';
    exception when others then msg := sqlerrm; end;
    if msg is null or position('tidak dapat diubah atau dihapus' in msg) = 0 then
      raise exception 'GAGAL: DELETE audit_logs — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    msg := null;
    begin
      truncate table public.audit_logs;
    exception when others then msg := sqlerrm; end;
    if msg is null or position('tidak dapat diubah atau dihapus' in msg) = 0 then
      raise exception 'GAGAL: TRUNCATE audit_logs — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;

  raise notice 'OK: audit hanya-tambah dan tidak bisa dipalsukan klien';
end $$;

-- 2. admin_list_users() punya kolom password_set; my_password_set() ada ------------
do $$
declare v_admin uuid; n int;
begin
  v_admin := (select id from public.profiles where role = 'super_admin' and is_active order by created_at limit 1);
  if v_admin is null then raise exception 'GAGAL: belum ada Super Admin aktif'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);

  n := (select count(*) from public.admin_list_users() where password_set is not null);
  if n < 1 then raise exception 'GAGAL: admin_list_users() tidak mengembalikan kolom password_set'; end if;

  if has_function_privilege('anon', 'public.my_password_set()', 'execute') then
    raise exception 'GAGAL: anon bisa memanggil my_password_set()';
  end if;

  raise notice 'OK: admin_list_users().password_set dan my_password_set() tersedia';
end $$;

-- 3. Fungsi admin kini menulis audit (dibatalkan otomatis) -----------------------------
do $$
declare v_admin uuid; v_before bigint; v_after bigint; v_name text; v_no text;
begin
  v_admin := (select id from public.profiles where role = 'super_admin' and is_active order by created_at limit 1);
  v_name  := (select full_name from public.profiles where id = v_admin);
  v_no    := (select employee_no from public.profiles where id = v_admin);

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);

    v_before := (select count(*) from public.audit_logs);
    perform public.admin_update_user(v_admin, v_name, coalesce(v_no, '') || 'X');
    v_after := (select count(*) from public.audit_logs);
    if v_after <> v_before + 1 then
      raise exception 'GAGAL: admin_update_user tidak menulis tepat 1 audit (sebelum=%, sesudah=%)', v_before, v_after;
    end if;

    -- tidak ada perubahan => tidak ada audit baru
    perform public.admin_update_user(v_admin, v_name, coalesce(v_no, '') || 'X');
    if (select count(*) from public.audit_logs) <> v_after then
      raise exception 'GAGAL: pembaruan tanpa perubahan seharusnya tidak menulis audit';
    end if;

    -- isi audit: pelaku, aksi, objek, dan before/after
    if not exists (
      select 1 from public.audit_logs a
       where a.actor_id = v_admin and a.action = 'Ubah' and a.object_type = 'Pengguna'
         and a.changes -> 0 ->> 'field' = 'NOID'
    ) then
      raise exception 'GAGAL: isi audit NOID tidak sesuai';
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;

  raise notice 'OK: admin_update_user menulis audit (hanya saat ada perubahan)';
end $$;

-- 4. Hapus akun + status kata sandi dengan akun sementara (dibatalkan otomatis) ----------
-- Membuat satu baris sementara di auth.users. Bila lingkungan menolaknya, blok ini
-- ditandai LEWAT (bukan lolos) dan hapus akun diuji lewat UI.
do $$
declare
  v_admin uuid; v_tmp uuid := gen_random_uuid(); v_ok boolean := true; msg text;
begin
  v_admin := (select id from public.profiles where role = 'super_admin' and is_active order by created_at limit 1);

  begin
    begin
      insert into auth.users (id, email, aud, role, created_at, updated_at)
      values (v_tmp, 'uji-hapus-' || substr(v_tmp::text, 1, 8) || '@example.invalid', 'authenticated', 'authenticated', now(), now());
    exception when others then
      v_ok := false;
      raise notice 'LEWAT: tidak dapat membuat akun sementara di auth.users (%). Uji hapus akun lewat UI.', sqlerrm;
    end;

    if v_ok then
      if not exists (select 1 from public.profiles where id = v_tmp) then
        raise exception 'GAGAL: trigger handle_new_user tidak membuat profil untuk akun sementara';
      end if;

      -- sebagai Super Admin: akun sementara belum punya kata sandi
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);
      if (select password_set from public.admin_list_users() where id = v_tmp) is not false then
        raise exception 'GAGAL: akun tanpa kata sandi seharusnya password_set = false';
      end if;

      -- my_password_set() untuk akun sementara itu
      perform set_config('request.jwt.claims', json_build_object('sub', v_tmp, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);
      if public.my_password_set() is not false then raise exception 'GAGAL: my_password_set() seharusnya false'; end if;
      update auth.users set encrypted_password = 'x' where id = v_tmp;
      if public.my_password_set() is not true then raise exception 'GAGAL: my_password_set() seharusnya true setelah ada kata sandi'; end if;

      -- bukan Super Admin: hapus ditolak
      msg := null;
      begin perform public.admin_delete_user(v_admin);
      exception when others then msg := sqlerrm; end;
      if msg is null or position('Tidak berwenang' in msg) = 0 then
        raise exception 'GAGAL: hapus oleh bukan admin — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
      end if;

      -- kembali sebagai Super Admin
      perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'iat', extract(epoch from now())::bigint)::text, true);

      -- tidak boleh menghapus akun sendiri
      msg := null;
      begin perform public.admin_delete_user(v_admin);
      exception when others then msg := sqlerrm; end;
      if msg is null or position('akun sendiri' in msg) = 0 then
        raise exception 'GAGAL: hapus akun sendiri — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
      end if;

      -- pengguna tak dikenal
      msg := null;
      begin perform public.admin_delete_user(gen_random_uuid());
      exception when others then msg := sqlerrm; end;
      if msg is null or position('Pengguna tidak ditemukan' in msg) = 0 then
        raise exception 'GAGAL: hapus pengguna tak dikenal — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
      end if;

      -- hapus akun sementara
      perform public.admin_delete_user(v_tmp);
      if exists (select 1 from auth.users where id = v_tmp) then raise exception 'GAGAL: akun masih ada di auth.users'; end if;
      if exists (select 1 from public.profiles where id = v_tmp) then raise exception 'GAGAL: profil masih ada'; end if;
      if not exists (select 1 from public.audit_logs a where a.action = 'Hapus' and a.actor_id = v_admin and a.summary like '%uji-hapus-%') then
        raise exception 'GAGAL: audit penghapusan tidak tercatat';
      end if;

      raise notice 'OK: hapus akun (otorisasi, akun sendiri, tak dikenal, terhapus, teraudit) dan status kata sandi';
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;
end $$;

-- 5. Hak eksekusi fungsi baru: anon tidak boleh ---------------------------------------
do $$
declare bad text;
begin
  bad := (
    select string_agg(f, ', ')
      from unnest(array[
        'public.admin_delete_user(uuid)',
        'public.admin_log_invite(text, text, public.app_role, boolean)',
        'public.admin_list_users()',
        'public.my_password_set()'
      ]) as f
     where has_function_privilege('anon', f, 'execute')
  );
  if bad is not null then raise exception 'GAGAL: anon bisa mengeksekusi: %', bad; end if;
  raise notice 'OK: anon tidak bisa memanggil fungsi baru';
end $$;

select 'SEMUA PENGUJIAN TAHAP 2B LOLOS' as hasil;