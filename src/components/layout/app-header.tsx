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
import {
  isNavItemAllowed,
  managementItems,
  workspaceItems,
  type NavItem,
} from "@/components/layout/app-sidebar";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { signOutAction } from "@/lib/auth/actions";
import type { AppRole } from "@/lib/auth/roles";

/**
 * Halaman daftar Notulen Rapat (sama dengan menu sidebar). Dipakai oleh
 * tautan "Lihat semua hasil" pada hasil pencarian notulen.
 */
const SEARCH_ROUTE = "/minutes";

/**
 * Pintasan yang ditawarkan saat kolom cari masih kosong. Hanya berisi URL:
 * judul, ikon, dan aturan akses tetap diambil dari sidebar, jadi pintasan
 * yang tidak boleh diakses role pengguna otomatis tidak muncul.
 */
const RECOMMENDED_URLS = [
  "/minutes",
  "/calendar",
  "/action-items",
  "/approvals",
  "/meetings",
] as const;

const MIN_QUERY_LENGTH = 2;
const MAX_MENU_RESULTS = 6;
const SEARCH_DEBOUNCE_MS = 300;

/** Satu hasil pencarian notulen. `date` dan `status` sudah berupa teks siap tampil. */
export type SearchResult = {
  id: string;
  title: string;
  date: string;
  status: string;
  href: string;
};

type SearchStatus = "idle" | "loading" | "done" | "error";

/** Satu baris di daftar hasil: menu aplikasi atau notulen. */
type SearchOption = {
  key: string;
  title: string;
  meta: string;
  href: string;
  icon: NavItem["icon"];
  iconColor: string;
};

/* -------------------------------------------------------------------------- */
/* Pencarian menu: sumber yang sama dengan sidebar                            */
/* -------------------------------------------------------------------------- */

const NAV_ENTRIES = [
  ...workspaceItems.map((item) => ({ item, group: "Ruang Kerja" })),
  ...managementItems.map((item) => ({ item, group: "Administrasi" })),
];

function toMenuOption({ item, group }: (typeof NAV_ENTRIES)[number]): SearchOption {
  return {
    key: `menu:${item.url}`,
    title: item.title,
    meta: group,
    href: item.url,
    icon: item.icon,
    iconColor: item.iconColor,
  };
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Mencari menu aplikasi yang cocok dengan kata kunci.
 *
 * Daftar menu dan aturan aksesnya sama persis dengan sidebar
 * (isNavItemAllowed). Menu yang tidak boleh diakses role pengguna tidak akan
 * pernah muncul, bahkan sebagai "tidak diizinkan", supaya keberadaannya tidak
 * bocor. Tanpa `role`, tidak ada menu yang ditampilkan (gagal tertutup).
 *
 * Ini hanya kenyamanan UI. Penegakan akses tetap di server (middleware, route
 * guard, RLS), jadi membuka URL secara manual pun tetap diperiksa di sana.
 */
function findMenuOptions(query: string, role?: AppRole): SearchOption[] {
  if (!role) return [];

  const q = normalizeText(query);

  return NAV_ENTRIES.filter(
    ({ item }) =>
      isNavItemAllowed(item, role) &&
      (normalizeText(item.title).includes(q) || item.url.slice(1).includes(q)),
  )
    .slice(0, MAX_MENU_RESULTS)
    .map(toMenuOption);
}

/**
 * Pintasan untuk kolom cari yang kosong. Disaring dengan aturan akses yang
 * sama seperti pencarian menu, dan juga gagal tertutup tanpa `role`.
 */
function findRecommendedOptions(role?: AppRole): SearchOption[] {
  if (!role) return [];

  return RECOMMENDED_URLS.flatMap((url) => {
    const entry = NAV_ENTRIES.find(({ item }) => item.url === url);

    return entry && isNavItemAllowed(entry.item, role)
      ? [toMenuOption(entry)]
      : [];
  });
}

type AppHeaderProps = {
  /**
   * Role pengguna, sama dengan yang diberikan ke AppSidebar. Menentukan menu
   * apa yang boleh muncul di pencarian. Berasal dari sesi di server, bukan
   * dari input pengguna.
   */
  role?: AppRole;
  /**
   * Fungsi pencarian notulen (server action), opsional. Server action itu
   * wajib memeriksa hak akses sendiri (sesi, role, RLS) dan tidak boleh
   * menerima role dari klien. Tanpa ini, pencarian hanya mencakup menu.
   */
  onSearch?: (query: string) => Promise<SearchResult[]>;
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
  role,
  onSearch,
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
  // header. Seperti dropdown profil, status terbukanya terikat ke pathname.
  const [searchOpenedAt, setSearchOpenedAt] = useState<string | null>(null);
  const isSearchOpen = searchOpenedAt === pathname;

  const toggleSearch = () =>
    setSearchOpenedAt((current) => (current === pathname ? null : pathname));

  // Hasil pencarian notulen (jika onSearch ada). Semua setState dilakukan di
  // event handler dan callback, requestId mencegah hasil lama menimpa yang baru.
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelAt, setPanelAt] = useState<string | null>(null);
  const isPanelOpen = panelAt === pathname;

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const isQueryLongEnough = trimmedQuery.length >= MIN_QUERY_LENGTH;

  // Daftar baris yang bisa dipilih: menu lebih dulu, lalu notulen.
  const menuOptions = isQueryLongEnough
    ? findMenuOptions(trimmedQuery, role)
    : [];
  const minutesOptions: SearchOption[] = results.map((item) => ({
    key: `minutes:${item.id}`,
    title: item.title,
    meta: `${item.date} · ${item.status}`,
    href: item.href,
    icon: FileText,
    iconColor: "text-sky-600",
  }));
  const recommendedOptions = trimmedQuery ? [] : findRecommendedOptions(role);
  const options = trimmedQuery
    ? [...menuOptions, ...minutesOptions]
    : recommendedOptions;

  const initials = getInitials(user.name);

  const isNotificationsActive = pathname.startsWith("/notifications");
  const isAccountActive = pathname.startsWith("/account");

  // Bantu menemukan salah pasang: tanpa `role`, pencarian menu sengaja kosong.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !role) {
      console.warn(
        "[AppHeader] Prop `role` belum diberikan, jadi pencarian menu dan pintasan tidak menampilkan apa pun. Teruskan role yang sama dengan AppSidebar.",
      );
    }
  }, [role]);

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

  // Ctrl/Cmd + K: fokus ke kolom cari (desktop) atau buka bar cari (mobile)
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

  function handleSelectOption() {
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
      setPanelAt(pathname);
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

    if (!onSearch) return;

    const requestId = requestIdRef.current;
    setSearchStatus("loading");

    debounceRef.current = setTimeout(async () => {
      try {
        const found = await onSearch(trimmed);

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

    // Berpindah halaman hanya ke hasil yang benar-benar ada dan boleh diakses.
    // Mengetik asal-asalan tidak membawa pengguna ke mana pun. Saat kolom
    // kosong, Enter hanya membuka pintasan yang sudah dipilih dengan panah.
    const target = trimmedQuery
      ? (options[activeIndex] ?? options[0])
      : options[activeIndex];

    if (!target) {
      if (!trimmedQuery) searchRef.current?.focus();
      return;
    }

    router.push(target.href);
    searchRef.current?.blur();
    handleSelectOption();
  }

  const renderOption = (option: SearchOption, index: number) => {
    const Icon = option.icon;

    return (
      <li
        key={option.key}
        id={`search-option-${index}`}
        role="option"
        aria-selected={index === activeIndex}
      >
        <Link
          href={option.href}
          onClick={handleSelectOption}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#EEF3FB] focus:outline-none focus-visible:bg-[#EEF3FB] ${
            index === activeIndex ? "bg-[#EEF3FB]" : ""
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FB]">
            <Icon className={`h-4 w-4 ${option.iconColor}`} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#1E293B]">
              {option.title}
            </span>
            <span className="block truncate text-xs text-[#64748B]">
              {option.meta}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  const sectionLabelClass =
    "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]";

  const showNoResults =
    isQueryLongEnough &&
    menuOptions.length === 0 &&
    (!onSearch || (searchStatus === "done" && results.length === 0));

  return (
    <>
      {/* HEADER UTAMA */}
      <header className="fixed inset-x-0 top-0 z-[60] flex h-16 w-full items-center justify-between bg-white/90 px-3 shadow-sm shadow-slate-900/5 backdrop-blur-md sm:px-4">
        {/* Garis aksen bawah, senada dengan gradien halaman login */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#60A5FA] opacity-80"
        />

        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* SIDEBAR TOGGLE - DESKTOP */}
          {!isMobile && (
            <SidebarTrigger className="rounded-lg text-slate-600 transition-colors hover:bg-[#EEF3FB] hover:text-[#2563EB]" />
          )}

          {/* BRAND: logo + identitas aplikasi, mengarah ke dashboard */}
          <Link
            href="/dashboard"
            aria-label="Ke halaman dashboard YP-MMS"
            className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-1 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 sm:gap-3"
          >
            <BrandLogo className="h-9 sm:h-10" />

            <Separator
              orientation="vertical"
              className="h-8 bg-[#E1E8F3]"
            />

            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-none tracking-wide text-[#1E293B]">
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
            aria-label={isSearchOpen ? "Tutup pencarian" : "Cari menu atau notulen"}
            aria-expanded={isSearchOpen}
            aria-controls="header-search"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] transition-colors hover:bg-[#EEF3FB] hover:text-[#2563EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 sm:h-10 sm:w-10 lg:hidden"
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
                  ? `absolute inset-x-0 top-full flex h-14 border-b border-[#E1E8F3] bg-white shadow-md duration-150 animate-in fade-in-0 slide-in-from-top-2 lg:animate-none ${
                      isMobile ? "pl-14 pr-3" : "px-4"
                    }`
                  : "hidden"
              } lg:static lg:flex lg:h-10 lg:w-72 lg:rounded-lg lg:border lg:border-[#E1E8F3] lg:bg-[#F3F6FB] lg:px-3 lg:shadow-none lg:transition-all lg:hover:border-[#CBD9EE] lg:focus-within:border-[#3B82F6] lg:focus-within:bg-white lg:focus-within:ring-2 lg:focus-within:ring-[#3B82F6]/20`}
            >
              <Search className="hidden h-4 w-4 shrink-0 lg:block" />

              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onFocus={() => setPanelAt(pathname)}
                onClick={() => setPanelAt(pathname)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.blur();
                    closeSearch();
                    return;
                  }

                  if (options.length === 0) return;

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setPanelAt(pathname);
                    setActiveIndex((index) => (index + 1) % options.length);
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) =>
                      index <= 0 ? options.length - 1 : index - 1,
                    );
                  }
                }}
                placeholder="Cari menu atau notulen..."
                aria-label="Cari menu atau notulen"
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
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#E1E8F3] bg-[#F3F6FB] px-3 text-sm text-[#1E293B] outline-none placeholder:text-[#7C8AA0] focus:border-[#3B82F6] focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 lg:h-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:focus:bg-transparent lg:focus:ring-0"
              />

              <kbd className="hidden shrink-0 rounded-md border border-[#DDE5F1] bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-[#64748B] lg:inline-block">
                Ctrl K
              </kbd>

              <button
                type="submit"
                aria-label="Cari"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white transition-colors hover:bg-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 lg:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* DAFTAR HASIL PENCARIAN */}
            {isPanelOpen && (trimmedQuery || recommendedOptions.length > 0) && (
              <div
                className={`${
                  isSearchOpen ? "block" : "hidden"
                } absolute inset-x-0 top-[calc(100%+3.5rem)] z-[70] max-h-[60vh] overflow-y-auto border-b border-[#E1E8F3] bg-white p-1.5 shadow-lg duration-150 animate-in fade-in-0 slide-in-from-top-1 lg:block lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[26rem] lg:rounded-2xl lg:border lg:shadow-[0_12px_32px_rgba(30,64,175,0.10)]`}
              >
                {!trimmedQuery ? (
                  <ul
                    id="header-search-list"
                    role="listbox"
                    aria-label="Pintasan"
                  >
                    <li role="presentation" className={sectionLabelClass}>
                      Pintasan
                    </li>
                    {recommendedOptions.map((option, index) =>
                      renderOption(option, index),
                    )}
                  </ul>
                ) : !isQueryLongEnough ? (
                  <p role="status" className="px-3 py-4 text-sm text-[#64748B]">
                    Ketik minimal {MIN_QUERY_LENGTH} karakter.
                  </p>
                ) : (
                  <ul
                    id="header-search-list"
                    role="listbox"
                    aria-label="Hasil pencarian"
                  >
                    {menuOptions.length > 0 && (
                      <>
                        <li role="presentation" className={sectionLabelClass}>
                          Menu
                        </li>
                        {menuOptions.map((option, index) =>
                          renderOption(option, index),
                        )}
                      </>
                    )}

                    {onSearch && (
                      <>
                        {(minutesOptions.length > 0 ||
                          searchStatus === "loading" ||
                          searchStatus === "error") && (
                          <li role="presentation" className={sectionLabelClass}>
                            Notulen
                          </li>
                        )}

                        {searchStatus === "loading" && (
                          <li
                            role="presentation"
                            className="flex items-center gap-2 px-3 py-3 text-sm text-[#64748B]"
                          >
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mencari notulen…
                          </li>
                        )}

                        {searchStatus === "error" && (
                          <li
                            role="presentation"
                            className="px-3 py-3 text-sm text-red-700"
                          >
                            Pencarian notulen gagal. Coba lagi.
                          </li>
                        )}

                        {searchStatus !== "loading" &&
                          minutesOptions.map((option, index) =>
                            renderOption(option, menuOptions.length + index),
                          )}
                      </>
                    )}

                    {showNoResults && (
                      <li
                        role="presentation"
                        className="px-3 py-4 text-sm text-[#64748B]"
                      >
                        Tidak ada hasil untuk “{trimmedQuery}”.
                      </li>
                    )}

                    {onSearch &&
                      searchStatus === "done" &&
                      minutesOptions.length > 0 && (
                        <li role="presentation">
                          <Link
                            href={`${SEARCH_ROUTE}?q=${encodeURIComponent(trimmedQuery)}`}
                            onClick={handleSelectOption}
                            className="mt-1 flex items-center justify-center rounded-xl border-t border-[#EEF2F7] px-3 py-2.5 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-[#EEF3FB] focus:outline-none focus-visible:bg-[#EEF3FB]"
                          >
                            Lihat semua hasil notulen
                          </Link>
                        </li>
                      )}
                  </ul>
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
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:bg-[#FFF8E1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/50 sm:h-10 sm:w-10 ${
              isNotificationsActive ? "bg-[#FFF5D6]" : "bg-transparent"
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

          {/* PEMISAH */}
          <span
            aria-hidden="true"
            className="mx-0.5 hidden h-6 w-px bg-[#E1E8F3] sm:block"
          />

          {/* PROFILE DROPDOWN */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              aria-label={`Menu akun ${user.name}`}
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              onClick={toggleProfile}
              className={`flex items-center gap-2 rounded-xl border px-1.5 py-1.5 transition-all hover:border-[#DCE7F8] hover:bg-[#EEF3FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 sm:px-2 ${
                isProfileOpen
                  ? "border-[#DCE7F8] bg-[#EEF3FB]"
                  : "border-transparent"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-xs font-bold text-white shadow-sm shadow-blue-600/15 ring-2 ring-[#DCE7F8] sm:h-9 sm:w-9 sm:text-sm">
                {initials}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[140px] truncate text-xs font-semibold leading-none text-[#1E293B]">
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
                className="absolute right-0 top-full z-[70] mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-[#E1E8F3] bg-white p-1.5 shadow-[0_12px_32px_rgba(30,64,175,0.10)] duration-150 animate-in fade-in-0 zoom-in-95"
              >
                {/* PROFILE INFO */}
                <div className="mb-1 flex items-center gap-3 rounded-xl bg-[#F4F7FC] px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-sm font-bold text-white">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1E293B]">
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
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#EEF3FB] hover:text-[#1D4ED8] focus:outline-none focus-visible:bg-[#EEF3FB] ${
                    isAccountActive
                      ? "bg-[#EEF3FB] font-semibold text-[#1D4ED8]"
                      : "text-[#475569]"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                  Akun saya
                </Link>

                <Separator className="my-1 bg-[#E1E8F3]" />

                {/* LOGOUT */}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus-visible:bg-red-50"
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
          <div className="flex size-10 items-center justify-center rounded-br-lg border-b border-r border-[#E1E8F3] bg-white shadow-sm">
            <SidebarTrigger className="!size-9 rounded-md text-slate-600 hover:bg-[#EEF3FB] hover:text-[#2563EB]" />
          </div>
        </div>
      )}
    </>
  );
}