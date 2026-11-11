# Pengaturan Supabase untuk Login YP-MMS

Semua dilakukan di **Supabase Dashboard** proyek Anda.

## 1. Authentication → Sign In / Providers
- **Email** aktif, **Confirm email** aktif.
- **Allow new users to sign up: MATIKAN** (nonaktifkan pendaftaran publik).
  Ini penting: pengguna hanya boleh masuk lewat undangan admin (PRD FR-003).
  Tanpa ini siapa pun bisa membuat akun lewat API.

## 2. Authentication → URL Configuration
- **Site URL**: alamat aplikasi produksi, mis. `https://mms.contoh.org`
- **Redirect URLs**: tambahkan `http://localhost:3000/**` (untuk dev) dan alamat produksi.

## 3. Authentication → Email Templates
Ganti tautan di dua template berikut. Ini wajib agar tautan bekerja
dengan sesi cookie server (tidak bergantung browser yang sama).

### Invite user
```html
<h2>Undangan YP-MMS</h2>
<p>Anda diundang menggunakan Yuk Peduli Meeting Management System.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Buat kata sandi</a></p>
```

### Reset password
```html
<h2>Atur ulang kata sandi</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Buat kata sandi baru</a></p>
<p>Abaikan email ini jika Anda tidak memintanya.</p>
```

> Jika pemindai email kantor (mis. Outlook SafeLinks) membuka tautan lebih dulu
> sehingga token langsung "kedaluwarsa", tambahkan halaman perantara berisi tombol
> "Lanjutkan" yang baru memanggil verifikasi saat diklik.

## 4. Authentication → Password security
- Panjang minimum: **10** (selaras dengan validasi di aplikasi).
- Aktifkan pengecekan kata sandi bocor (HaveIBeenPwned) bila tersedia di paket Anda.

## 5. Email pengirim
Email bawaan Supabase hanya untuk uji coba dan sangat dibatasi kuotanya.
Untuk produksi, siapkan **Custom SMTP** (Authentication → SMTP Settings).

## 6. Rate limit & CAPTCHA
Batas bawaan Supabase sudah aktif. Untuk produksi, pertimbangkan CAPTCHA
(Authentication → Attack Protection) agar login tahan brute force.