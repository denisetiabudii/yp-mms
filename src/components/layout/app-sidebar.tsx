"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ComponentType } from "react";

import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Users,
  FileText,
  Vote,
  ClipboardList,
  CheckCircle2,
  Archive,
  BarChart3,
  Building2,
  ShieldCheck,
  ScrollText,
  ChevronDown,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { AppRole } from "@/lib/auth/roles";

export type NavItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  /** Bila diisi, menu hanya tampil untuk role ini (kenyamanan UI; penegakan ada di server). */
  roles?: readonly AppRole[];
};

const ADMIN_ONLY: readonly AppRole[] = ["super_admin"];

// MENU RUANG KERJA
export const workspaceItems: NavItem[] = [
  { title: "Dasbor", url: "/dashboard", icon: LayoutDashboard, iconColor: "text-blue-600" },
  { title: "Kalender Rapat", url: "/calendar", icon: CalendarDays, iconColor: "text-amber-600" },
  { title: "Rapat", url: "/meetings", icon: CalendarCheck, iconColor: "text-blue-600" },
  { title: "Manajemen Peserta Rapat", url: "/participants", icon: Users, iconColor: "text-violet-600" },
  { title: "Notulen Rapat", url: "/minutes", icon: FileText, iconColor: "text-sky-600" },
  { title: "Keputusan Rapat", url: "/decisions", icon: Vote, iconColor: "text-purple-600" },
  { title: "Tindak Lanjut", url: "/action-items", icon: ClipboardList, iconColor: "text-orange-600" },
  { title: "Persetujuan", url: "/approvals", icon: CheckCircle2, iconColor: "text-emerald-600" },
];

// MENU ADMINISTRASI
export const managementItems: NavItem[] = [
  { title: "Arsip Rapat", url: "/archive", icon: Archive, iconColor: "text-amber-600" },
  { title: "Laporan", url: "/reports", icon: BarChart3, iconColor: "text-cyan-600" },
  { title: "Organisasi", url: "/organization", icon: Building2, iconColor: "text-violet-600", roles: ADMIN_ONLY },
  { title: "Pengguna & Hak Akses", url: "/users", icon: ShieldCheck, iconColor: "text-emerald-600", roles: ADMIN_ONLY },
  { title: "Audit Log", url: "/audit-log", icon: ScrollText, iconColor: "text-slate-600", roles: ADMIN_ONLY },
];

/**
 * Satu-satunya aturan "menu ini boleh tampil untuk role ini". Dipakai sidebar
 * dan pencarian di header, supaya keduanya tidak pernah berbeda. Hanya
 * kenyamanan UI: akses sebenarnya tetap ditegakkan di server.
 */
export function isNavItemAllowed(item: NavItem, role: AppRole) {
  return !item.roles || item.roles.includes(role);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateMobile);
    };
  }, []);

  return isMobile;
}

export function AppSidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // State accordion untuk navigasi mobile
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);

  const visible = (items: NavItem[]) =>
    items.filter((item) => isNavItemAllowed(item, role));

  const workspace = visible(workspaceItems);
  const management = visible(managementItems);

  // Render item navigasi
  const renderMenuItems = (items: NavItem[]) =>
    items.map((item) => {
      // Menyala juga di halaman turunan, mis. /meetings/new atau /minutes/mtg-001
      const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            render={<Link href={item.url} />}
            isActive={isActive}
            tooltip={item.title}
            className="
              rounded-lg
              text-slate-700
              transition-colors
              hover:bg-[#EAF0FB]
              hover:text-slate-900
              focus-visible:ring-2
              focus-visible:ring-[#2563EB]/40
              data-[active=true]:bg-[#DFE9FB]
              data-[active=true]:font-semibold
              data-[active=true]:text-[#1D4ED8]
              data-[active=true]:shadow-[inset_3px_0_0_#2563EB]
            "
          >
            <item.icon className={`${item.iconColor} size-4 shrink-0 transition-colors`} />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const groupLabelClass =
    "text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-data-[collapsible=icon]:hidden";

  const accordionButtonClass =
    "rounded-lg font-semibold text-slate-800 hover:bg-[#EAF0FB] focus-visible:ring-2 focus-visible:ring-[#2563EB]/40";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#E1E8F3] bg-[#F6F8FC] text-slate-700"
    >
      <SidebarContent>
        {/* RUANG KERJA */}
        {workspace.length > 0 && (
          <SidebarGroup>
            {isMobile ? (
              <>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setWorkspaceOpen((previous) => !previous)}
                      aria-expanded={workspaceOpen}
                      className={accordionButtonClass}
                    >
                      <LayoutDashboard />
                      <span>Ruang Kerja</span>
                      <ChevronDown
                        className={`ml-auto text-slate-500 transition-transform ${workspaceOpen ? "rotate-180" : ""}`}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>

                {workspaceOpen && (
                  <SidebarMenu className="mt-1 pl-3">{renderMenuItems(workspace)}</SidebarMenu>
                )}
              </>
            ) : (
              <>
                <SidebarGroupLabel className={groupLabelClass}>
                  Ruang Kerja
                </SidebarGroupLabel>

                <SidebarMenu>{renderMenuItems(workspace)}</SidebarMenu>
              </>
            )}
          </SidebarGroup>
        )}

        {/* ADMINISTRASI */}
        {management.length > 0 && (
          <SidebarGroup>
            {isMobile ? (
              <>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setManagementOpen((previous) => !previous)}
                      aria-expanded={managementOpen}
                      className={accordionButtonClass}
                    >
                      <Building2 />
                      <span>Administrasi</span>
                      <ChevronDown
                        className={`ml-auto text-slate-500 transition-transform ${managementOpen ? "rotate-180" : ""}`}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>

                {managementOpen && (
                  <SidebarMenu className="mt-1 pl-3">{renderMenuItems(management)}</SidebarMenu>
                )}
              </>
            ) : (
              <>
                <SidebarGroupLabel className={groupLabelClass}>
                  Administrasi
                </SidebarGroupLabel>

                <SidebarMenu>{renderMenuItems(management)}</SidebarMenu>
              </>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* SIDEBAR FOOTER */}
      <SidebarFooter className="border-t border-[#E1E8F3] p-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-slate-500">YP-MMS · Yuk Peduli Grup</p>
      </SidebarFooter>
    </Sidebar>
  );
}