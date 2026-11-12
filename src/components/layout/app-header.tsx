"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  FileText,
  Loader2,
  Search,
  UserRound,
  LogOut,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { signOutAction } from "@/lib/auth/actions";
import { searchMinutesAction } from "@/lib/search/actions";

/**
 * Halaman tujuan pencarian: daftar Notulen Rapat (sama dengan menu sidebar).
 * Halaman /minutes perlu membaca query `?q=` dan menyaring notulen
 * (judul, tanggal, peserta). Kalau nanti ingin mencari lintas notulen,
 * keputusan, dan tindak lanjut, buat halaman pencarian terpadu lalu ganti
 * nilai ini.
 */
const SEARCH_ROUTE = "/minutes";

/** Satu hasil pencarian. `date` dan `status` sudah berupa teks siap tampil. */
export type SearchResult = {
  id: string;
  title: string;
  date: string;
  status: string;
  href: string;
};

type SearchStatus = "idle" | "loading" | "done" | "error";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

type AppHeaderProps = {
  /** Pengguna yang sedang login. Ambil dari sesi saat backend siap. */
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
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  // Pencarian di mobile dan tablet: kolom cari muncul sebagai bar di bawah
  // header. Seperti dropdown profil, status terbukanya terikat ke pathname,
  // jadi menutup sendiri saat pindah halaman tanpa setState di dalam effect.
  const [searchOpenedAt, setSearchOpenedAt] = useState<string | null>(null);
  const isSearchOpen = searchOpenedAt === pathname;

  const toggleSearch = () =>
    setSearchOpenedAt((current) => (current === pathname ? null : pathname));

  // Hasil pencarian langsung. Semua setState dilakukan di event handler dan
  // callback (bukan di effect), requestId mencegah hasil lama menimpa yang baru.
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelAt, setPanelAt] = useState<string | null>(null);
  const isPanelOpen = panelAt === pathname;

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();

  const initials = getInitials(user.name);

  const isNotificationsActive = pathname.startsWith("/notifications");
  const isAccountActive = pathname.startsWith("/account");

  // Tutup dropdown saat klik di luar atau menekan Escape
  useEffect(() => {
    if (!isProfileOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setOpenedAt(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedAt(null);
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
          setSearchOpenedAt(pathname);
        }
      }
    }

    document.addEventListener("keydown", handleShortcut);

    return () => document.removeEventListener("keydown", handleShortcut);
  }, [pathname]);

  // Saat bar pencarian dibuka (mobile/tablet), langsung fokus ke kolom cari
  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  // Tutup daftar hasil saat klik di luar area pencarian
  useEffect(() => {
    if (!isPanelOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setPanelAt(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isPanelOpen]);

  // Bersihkan timer debounce saat komponen dilepas
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function closeSearch() {
    setPanelAt(null);
    setSearchOpenedAt(null);
  }

  function resetSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;

    setQuery("");
    setResults([]);
    setSearchStatus("idle");
    setActiveIndex(-1);
  }

  function handleSelectResult() {
    closeSearch();
    resetSearch();
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);

    const trimmed = value.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current += 1;

    if (!trimmed) {
      setPanelAt(null);
      setResults([]);
      setSearchStatus("idle");
      return;
    }

    setPanelAt(pathname);

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchStatus("idle");
      return;
    }

    const requestId = requestIdRef.current;
    setSearchStatus("loading");

    debounceRef.current = setTimeout(async () => {
      try {
        const found = await searchMinutesAction(trimmed);

        if (requestId !== requestIdRef.current) return;

        setResults(found);
        setSearchStatus("done");
      } catch {
        if (requestId !== requestIdRef.current) return;

        setResults([]);
        setSearchStatus("error");
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedQuery) {
      searchRef.current?.focus();
      return;
    }

    // Berpindah halaman hanya jika ada hasil. Mengetik asal-asalan tidak
    // membawa pengguna ke mana pun.
    if (searchStatus !== "done" || results.length === 0) return;

    const seeAllHref = `${SEARCH_ROUTE}?q=${encodeURIComponent(trimmedQuery)}`;

    router.push(results[activeIndex]?.href ?? seeAllHref);
    searchRef.current?.blur();
    handleSelectResult();
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
          {/* SEARCH: tombol buka/tutup (mobile & tablet) */}
          <button
            type="button"
            onClick={toggleSearch}
            aria-label={isSearchOpen ? "Tutup pencarian" : "Cari notulen rapat"}
            aria-expanded={isSearchOpen}
            aria-controls="header-search"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition-colors hover:bg-[#EFF6FF] hover:text-[#0865ed] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40 sm:h-10 sm:w-10 lg:hidden"
          >
            {isSearchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>

          {/* SEARCH: bar di bawah header (mobile & tablet), kolom inline (desktop) */}
          <div ref={searchWrapRef} className="contents lg:relative lg:block">
            <form
              id="header-search"
              role="search"
              onSubmit={handleSearch}
              className={`items-center gap-2 text-[#64748B] ${
                isSearchOpen
                  ? `absolute inset-x-0 top-full flex h-14 border-b border-[#DBEAFE] bg-white shadow-md ${
                      isMobile ? "pl-14 pr-3" : "px-4"
                    }`
                  : "hidden"
              } lg:static lg:flex lg:h-9 lg:w-72 lg:rounded-lg lg:border lg:border-[#E2E8F0] lg:bg-[#F8FAFC] lg:px-3 lg:shadow-none lg:transition-all lg:hover:border-[#BFDBFE] lg:focus-within:border-[#0865ed] lg:focus-within:bg-white lg:focus-within:ring-2 lg:focus-within:ring-[#0865ed]/20`}
            >
              <Search className="hidden h-4 w-4 shrink-0 lg:block" />

              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onFocus={() => {
                  if (trimmedQuery) setPanelAt(pathname);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.blur();
                    closeSearch();
                    return;
                  }

                  if (results.length === 0) return;

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setPanelAt(pathname);
                    setActiveIndex((index) => (index + 1) % results.length);
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) =>
                      index <= 0 ? results.length - 1 : index - 1,
                    );
                  }
                }}
                placeholder="Cari notulen rapat..."
                aria-label="Cari notulen rapat"
                role="combobox"
                aria-expanded={isPanelOpen}
                aria-controls="header-search-list"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
                }
                enterKeyHint="search"
                maxLength={100}
                autoComplete="off"
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#101b3a] outline-none placeholder:text-[#94A3B8] focus:border-[#0865ed] focus:bg-white focus:ring-2 focus:ring-[#0865ed]/20 lg:h-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:focus:bg-transparent lg:focus:ring-0"
              />

              <kbd className="hidden shrink-0 rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] lg:inline-block">
                Ctrl K
              </kbd>

              <button
                type="submit"
                aria-label="Cari"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0865ed] text-white transition-colors hover:bg-[#0649b8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0865ed]/40 lg:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* DAFTAR HASIL PENCARIAN */}
            {isPanelOpen && (
              <div
                className={`${
                  isSearchOpen ? "block" : "hidden"
                } absolute inset-x-0 top-[calc(100%+3.5rem)] z-[70] max-h-[60vh] overflow-y-auto border-b border-[#DBEAFE] bg-white p-1.5 shadow-lg lg:block lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[26rem] lg:rounded-2xl lg:border lg:shadow-[0_16px_40px_rgba(37,99,235,0.15)]`}
              >
                {trimmedQuery.length < MIN_QUERY_LENGTH ? (
                  <p role="status" className="px-3 py-4 text-sm text-[#64748B]">
                    Ketik minimal {MIN_QUERY_LENGTH} karakter.
                  </p>
                ) : searchStatus === "loading" ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 px-3 py-4 text-sm text-[#64748B]"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mencari…
                  </p>
                ) : searchStatus === "error" ? (
                  <p role="status" className="px-3 py-4 text-sm text-red-600">
                    Pencarian gagal. Coba lagi.
                  </p>
                ) : results.length === 0 ? (
                  <p role="status" className="px-3 py-4 text-sm text-[#64748B]">
                    Tidak ada notulen yang cocok dengan “{trimmedQuery}”.
                  </p>
                ) : (
                  <>
                    <ul
                      id="header-search-list"
                      role="listbox"
                      aria-label="Hasil pencarian"
                    >
                      {results.map((item, index) => (
                        <li
                          key={item.id}
                          id={`search-option-${index}`}
                          role="option"
                          aria-selected={index === activeIndex}
                        >
                          <Link
                            href={item.href}
                            onClick={handleSelectResult}
                            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#EFF6FF] focus:outline-none focus-visible:bg-[#EFF6FF] ${
                              index === activeIndex ? "bg-[#EFF6FF]" : ""
                            }`}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#0865ed]">
                              <FileText className="h-4 w-4" />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#101b3a]">
                                {item.title}
                              </span>
                              <span className="block truncate text-xs text-[#64748B]">
                                {item.date} · {item.status}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`${SEARCH_ROUTE}?q=${encodeURIComponent(trimmedQuery)}`}
                      onClick={handleSelectResult}
                      className="mt-1 flex items-center justify-center rounded-xl border-t border-[#EEF2F7] px-3 py-2.5 text-xs font-semibold text-[#0865ed] transition-colors hover:bg-[#EFF6FF] focus:outline-none focus-visible:bg-[#EFF6FF]"
                    >
                      Lihat semua hasil
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

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
              type="button"
              aria-label={`Menu akun ${user.name}`}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
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

            {/* DROPDOWN MENU */}
            {isProfileOpen && (
              <div
                role="menu"
                aria-label="Menu akun"
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
                  role="menuitem"
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

                {/* LOGOUT */}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    role="menuitem"
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