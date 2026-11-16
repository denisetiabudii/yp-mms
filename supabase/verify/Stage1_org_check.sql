-- =====================================================================
-- Verifikasi Tahap 1. Jalankan SETELAH migrasi 20261112000000_org_structure.sql.
-- Jalankan di SQL Editor. Setiap blok mencetak NOTICE "OK: ..." bila lolos,
-- atau menghentikan dengan error "GAGAL: ..." bila ada yang salah.
-- Pengujian yang mengubah data dibatalkan otomatis (data Anda tidak berubah).
-- Setiap pengujian "harus ditolak" memeriksa ALASAN penolakannya, bukan sekadar
-- "ada error", supaya tidak lolos palsu karena kesalahan lain.
--
-- CATATAN: skrip ini sengaja TIDAK memakai "select ... into <variabel>".
-- Dashboard Supabase salah mengira itu perintah membuat tabel dan menyisipkan
-- ALTER TABLE ... ENABLE RLS ke tengah blok. Di sini dipakai "variabel := (select ...)".
-- Bila dashboard tetap menanyakan soal RLS untuk skrip ini, pilih "jalankan tanpa RLS":
-- skrip ini tidak membuat tabel apa pun.
-- =====================================================================

-- 1. Data awal ---------------------------------------------------------
do $$
declare n_group int; n_unit int; n_dept int; n_pos int; n_set int;
begin
  n_group := (select count(*) from public.org_nodes where kind = 'grup');
  n_unit  := (select count(*) from public.org_nodes where kind = 'unit');
  n_dept  := (select count(*) from public.org_nodes where kind = 'departemen');
  n_pos   := (select count(*) from public.positions);
  n_set   := (select count(*) from public.app_settings);

  if n_group <> 1 then raise exception 'GAGAL: grup = % (seharusnya 1)', n_group; end if;
  if n_unit  <> 5 then raise exception 'GAGAL: unit = % (seharusnya 5)', n_unit; end if;
  if n_dept  <> 5 then raise exception 'GAGAL: departemen = % (seharusnya 5)', n_dept; end if;
  if n_pos   <> 8 then raise exception 'GAGAL: jabatan = % (seharusnya 8)', n_pos; end if;
  if n_set   <> 5 then raise exception 'GAGAL: pengaturan = % (seharusnya 5)', n_set; end if;
  raise notice 'OK: data awal (1 grup, 5 unit, 5 departemen, 8 jabatan, 5 pengaturan)';
end $$;

-- 2. RLS aktif di semua tabel baru ---------------------------------------
do $$
declare bad text;
begin
  bad := (
    select string_agg(c.relname, ', ')
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
       and not c.relrowsecurity
  );
  if bad is not null then raise exception 'GAGAL: RLS belum aktif di: %', bad; end if;
  raise notice 'OK: RLS aktif di 4 tabel baru';
end $$;

-- 3. Aturan hierarki dan keunikan: semua harus DITOLAK dengan alasan yang benar ----
do $$
declare
  v_grp  uuid;
  v_other uuid;
  v_dept  uuid;
  msg     text;
begin
  v_grp   := (select id from public.org_nodes where kind = 'grup');
  -- unit LAIN dari induk asli PRG (induk asli PRG = LAZ), supaya ini benar-benar pemindahan induk
  v_other := (select id from public.org_nodes where kind = 'unit' and code = 'WKF');
  v_dept  := (select id from public.org_nodes where kind = 'departemen' and code = 'PRG');

  msg := null;
  begin
    insert into public.org_nodes (parent_id, kind, name) values (v_grp, 'departemen', 'Uji Salah Induk');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('tidak boleh berada di bawah' in msg) = 0 then
    raise exception 'GAGAL: departemen di bawah grup — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    insert into public.org_nodes (parent_id, kind, name) values (v_grp, 'unit', 'laz yuk peduli');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('org_nodes_sibling_name' in msg) = 0 then
    raise exception 'GAGAL: nama kembar — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    insert into public.org_nodes (parent_id, kind, name, code) values (v_grp, 'unit', 'Uji Kode Kembar', 'LAZ');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('org_nodes_sibling_code' in msg) = 0 then
    raise exception 'GAGAL: kode kembar — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    insert into public.org_nodes (parent_id, kind, name, code) values (v_grp, 'unit', 'Uji Kode Salah', 'abc');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('org_nodes_code_check' in msg) = 0 then
    raise exception 'GAGAL: kode huruf kecil — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    insert into public.org_nodes (kind, name) values ('grup', 'Grup Kedua');
  exception when others then msg := sqlerrm; end;
  if msg is null or position('org_nodes_one_group' in msg) = 0 then
    raise exception 'GAGAL: grup kedua — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  msg := null;
  begin
    update public.org_nodes set is_active = false where id = v_grp;
  exception when others then msg := sqlerrm; end;
  if msg is null or position('Grup tidak dapat dinonaktifkan' in msg) = 0 then
    raise exception 'GAGAL: menonaktifkan grup — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  if (select parent_id from public.org_nodes where id = v_dept) = v_other then
    raise exception 'GAGAL (uji tidak valid): induk PRG sudah sama dengan unit pembanding';
  end if;

  msg := null;
  begin
    update public.org_nodes set parent_id = v_other where id = v_dept;
  exception when others then msg := sqlerrm; end;
  if msg is null or position('tidak dapat diubah' in msg) = 0 then
    raise exception 'GAGAL: mengubah induk — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
  end if;

  raise notice 'OK: aturan hierarki, keunikan, format kode, dan proteksi grup (7 pengujian)';
end $$;

-- 4. Nonaktif berantai dan aturan aktivasi (perubahan dibatalkan otomatis) ----
do $$
declare n int; msg text; v_dept uuid;
begin
  begin
    update public.org_nodes set is_active = false where kind = 'unit' and code = 'LAZ';

    n := (select count(*) from public.org_nodes where not is_active);
    if n <> 6 then raise exception 'GAGAL: nonaktif berantai = % node (seharusnya 6: LAZ + 5 departemen)', n; end if;

    v_dept := (select id from public.org_nodes where kind = 'departemen' and code = 'PRG');
    msg := null;
    begin
      update public.org_nodes set is_active = true where id = v_dept;
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Aktifkan induknya' in msg) = 0 then
      raise exception 'GAGAL: aktivasi di bawah induk nonaktif — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    msg := null;
    begin
      insert into public.org_nodes (parent_id, kind, name)
        select id, 'departemen'::public.org_kind, 'Uji Di Bawah Nonaktif'
          from public.org_nodes where kind = 'unit' and code = 'LAZ';
    exception when others then msg := sqlerrm; end;
    if msg is null or position('Aktifkan induknya' in msg) = 0 then
      raise exception 'GAGAL: tambah di bawah induk nonaktif — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;

  n := (select count(*) from public.org_nodes where not is_active);
  if n <> 0 then raise exception 'GAGAL: data tidak kembali setelah uji (% node nonaktif)', n; end if;
  raise notice 'OK: nonaktif berantai dan aturan aktivasi, data kembali utuh';
end $$;

-- 5. Penugasan: cakupan mencakup turunan, dan unit nonaktif ditolak -----------
-- Memerlukan minimal satu baris di public.profiles (akun admin Anda cukup).
do $$
declare v_uid uuid; v_pos uuid; n_scope int; msg text;
begin
  v_uid := (select id from public.profiles order by created_at limit 1);
  if v_uid is null then raise exception 'GAGAL: belum ada baris di public.profiles'; end if;
  v_pos := (select id from public.positions where name = 'Manager');

  begin
    insert into public.user_assignments (user_id, org_node_id, position_id)
      select v_uid, id, v_pos from public.org_nodes where kind = 'unit' and code = 'LAZ';

    -- my_org_scope() memakai auth.uid() (null di SQL Editor), jadi hitung dengan logika yang sama.
    n_scope := (
      with recursive scope as (
        select a.org_node_id as id from public.user_assignments a where a.user_id = v_uid
        union
        select n.id from public.org_nodes n join scope s on n.parent_id = s.id
      )
      select count(*) from scope
    );

    if n_scope <> 6 then raise exception 'GAGAL: cakupan = % node (seharusnya 6)', n_scope; end if;

    -- penugasan ke unit nonaktif harus ditolak
    update public.org_nodes set is_active = false where kind = 'unit' and code = 'WKF';
    msg := null;
    begin
      insert into public.user_assignments (user_id, org_node_id, position_id)
        select v_uid, id, v_pos from public.org_nodes where kind = 'unit' and code = 'WKF';
    exception when others then msg := sqlerrm; end;
    if msg is null or position('nonaktif' in msg) = 0 then
      raise exception 'GAGAL: penugasan ke unit nonaktif — hasil: %', coalesce(msg, 'DITERIMA (seharusnya ditolak)');
    end if;

    raise exception 'ROLLBACK_UJI';
  exception when others then
    if sqlerrm <> 'ROLLBACK_UJI' then raise; end if;
  end;

  raise notice 'OK: cakupan penugasan mencakup turunan; penugasan ke unit nonaktif ditolak';
end $$;

-- 6. Hak akses: anon tidak boleh menyentuh tabel apa pun ------------------
-- has_table_privilege() memeriksa hak yang sebenarnya berlaku untuk role anon.
do $$
declare bad text;
begin
  bad := (
    select string_agg(t || ':' || p, ', ')
      from unnest(array['org_nodes', 'positions', 'user_assignments', 'app_settings']) as t,
           unnest(array['select', 'insert', 'update', 'delete']) as p
     where has_table_privilege('anon', 'public.' || t, p)
  );
  if bad is not null then raise exception 'GAGAL: anon masih punya hak: %', bad; end if;

  -- pengguna login tidak boleh menghapus node organisasi (nonaktifkan, jangan hapus)
  if has_table_privilege('authenticated', 'public.org_nodes', 'delete') then
    raise exception 'GAGAL: authenticated seharusnya tidak bisa menghapus org_nodes';
  end if;

  raise notice 'OK: anon tanpa hak; org_nodes tidak bisa dihapus dari klien';
end $$;

-- 7. Penutup: baris ini hanya tercapai bila SEMUA blok di atas lolos --------
-- (blok yang gagal menghentikan skrip dengan error "GAGAL: ...").
-- Dashboard sering tidak menampilkan pesan NOTICE, jadi baris ini jadi penandanya.
select 'SEMUA PENGUJIAN TAHAP 1 LOLOS' as hasil;