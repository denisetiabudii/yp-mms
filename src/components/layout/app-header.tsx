"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, UserRound, LogOut } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Halaman tujuan pencarian: daftar Notulen Rapat (sama dengan menu sidebar).
 * Halaman /minutes perlu membaca query `?q=` dan menyaring notulen
 * (judul, tanggal, peserta). Kalau nanti ingin mencari lintas notulen,
 * keputusan, dan tindak lanjut, buat halaman pencarian terpadu lalu ganti
 * nilai ini.
 */
const SEARCH_ROUTE = "/minutes";

type AppHeaderProps = {
  /** Pengguna yang sedang login. Diisi dari sesi oleh layout dashboard. */
  user?: { name: string; role: string };
  /** Jumlah notifikasi belum dibaca (undangan rapat, tindak lanjut, dsb). */
  unreadCount?: number;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppHeader({
  user = { name: "Administrator", role: "Super Admin" },
  unreadCount = 0,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Simpan halaman tempat dropdown dibuka. Dropdown dianggap terbuka hanya
  // selama pathname masih sama, jadi otomatis tertutup saat pindah halaman
  // tanpa perlu setState di dalam effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isProfileOpen = openedAt === pathname;

  const closeProfile = () => setOpenedAt(null);
  const toggleProfile = () =>
    setOpenedAt((current) => (current === pathname ? null : pathname));

  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const initials = getInitials(user.name);

  const isNotificationsActive = pathname.startsWith("/notifications");
  const isAccountActive = pathname.startsWith("/account");

  // Tutup dropdown saat klik di luar atau menekan Escape (fokus kembali ke tombol profil)
  useEffect(() => {
    if (!isProfileOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setOpenedAt(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenedAt(null);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  // Ctrl/Cmd + K: fokus ke kolom cari (desktop) atau buka halaman cari (mobile)
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        if (window.matchMedia("(min-width: 1024px)").matches) {
          searchRef.current?.focus();
          searchRef.current?.select();
        } else {
          router.push(SEARCH_ROUTE);
        }
      }
    }

    document.addEventListener("keydown", handleShortcut);

    return () => document.removeEventListener("keydown", handleShortcut);
  }, [router]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      searchRef.current?.focus();
      return;
    }

    router.push(`${SEARCH_ROUTE}?q=${encodeURIComponent(trimmed)}`);
    searchRef.current?.blur();
  }

  return (
    <>
      {/* HEADER UTAMA */}
      <header className="fixed inset-x-0 top-0 z-[60] flex h-16 w-full items-center justify-between bg-white/95 px-3 shadow-sm shadow-blue-900/5 backdrop-blur-md sm:px-4">
        {/* Garis aksen bawah, senada dengan gradien halaman login */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#075bea] via-[#0878f5] to-[#39b5f4]"
        />

        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* SIDEBAR TOGGLE - DESKTOP */}
          {!isMobile && (
            <SidebarTrigger className="rounded-lg text-[#1E3A8A] transition-colors hover:bg-[#EFF6FF] hover:text-[#0865ed]" />
          )}

          {/* BRAND: logo + identitas aplikasi, mengarah ke dashboard */}
          <Link
            href="/dashboard"
            aria-label="Ke halaman dashboard YP-MMS"
            className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40 sm:gap-3"
          >
            <BrandLogo className="h-9 sm:h-10" />

            <Separator
              orientation="vertical"
              className="h-8 bg-[#DBEAFE]"
            />

            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-none tracking-wide text-[#101b3a]">
                YP-MMS
              </p>

              <p className="mt-1 hidden text-[11px] leading-none text-[#64748B] sm:block">
                Meeting Management System
              </p>
            </div>
          </Link>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* SEARCH - DESKTOP */}
          <form
            role="search"
            onSubmit={handleSearch}
            className="hidden h-9 w-72 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[#64748B] transition-all hover:border-[#BFDBFE] focus-within:border-[#0865ed] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0865ed]/20 lg:flex"
          >
            <Search className="h-4 w-4 shrink-0" />

            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.currentTarget.blur();
              }}
              placeholder="Cari notulen rapat..."
              aria-label="Cari notulen rapat"
              enterKeyHint="search"
              maxLength={100}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#101b3a] outline-none placeholder:text-[#94A3B8]"
            />

            <kbd className="shrink-0 rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px]">
              Ctrl K
            </kbd>
          </form>

          {/* SEARCH - MOBILE & TABLET */}
          <Link
            href={SEARCH_ROUTE}
            aria-label="Cari notulen rapat"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition-colors hover:bg-[#EFF6FF] hover:text-[#0865ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40 sm:h-10 sm:w-10 lg:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>

          {/* NOTIFICATION */}
          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifikasi, ${unreadCount} belum dibaca`
                : "Notifikasi"
            }
            aria-current={isNotificationsActive ? "page" : undefined}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-[#FFFBEB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffca55] sm:h-10 sm:w-10 ${
              isNotificationsActive ? "bg-[#FFF7DB]" : "bg-transparent"
            }`}
          >
            {/* GOLD BELL */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="gold-bell-gradient"
                  x1="3"
                  y1="3"
                  x2="21"
                  y2="21"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFF176" />
                  <stop offset="35%" stopColor="#FFD700" />
                  <stop offset="70%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B8860B" />
                </linearGradient>
              </defs>

              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                fill="url(#gold-bell-gradient)"
                stroke="#CA8A04"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M10 21h4"
                stroke="#B8860B"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            {/* NOTIFICATION BADGE: hanya tampil jika ada yang belum dibaca */}
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#EF4444]" />
            )}
          </Link>

          {/* PROFILE DROPDOWN */}
          <div ref={profileRef} className="relative">
            <button
              ref={profileButtonRef}
              type="button"
              aria-label={`Menu akun ${user.name}`}
              aria-expanded={isProfileOpen}
              aria-controls="profile-menu"
              onClick={toggleProfile}
              className={`flex items-center gap-2 rounded-xl border px-1.5 py-1.5 transition-all hover:border-[#DBEAFE] hover:bg-[#EFF6FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40 sm:px-2 ${
                isProfileOpen
                  ? "border-[#DBEAFE] bg-[#EFF6FF]"
                  : "border-transparent"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#075bea] to-[#168af2] text-xs font-bold text-white shadow-sm shadow-blue-600/20 sm:h-9 sm:w-9 sm:text-sm">
                {initials}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold leading-none text-[#101b3a]">
                  {user.name}
                </p>

                <p className="mt-1 text-[11px] leading-none text-[#64748B]">
                  {user.role}
                </p>
              </div>

              <ChevronDown
                className={`hidden h-4 w-4 text-[#64748B] transition-transform sm:block ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/*
              DROPDOWN: pola "disclosure" (tombol + panel berisi tautan/tombol biasa).
              Tidak memakai role="menu" karena itu mewajibkan navigasi panah
              (Home/End/panah) yang tidak diimplementasikan di sini.
            */}
            {isProfileOpen && (
              <div
                id="profile-menu"
                className="absolute right-0 top-full z-[70] mt-2 w-60 overflow-hidden rounded-2xl border border-[#DBEAFE] bg-white p-1.5 shadow-[0_16px_40px_rgba(37,99,235,0.15)]"
              >
                {/* PROFILE INFO */}
                <div className="mb-1 flex items-center gap-3 rounded-xl bg-[#F4F8FF] px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#075bea] to-[#168af2] text-sm font-bold text-white">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101b3a]">
                      {user.name}
                    </p>

                    <p className="text-xs text-[#64748B]">{user.role}</p>
                  </div>
                </div>

                {/* ACCOUNT */}
                <Link
                  href="/account"
                  aria-current={isAccountActive ? "page" : undefined}
                  onClick={closeProfile}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#EFF6FF] hover:text-[#0865ed] focus:outline-none focus-visible:bg-[#EFF6FF] ${
                    isAccountActive
                      ? "bg-[#EFF6FF] font-semibold text-[#0865ed]"
                      : "text-[#475569]"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                  Akun saya
                </Link>

                <Separator className="my-1 bg-[#E2E8F0]" />

                {/* LOGOUT: Server Action menghapus sesi Supabase lalu mengarahkan ke login */}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR TOGGLE AREA */}
      {isMobile && (
        <div className="fixed left-0 top-16 z-[100] flex h-10 items-start">
          <div className="flex size-10 items-center justify-center rounded-br-lg border-b border-r border-[#DBEAFE] bg-white shadow-sm">
            <SidebarTrigger className="!size-9 rounded-md text-[#1E3A8A] hover:bg-[#EFF6FF] hover:text-[#0865ed]" />
          </div>
        </div>
      )}
    </>
  );
}
