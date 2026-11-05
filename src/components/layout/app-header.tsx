"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search, UserRound, Settings, LogOut } from "lucide-react";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppHeader() {
  const { isMobile } = useSidebar();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      {/* HEADER UTAMA */}
      <header className="fixed inset-x-0 top-0 z-[60] flex h-16 w-full items-center justify-between border-b border-[#DBEAFE] bg-white/95 px-3 shadow-sm backdrop-blur-md sm:px-4">
        {/* LEFT SECTION */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* SIDEBAR TOGGLE - DESKTOP */}
          {!isMobile && (
            <SidebarTrigger className="rounded-lg text-[#1E3A8A] transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]" />
          )}

          {/* BRAND LOGO */}
          <Image
            src="/yuk-peduli-logo.png"
            alt="Logo Yuk Peduli"
            width={120}
            height={61}
            priority
            className="h-12 w-auto shrink-0 object-contain sm:h-15"
          />

          {/* SEPARATOR */}
          <Separator orientation="vertical" className="h-8 bg-[#DBEAFE]" />

          {/* APPLICATION IDENTITY */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-wide text-[#1E3A8A]">
              YP-MMS
            </h1>

            <p className="hidden text-xs text-[#64748B] sm:block">
              Sistem Manajemen Rapat
            </p>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* SEARCH */}
          <button
            type="button"
            className="hidden h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#64748B] transition-all hover:border-[#BFDBFE] hover:bg-[#EFF6FF] md:flex"
          >
            <Search className="h-4 w-4" />

            <span>Cari sesuatu...</span>

            <kbd className="ml-3 rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px]">
              Ctrl K
            </kbd>
          </button>

          {/* NOTIFICATION */}
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border-0 bg-transparent transition-all hover:bg-[#FFFBEB] sm:h-10 sm:w-10"
          >
            {/* GOLD BELL */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
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

            {/* NOTIFICATION BADGE */}
            <span className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#EF4444]" />
          </Link>

          {/* PROFILE DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              aria-label="Menu akun Administrator"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 transition-all hover:border-[#DBEAFE] hover:bg-[#EFF6FF] sm:px-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E40AF] text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-sm">
                AD
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-[#1E293B]">
                  Administrator
                </p>

                <p className="text-[11px] text-[#64748B]">
                  Super Admin
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
              <div className="absolute right-0 top-full z-[70] mt-2 w-56 overflow-hidden rounded-xl border border-[#DBEAFE] bg-white p-1.5 shadow-lg">
                {/* PROFILE INFO */}
                <div className="border-b border-[#E2E8F0] px-3 py-2.5">
                  <p className="text-sm font-semibold text-[#1E293B]">
                    Administrator
                  </p>

                  <p className="text-xs text-[#64748B]">
                    Super Admin
                  </p>
                </div>

                {/* ACCOUNT */}
                <Link
                  href="/account"
                  onClick={() => setIsProfileOpen(false)}
                  className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[#475569] transition-colors hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                >
                  <UserRound className="h-4 w-4" />
                  Akun Saya
                </Link>

                

                {/* LOGOUT */}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR TOGGLE AREA */}
      {isMobile && (
        <div className="fixed left-0 top-16 z-[100] flex h-10 items-start">
          <div className="flex size-10 items-center justify-center rounded-br-lg border-b border-r border-[#DBEAFE] bg-white shadow-sm">
            <SidebarTrigger className="!size-9 rounded-md text-[#1E3A8A] hover:bg-[#EFF6FF] hover:text-[#2563EB]" />
          </div>
        </div>
      )}
    </>
  );
}