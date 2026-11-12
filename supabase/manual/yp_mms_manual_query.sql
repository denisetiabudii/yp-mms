-- =====================================================================
-- YP-MMS — SQL manual untuk skema yang sudah ada
-- Dijalankan di Supabase Dashboard → SQL Editor (role postgres).
--
-- CARA PAKAI
--   * Jangan jalankan berkas ini sekaligus. Salin satu blok, ganti
--     'nama@email.com' dengan email pengguna, lalu jalankan.
--   * Perintah yang berbahaya sengaja dikomentari (diawali "-- ").
--     Buka komentarnya hanya saat memang dibutuhkan.
--
-- URUTAN MIGRASI (sudah dijalankan; dicatat di sini sebagai rujukan)
--   1. Migrasi fondasi: tabel profiles, enum app_role, RLS
--   2. account_security.sql  → sesi dicabut saat profil diubah admin
--   3. login_attempts.sql    → batas 3 kali gagal login
--
-- PERILAKU PENTING
--   * Setiap UPDATE pada public.profiles yang dijalankan dari SQL Editor
--     dianggap "diubah orang lain": semua sesi login pengguna itu dihapus dan
--     ia terlempar ke /login pada request berikutnya. Ini disengaja
--     (juga berlaku saat mengaktifkan kembali akun atau mengubah nama).
--   * Hanya pemilik profil yang boleh mengubah full_name-nya sendiri dari
--     aplikasi, dan itu tidak memutus sesinya.
-- =====================================================================


-- =====================================================================
-- 1. MELIHAT DATA PENGGUNA
-- =====================================================================

-- 1.1 Semua pengguna beserta role dan status
select u.email, p.full_name, p.employee_no, p.role, p.is_active,
       p.session_revoked_at, u.last_sign_in_at, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at desc;

-- 1.2 Satu pengguna berdasarkan email
select u.id, u.email, p.full_name, p.employee_no, p.role, p.is_active,
       p.session_revoked_at, u.last_sign_in_at
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('nama@email.com');

-- 1.3 Daftar role yang valid
select unnest(enum_range(null::public.app_role)) as role;

-- 1.4 Jumlah pengguna per role dan status
select role, is_active, count(*) as jumlah
from public.profiles
group by role, is_active
order by role, is_active desc;

-- 1.5 Super Admin yang aktif (harus selalu ada minimal satu)
select u.email, p.full_name
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin' and p.is_active;

-- 1.6 Akun di auth.users yang belum punya profil (seharusnya kosong;
--     profil dibuat otomatis oleh trigger on_auth_user_created)
select u.id, u.email, u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;


-- =====================================================================
-- 2. MENGELOLA PENGGUNA
--    Semua perintah di bagian ini memutus sesi login pengguna yang diubah.
-- =====================================================================

-- 2.1 Jadikan Super Admin
update public.profiles
   set role = 'super_admin', full_name = 'Nama Lengkap Admin'
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 2.2 Ubah role (nilai valid: lihat 1.3)
update public.profiles
   set role = 'notulis'
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 2.3 Ubah nama lengkap dan/atau NOID karyawan (NOID harus unik)
update public.profiles
   set full_name = 'Nama Baru', employee_no = 'YP-0001'
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 2.4 Nonaktifkan pengguna (FR-001): ia langsung terlempar dan tidak bisa masuk lagi.
--     Sebelum menonaktifkan Super Admin, pastikan 1.5 menunjukkan lebih dari satu.
update public.profiles
   set is_active = false
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 2.5 Aktifkan kembali pengguna (ia harus masuk lagi)
update public.profiles
   set is_active = true
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 2.6 Hapus akun SEPENUHNYA (tidak bisa dibatalkan; profil ikut terhapus lewat
--     "on delete cascade"). Sebaiknya pakai 2.4 (nonaktifkan) agar riwayat
--     rapat dan keputusan tetap utuh.
-- delete from auth.users
--  where lower(email) = lower('nama@email.com');


-- =====================================================================
-- 3. SESI LOGIN
-- =====================================================================

-- 3.1 Sesi aktif milik satu pengguna
select s.id, s.created_at, s.updated_at, s.user_agent, s.ip
from auth.sessions s
where s.user_id = (select id from auth.users where lower(email) = lower('nama@email.com'))
order by s.created_at desc;

-- 3.2 Paksa satu pengguna keluar tanpa mengubah datanya.
--     (Trigger mengisi session_revoked_at dan menghapus semua sesinya.)
update public.profiles
   set session_revoked_at = now()
 where id = (select id from auth.users where lower(email) = lower('nama@email.com'));

-- 3.3 Paksa SEMUA pengguna keluar (mis. saat ada insiden keamanan).
--     Termasuk akun Anda sendiri.
-- update public.profiles set session_revoked_at = now();


-- =====================================================================
-- 4. BATAS PERCOBAAN LOGIN (3 gagal → kunci 15 menit)
--    Kunci di tabel adalah hash SHA-256 dari email huruf kecil, sehingga
--    pencarian per email memakai ekspresi encode(sha256(...)) di bawah.
-- =====================================================================

-- 4.1 Semua hitungan beserta status kunci
select key, failed_count, first_failed_at, locked_until,
       coalesce(locked_until > now(), false) as sedang_terkunci,
       greatest(ceil(extract(epoch from (locked_until - now())))::int, 0) as sisa_detik
from public.login_attempts
order by first_failed_at desc;

-- 4.2 Hitungan satu email
select *
from public.login_attempts
where key = encode(sha256(convert_to(lower('nama@email.com'), 'UTF8')), 'hex');

-- 4.3 Buka kunci dan hapus hitungan satu email
delete from public.login_attempts
 where key = encode(sha256(convert_to(lower('nama@email.com'), 'UTF8')), 'hex');

-- 4.4 Bersihkan baris lama (tidak menyentuh yang sedang terkunci atau baru gagal)
delete from public.login_attempts
 where (locked_until is null or locked_until < now())
   and first_failed_at < now() - interval '1 day';

-- 4.5 Buka kunci SEMUA email
-- delete from public.login_attempts;

-- 4.6 Uji logika pembatas dengan kunci contoh: hasilnya 0, 0, lalu 900
select public.login_attempt_fail('uji', 3, 15, 15);
select public.login_attempt_fail('uji', 3, 15, 15);
select public.login_attempt_fail('uji', 3, 15, 15);
select public.login_attempt_status('uji');  -- sisa detik kunci, sekitar 900
select public.login_attempt_reset('uji');   -- bersihkan kunci contoh


-- =====================================================================
-- 5. MEMERIKSA PEMASANGAN
-- =====================================================================

-- 5.1 Trigger, fungsi, dan kolom sudah terpasang? (semua harus true)
select
  exists(select 1 from pg_trigger where tgname = 'profiles_end_sessions')            as trigger_sesi,
  exists(select 1 from pg_trigger where tgname = 'profiles_set_updated_at')          as trigger_updated_at,
  exists(select 1 from pg_trigger where tgname = 'on_auth_user_created')             as trigger_profil_baru,
  exists(select 1 from pg_proc where proname = 'is_session_valid')                   as fungsi_sesi_valid,
  exists(select 1 from pg_proc where proname = 'is_super_admin')                     as fungsi_super_admin,
  exists(select 1 from pg_proc where proname = 'login_attempt_fail')                 as fungsi_batas_login,
  exists(select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'profiles'
            and column_name = 'session_revoked_at')                                  as kolom_revoked_at;

-- 5.2 RLS aktif di tabel profiles dan login_attempts? (keduanya harus true)
select c.relname as tabel, c.relrowsecurity as rls_aktif
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles', 'login_attempts');

-- 5.3 Hak akses fungsi pembatas login: hanya service_role yang boleh
select
  has_function_privilege('service_role', 'public.login_attempt_fail(text,integer,integer,integer)', 'execute') as service_role_boleh,  -- harus true
  has_function_privilege('anon',          'public.login_attempt_fail(text,integer,integer,integer)', 'execute') as anon_boleh,          -- harus false
  has_function_privilege('authenticated', 'public.login_attempt_fail(text,integer,integer,integer)', 'execute') as authenticated_boleh; -- harus false

-- 5.4 Hak akses is_session_valid: anon tidak boleh, authenticated boleh
select
  has_function_privilege('anon',          'public.is_session_valid()', 'execute') as anon_boleh,          -- harus false
  has_function_privilege('authenticated', 'public.is_session_valid()', 'execute') as authenticated_boleh; -- harus true


-- =====================================================================
-- 6. PEMECAHAN MASALAH
-- =====================================================================

-- 6.1 Fungsi baru "tidak ditemukan" dari aplikasi (cache skema API belum terbarui)
notify pgrst, 'reload schema';