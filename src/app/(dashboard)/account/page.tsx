"use client";

import * as React from "react";
import {
  UserRound,
  ShieldCheck,
  Bell,
  Settings,
  Camera,
  Save,
  LockKeyhole,
  Mail,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AccountTab = "profile" | "security" | "preferences";

export default function AccountPage() {
  const [activeTab, setActiveTab] = React.useState<AccountTab>("profile");
  const [saved, setSaved] = React.useState(false);

  const [profile, setProfile] = React.useState({
    name: "Administrator",
    email: "admin@yukpeduli.or.id",
    phone: "081234567890",
    position: "Super Admin",
    organization: "Yuk Peduli",
  });

  const [preferences, setPreferences] = React.useState({
    emailNotification: true,
    meetingReminder: true,
    followUpReminder: true,
    twoFactor: false,
  });

  const [password, setPassword] = React.useState({
    current: "",
    newPassword: "",
    confirmation: "",
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState("");

  const tabs = [
    {
      id: "profile" as const,
      label: "Profil",
      description: "Informasi akun",
      icon: UserRound,
    },
    {
      id: "security" as const,
      label: "Keamanan",
      description: "Password dan akses",
      icon: ShieldCheck,
    },
    {
      id: "preferences" as const,
      label: "Preferensi",
      description: "Notifikasi dan pengaturan",
      icon: Settings,
    },
  ];

  function updateProfile(
    field: keyof typeof profile,
    value: string
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  function togglePreference(
    field: keyof typeof preferences
  ) {
    setPreferences((current) => ({
      ...current,
      [field]: !current[field],
    }));

    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
  }

  function handlePasswordChange() {
    if (
      !password.current ||
      !password.newPassword ||
      !password.confirmation
    ) {
      setPasswordMessage("Lengkapi seluruh kolom kata sandi.");
      return;
    }

    if (password.newPassword.length < 8) {
      setPasswordMessage(
        "Kata sandi baru minimal terdiri dari 8 karakter."
      );
      return;
    }

    if (password.newPassword !== password.confirmation) {
      setPasswordMessage(
        "Konfirmasi kata sandi tidak sesuai."
      );
      return;
    }

    setPasswordMessage(
      "Validasi berhasil. Hubungkan ke API untuk menyimpan kata sandi."
    );
  }

  return (
    <div className="min-w-0 space-y-6 pt-20">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Pengaturan Akun
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola informasi profil, keamanan, dan preferensi akun Anda.
          </p>
        </div>

        {activeTab !== "security" && (
          <Button
            onClick={handleSave}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            {saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saved ? "Tersimpan" : "Simpan Perubahan"}
          </Button>
        )}
      </div>

      {/* Account Summary */}
      <Card className="overflow-hidden border-[#DBEAFE] shadow-sm">
        <div className="h-2 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400" />

        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <UserRound className="h-8 w-8" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-800">
                {profile.name}
              </h2>

              <p className="text-sm text-slate-500">
                {profile.position}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Administrator
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Akun Aktif
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              {profile.organization}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              {profile.email}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Navigation */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSaved(false);
                setPasswordMessage("");
              }}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-[#DBEAFE] bg-white hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isActive ? "text-blue-700" : "text-slate-700"
                  }`}
                >
                  {tab.label}
                </p>

                <p className="text-xs text-slate-500">
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <UserRound className="h-5 w-5 text-blue-600" />
              Informasi Profil
            </CardTitle>

            <p className="text-sm text-slate-500">
              Informasi dasar yang digunakan pada sistem YP-MMS.
            </p>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <UserRound className="h-8 w-8" />
              </div>

              <div>
                <p className="font-semibold text-slate-800">
                  Foto Profil
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Avatar akun administrator.
                </p>
              </div>

              <div className="sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="gap-2 border-blue-200 text-blue-700"
                >
                  <Camera className="h-4 w-4" />
                  Ubah Foto
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nama Lengkap
                </label>

                <Input
                  value={profile.name}
                  onChange={(e) =>
                    updateProfile("name", e.target.value)
                  }
                  placeholder="Masukkan nama lengkap"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Jabatan
                </label>

                <Input
                  value={profile.position}
                  onChange={(e) =>
                    updateProfile("position", e.target.value)
                  }
                  placeholder="Masukkan jabatan"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    updateProfile("email", e.target.value)
                  }
                  placeholder="nama@email.com"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nomor Telepon
                </label>

                <Input
                  value={profile.phone}
                  onChange={(e) =>
                    updateProfile("phone", e.target.value)
                  }
                  placeholder="08xxxxxxxxxx"
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Instansi
                </label>

                <Input
                  value={profile.organization}
                  onChange={(e) =>
                    updateProfile("organization", e.target.value)
                  }
                  placeholder="Nama instansi"
                  className="border-slate-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <div className="space-y-5">
          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <LockKeyhole className="h-5 w-5 text-blue-600" />
                Ubah Kata Sandi
              </CardTitle>

              <p className="text-sm text-slate-500">
                Gunakan kata sandi yang kuat untuk menjaga keamanan akun.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Kata Sandi Saat Ini
                </label>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password.current}
                    onChange={(e) =>
                      setPassword((current) => ({
                        ...current,
                        current: e.target.value,
                      }))
                    }
                    placeholder="Masukkan kata sandi saat ini"
                    className="border-slate-200 pr-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Kata Sandi Baru
                  </label>

                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password.newPassword}
                    onChange={(e) =>
                      setPassword((current) => ({
                        ...current,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Minimal 8 karakter"
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Konfirmasi Kata Sandi
                  </label>

                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password.confirmation}
                    onChange={(e) =>
                      setPassword((current) => ({
                        ...current,
                        confirmation: e.target.value,
                      }))
                    }
                    placeholder="Ulangi kata sandi baru"
                    className="border-slate-200"
                  />
                </div>
              </div>

              {passwordMessage && (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  {passwordMessage}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handlePasswordChange}
                  className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Ubah Kata Sandi
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#DBEAFE] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Verifikasi Dua Langkah
              </CardTitle>

              <p className="text-sm text-slate-500">
                Tambahkan lapisan keamanan ekstra pada akun Anda.
              </p>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  Autentikasi Dua Faktor (2FA)
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Status:{" "}
                  {preferences.twoFactor
                    ? "Aktif"
                    : "Belum diaktifkan"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => togglePreference("twoFactor")}
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {preferences.twoFactor
                  ? "Nonaktifkan"
                  : "Aktifkan 2FA"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "preferences" && (
        <Card className="border-[#DBEAFE] shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base text-slate-800">
              <Settings className="h-5 w-5 text-blue-600" />
              Preferensi Sistem
            </CardTitle>

            <p className="text-sm text-slate-500">
              Atur bagaimana YP-MMS memberikan informasi kepada Anda.
            </p>
          </CardHeader>

          <CardContent className="divide-y divide-slate-100 p-5">
            <PreferenceItem
              icon={Mail}
              title="Notifikasi Email"
              description="Terima pemberitahuan aktivitas melalui email."
              checked={preferences.emailNotification}
              onChange={() =>
                togglePreference("emailNotification")
              }
            />

            <PreferenceItem
              icon={Bell}
              title="Pengingat Rapat"
              description="Dapatkan pengingat sebelum rapat dimulai."
              checked={preferences.meetingReminder}
              onChange={() =>
                togglePreference("meetingReminder")
              }
            />

            <PreferenceItem
              icon={CheckCircle2}
              title="Pengingat Tindak Lanjut"
              description="Terima notifikasi untuk tugas tindak lanjut yang belum selesai."
              checked={preferences.followUpReminder}
              onChange={() =>
                togglePreference("followUpReminder")
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Save Feedback */}
      {saved && activeTab !== "security" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Perubahan berhasil disimpan pada state halaman.
        </div>
      )}
    </div>
  );
}

function PreferenceItem({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
