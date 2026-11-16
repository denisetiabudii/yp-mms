-- =====================================================================
-- YP-MMS — SQL manual untuk database Tahap 1 yang sudah ada
-- Dijalankan di Supabase Dashboard → SQL Editor (role postgres).
--
-- TUJUAN
--   Toolkit operasional untuk membaca, mengelola (CRUD), dan memeriksa
--   tabel Tahap 1. Tidak membuat tabel, enum, trigger, function, policy,
--   relasi, index, maupun seed data baru.
--
-- CARA PAKAI
--   * Jalankan satu blok pada satu waktu, bukan seluruh file sekaligus.
--   * Ganti UUID contoh dengan ID asli dari hasil SELECT.
--   * Perintah perubahan data sengaja dikomentari. Hapus tanda "-- "
--     pada blok yang memang ingin dijalankan.
--   * SQL Editor menggunakan role postgres dan melewati RLS. Periksa
--     filter WHERE dengan teliti sebelum menjalankan UPDATE/DELETE.
--
-- TABEL YANG DICAKUP
--   public.org_nodes        → Grup / Unit / Departemen / Divisi
--   public.positions        → master jabatan
--   public.user_assignments → penugasan pengguna
--   public.app_settings     → pengaturan aplikasi
--   public.profiles         → lookup/monitoring profil (bukan CRUD akun)
--
-- ATURAN PENTING
--   * org_nodes tidak dihapus. Nonaktifkan node agar riwayat terjaga.
--   * kind dan parent_id org_nodes tidak dapat diubah setelah dibuat.
--   * Menonaktifkan node otomatis menonaktifkan seluruh turunannya.
--   * Grup tidak dapat dinonaktifkan.
--   * Hierarki: Unit→Grup; Departemen→Unit; Divisi→Departemen/Divisi.
--   * Penugasan hanya boleh diarahkan ke node organisasi yang aktif.
--   * app_settings pada migrasi hanya memberi authenticated SELECT/UPDATE.
--     INSERT/DELETE pengaturan dilakukan melalui SQL Editor (postgres).
-- =====================================================================


-- =====================================================================
-- 1. PEMERIKSAAN DATABASE
-- =====================================================================

-- 1.1 Daftar tabel Tahap 1 dan status RLS
select
  c.relname as nama_tabel,
  c.relrowsecurity as rls_aktif,
  c.relforcerowsecurity as rls_dipaksa
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('org_nodes', 'positions', 'user_assignments', 'app_settings', 'profiles')
  and c.relkind = 'r'
order by c.relname;

-- 1.2 Kolom, tipe data, nullability, dan default
select
  table_name, ordinal_position, column_name, data_type,
  is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('org_nodes', 'positions', 'user_assignments', 'app_settings', 'profiles')
order by table_name, ordinal_position;

-- 1.3 Foreign key dan relasi
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
order by tc.table_name, kcu.column_name;

-- 1.4 Index
select
  tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
order by tablename, indexname;

-- 1.5 Constraint
select
  conrelid::regclass as nama_tabel,
  conname as nama_constraint,
  contype as jenis_constraint,
  pg_get_constraintdef(oid) as definisi
from pg_constraint
where conrelid in (
  'public.org_nodes'::regclass,
  'public.positions'::regclass,
  'public.user_assignments'::regclass,
  'public.app_settings'::regclass
)
order by nama_tabel::text, conname;

-- 1.6 RLS policies
select
  schemaname, tablename, policyname, permissive,
  roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
order by tablename, policyname;

-- 1.7 Trigger
select
  event_object_table as nama_tabel,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
order by event_object_table, trigger_name;

-- 1.8 Function terkait skema Tahap 1
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'org_nodes_guard', 'org_nodes_cascade_inactive',
    'user_assignments_guard', 'app_settings_touch',
    'my_role', 'is_active_user', 'my_org_scope', 'admin_list_users'
  )
order by p.proname;

-- 1.9 Ukuran tabel dan estimasi jumlah baris
select
  schemaname, relname as nama_tabel,
  n_live_tup as estimasi_baris,
  pg_size_pretty(pg_total_relation_size(relid)) as total_ukuran
from pg_stat_user_tables
where schemaname = 'public'
  and relname in ('org_nodes', 'positions', 'user_assignments', 'app_settings')
order by relname;


-- =====================================================================
-- 2. STRUKTUR ORGANISASI (org_nodes)
-- =====================================================================

-- 2.1 READ: seluruh node beserta induk
select
  n.id, n.parent_id, n.kind, n.name, n.code,
  n.is_active, n.sort_order, p.name as parent_name,
  n.created_at, n.updated_at
from public.org_nodes n
left join public.org_nodes p on p.id = n.parent_id
order by
  case n.kind
    when 'grup' then 1 when 'unit' then 2
    when 'departemen' then 3 when 'divisi' then 4
  end,
  n.sort_order, n.name;

-- 2.2 READ: pohon organisasi dengan jalur lengkap
with recursive org_tree as (
  select id, parent_id, kind, name, code, is_active, sort_order,
         name::text as path, 0 as depth
  from public.org_nodes
  where parent_id is null
  union all
  select n.id, n.parent_id, n.kind, n.name, n.code, n.is_active, n.sort_order,
         t.path || ' / ' || n.name, t.depth + 1
  from public.org_nodes n
  join org_tree t on n.parent_id = t.id
)
select id, kind, name, code, is_active, depth, path
from org_tree
order by path;

-- 2.3 READ: node aktif yang dapat dipilih sebagai induk
select id, kind, name, code
from public.org_nodes
where is_active
order by kind, name;

-- 2.4 READ: cari node berdasarkan nama/kode
select id, parent_id, kind, name, code, is_active
from public.org_nodes
where lower(name) like lower('%kata_kunci%')
   or upper(coalesce(code, '')) = upper('KODE');

-- 2.5 READ: jumlah node per jenis dan status
select kind, is_active, count(*) as jumlah
from public.org_nodes
group by kind, is_active
order by kind, is_active desc;

-- 2.6 CREATE: tambah Unit di bawah Grup
-- insert into public.org_nodes (parent_id, kind, name, code, sort_order)
-- values ('UUID_GRUP', 'unit', 'Nama Unit', 'UNIT1', 10)
-- returning *;

-- 2.7 CREATE: tambah Departemen di bawah Unit
-- insert into public.org_nodes (parent_id, kind, name, code, sort_order)
-- values ('UUID_UNIT', 'departemen', 'Nama Departemen', 'DEPT1', 10)
-- returning *;

-- 2.8 CREATE: tambah Divisi di bawah Departemen/Divisi
-- insert into public.org_nodes (parent_id, kind, name, code, sort_order)
-- values ('UUID_INDUK', 'divisi', 'Nama Divisi', 'DIV1', 10)
-- returning *;

-- 2.9 UPDATE: ubah nama, kode, atau urutan.
--     kind dan parent_id tidak dapat diubah oleh trigger.
-- update public.org_nodes
--    set name = 'Nama Baru', code = 'KODE1', sort_order = 20
--  where id = 'UUID_NODE'
-- returning *;

-- 2.10 UPDATE: nonaktifkan node dan seluruh turunannya.
--      Grup tidak dapat dinonaktifkan.
-- update public.org_nodes
--    set is_active = false
--  where id = 'UUID_NODE'
--    and kind <> 'grup'
-- returning *;

-- 2.11 PREVIEW: periksa dampak penonaktifan sebelum menjalankan 2.10
with recursive descendants as (
  select id, parent_id, kind, name, is_active
  from public.org_nodes
  where id = 'UUID_NODE'
  union all
  select n.id, n.parent_id, n.kind, n.name, n.is_active
  from public.org_nodes n
  join descendants d on n.parent_id = d.id
)
select * from descendants order by kind, name;

-- 2.12 UPDATE: aktifkan kembali satu node.
--      Induknya harus sudah aktif. Anak yang ikut nonaktif tidak otomatis aktif.
-- update public.org_nodes
--    set is_active = true
--  where id = 'UUID_NODE'
--    and kind <> 'grup'
--    and exists (
--      select 1 from public.org_nodes parent
--      where parent.id = org_nodes.parent_id and parent.is_active
--    )
-- returning *;

-- 2.13 DELETE tidak disediakan untuk org_nodes.
--      Migrasi memang menggunakan penonaktifan agar riwayat tetap terjaga.


-- =====================================================================
-- 3. MASTER JABATAN (positions) — FULL CRUD
-- =====================================================================

-- 3.1 READ: semua jabatan
select id, name, is_active, created_at
from public.positions
order by is_active desc, name;

-- 3.2 READ: jabatan aktif
select id, name
from public.positions
where is_active
order by name;

-- 3.3 CREATE: tambah jabatan
-- insert into public.positions (name)
-- values ('Supervisor')
-- returning *;

-- 3.4 UPDATE: ubah nama jabatan
-- update public.positions
--    set name = 'Nama Jabatan Baru'
--  where id = 'UUID_POSITION'
-- returning *;

-- 3.5 UPDATE: aktifkan/nonaktifkan jabatan
-- update public.positions
--    set is_active = false
--  where id = 'UUID_POSITION'
-- returning *;

-- update public.positions
--    set is_active = true
--  where id = 'UUID_POSITION'
-- returning *;

-- 3.6 DELETE: hapus jabatan yang belum dipakai penugasan.
--      Akan ditolak oleh FK jika masih direferensikan user_assignments.
-- delete from public.positions
--  where id = 'UUID_POSITION'
--    and not exists (
--      select 1 from public.user_assignments a
--      where a.position_id = positions.id
--    )
-- returning *;


-- =====================================================================
-- 4. PENUGASAN PENGGUNA (user_assignments) — FULL CRUD
-- =====================================================================

-- 4.1 READ: semua penugasan beserta profil, organisasi, dan jabatan
select
  a.id as assignment_id,
  a.user_id,
  p.full_name,
  p.employee_no,
  p.role,
  p.is_active as user_is_active,
  a.org_node_id,
  n.name as organization_name,
  n.kind as organization_kind,
  n.is_active as organization_is_active,
  a.position_id,
  pos.name as position_name,
  pos.is_active as position_is_active,
  a.created_at
from public.user_assignments a
join public.profiles p on p.id = a.user_id
join public.org_nodes n on n.id = a.org_node_id
join public.positions pos on pos.id = a.position_id
order by p.full_name, n.name, pos.name;

-- 4.2 READ: cari penugasan berdasarkan email
select
  a.id as assignment_id, u.email, p.full_name,
  n.name as organization_name, pos.name as position_name
from public.user_assignments a
join public.profiles p on p.id = a.user_id
join auth.users u on u.id = p.id
join public.org_nodes n on n.id = a.org_node_id
join public.positions pos on pos.id = a.position_id
where lower(u.email) = lower('nama@email.com');

-- 4.3 READ: pengguna yang belum memiliki penugasan
select p.id, u.email, p.full_name, p.employee_no, p.role
from public.profiles p
join auth.users u on u.id = p.id
left join public.user_assignments a on a.user_id = p.id
where a.id is null
order by p.full_name;

-- 4.4 READ: daftar profil aktif untuk referensi user_id
select p.id, u.email, p.full_name, p.employee_no, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.is_active
order by p.full_name;

-- 4.5 READ: daftar node aktif untuk referensi org_node_id
select id, kind, name, code
from public.org_nodes
where is_active
order by kind, name;

-- 4.6 READ: daftar jabatan aktif untuk referensi position_id
select id, name
from public.positions
where is_active
order by name;

-- 4.7 CREATE: buat penugasan pengguna.
--      Ganti ketiga UUID dengan hasil query 4.4–4.6.
-- insert into public.user_assignments (user_id, org_node_id, position_id)
-- values ('UUID_USER', 'UUID_ORG_NODE', 'UUID_POSITION')
-- returning *;

-- 4.8 UPDATE: pindahkan penugasan ke node/jabatan lain.
--      user_id tetap; node tujuan harus aktif.
-- update public.user_assignments
--    set org_node_id = 'UUID_ORG_NODE_BARU',
--        position_id = 'UUID_POSITION_BARU'
--  where id = 'UUID_ASSIGNMENT'
-- returning *;

-- 4.9 DELETE: hapus satu penugasan (bukan akun pengguna).
-- delete from public.user_assignments
--  where id = 'UUID_ASSIGNMENT'
-- returning *;

-- 4.10 READ: deteksi penugasan ke node/jabatan nonaktif
select
  a.id, p.full_name, n.name as organization_name, pos.name as position_name,
  n.is_active as organization_is_active,
  pos.is_active as position_is_active
from public.user_assignments a
join public.profiles p on p.id = a.user_id
join public.org_nodes n on n.id = a.org_node_id
join public.positions pos on pos.id = a.position_id
where not n.is_active or not pos.is_active;


-- =====================================================================
-- 5. PENGATURAN APLIKASI (app_settings)
-- =====================================================================

-- 5.1 READ: seluruh pengaturan
select key, value, description, updated_at, updated_by
from public.app_settings
order by key;

-- 5.2 READ: satu pengaturan berdasarkan key
select key, value, description, updated_at, updated_by
from public.app_settings
where key = 'meeting_number_format';

-- 5.3 UPDATE: ubah nilai JSONB pengaturan.
--      Contoh: mengubah batas review notulen menjadi 3 hari.
-- update public.app_settings
--    set value = '3'::jsonb,
--        description = 'Batas hari notulen menunggu review.'
--  where key = 'minute_review_sla_days'
-- returning *;

-- 5.4 UPDATE: ubah format nomor rapat.
-- update public.app_settings
--    set value = '{
--      "pattern": "YP/{unit}/{dept}/{seq}/{roman_month}/{year}",
--      "seq_pad": 4,
--      "seq_reset": "yearly_per_unit"
--    }'::jsonb
--  where key = 'meeting_number_format'
-- returning *;

-- 5.5 CREATE: tambah key pengaturan baru melalui SQL Editor.
--      Key harus 2–60 karakter, huruf kecil/angka/underscore.
-- insert into public.app_settings (key, value, description)
-- values ('contoh_pengaturan', '{"enabled": true}'::jsonb, 'Deskripsi pengaturan')
-- returning *;

-- 5.6 DELETE: hapus satu key pengaturan (pastikan tidak sedang dipakai aplikasi).
-- delete from public.app_settings
--  where key = 'contoh_pengaturan'
-- returning *;


-- =====================================================================
-- 6. PROFIL PENGGUNA — LOOKUP SAJA
--    Akun Auth tidak dibuat/dihapus dari toolkit ini.
-- =====================================================================

-- 6.1 READ: daftar pengguna beserta email dan role
select
  p.id, u.email, p.full_name, p.employee_no,
  p.role, p.is_active, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.full_name;

-- 6.2 READ: satu pengguna berdasarkan email
select
  p.id, u.email, p.full_name, p.employee_no,
  p.role, p.is_active
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('nama@email.com');

-- 6.3 READ: jumlah pengguna per role dan status
select role, is_active, count(*) as jumlah
from public.profiles
group by role, is_active
order by role, is_active desc;


-- =====================================================================
-- 7. PEMECAHAN MASALAH
-- =====================================================================

-- 7.1 Periksa apakah fungsi/trigger utama Tahap 1 tersedia
select
  to_regprocedure('public.org_nodes_guard()') is not null as fungsi_org_nodes_guard,
  to_regprocedure('public.org_nodes_cascade_inactive()') is not null as fungsi_cascade_inactive,
  to_regprocedure('public.user_assignments_guard()') is not null as fungsi_assignment_guard,
  to_regprocedure('public.app_settings_touch()') is not null as fungsi_settings_touch,
  to_regprocedure('public.my_org_scope()') is not null as fungsi_my_org_scope,
  to_regprocedure('public.admin_list_users()') is not null as fungsi_admin_list_users;

-- 7.2 Periksa satuan jumlah data pada tabel inti
select 'org_nodes' as tabel, count(*) as jumlah from public.org_nodes
union all
select 'positions', count(*) from public.positions
union all
select 'user_assignments', count(*) from public.user_assignments
union all
select 'app_settings', count(*) from public.app_settings
union all
select 'profiles', count(*) from public.profiles;

-- 7.3 Refresh cache skema PostgREST setelah perubahan skema manual.
--      Biasanya tidak diperlukan untuk INSERT/UPDATE/DELETE data biasa.
notify pgrst, 'reload schema';

-- =====================================================================
-- AKHIR TOOLKIT
-- =====================================================================
