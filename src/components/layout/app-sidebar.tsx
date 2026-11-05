
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileText,
  Vote,
  ClipboardList,
  CheckCircle2,
  Archive,
  BarChart3,
  Building2,
  ShieldCheck,
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

// MENU RUANG KERJA
const workspaceItems = [
  {
    title: "Dasbor",
    url: "/dashboard",
    icon: LayoutDashboard,
    iconColor: "text-blue-600",
  },
  {
    title: "Kalender Rapat",
    url: "/calendar",
    icon: CalendarDays,
    iconColor: "text-amber-600",
  },
  {
    title: "Manajemen Peserta Rapat",
    url: "/participants",
    icon: Users,
    iconColor: "text-violet-600",
  },
  {
    title: "Notulen Rapat",
    url: "/minutes",
    icon: FileText,
    iconColor: "text-sky-600",
  },
  {
    title: "Keputusan Rapat",
    url: "/decisions",
    icon: Vote,
    iconColor: "text-purple-600",
  },
  {
    title: "Tindak Lanjut",
    url: "/action-items",
    icon: ClipboardList,
    iconColor: "text-orange-600",
  },
  {
    title: "Persetujuan",
    url: "/approvals",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
];

// MENU ADMINISTRASI
const managementItems = [
  {
    title: "Arsip Rapat",
    url: "/archive",
    icon: Archive,
    iconColor: "text-amber-600",
  },
  {
    title: "Laporan",
    url: "/reports",
    icon: BarChart3,
    iconColor: "text-cyan-600",
  },
  {
    title: "Organisasi",
    url: "/organization",
    icon: Building2,
    iconColor: "text-violet-600",
  },
  {
    title: "Pengguna & Hak Akses",
    url: "/users",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
  },
];

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

export function AppSidebar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // State accordion untuk navigasi mobile
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);

  // Render item navigasi
  const renderMenuItems = (items: typeof workspaceItems) =>
    items.map((item) => {
      const isActive = pathname === item.url;

      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            render={<Link href={item.url} />}
            isActive={isActive}
            tooltip={item.title}
            className="
              text-slate-700
              transition-colors
              hover:bg-blue-50
              hover:text-blue-700
              data-[active=true]:bg-blue-100
              data-[active=true]:text-blue-700
              data-[active=true]:font-semibold
            "
          >
            <item.icon
              className={`${item.iconColor} size-4 shrink-0 transition-colors`}
            />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="bg-[#F8FAFC] text-slate-700">
      <SidebarContent>
        {/* RUANG KERJA */}
        <SidebarGroup>
          {isMobile ? (
            <>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() =>
                      setWorkspaceOpen((previous) => !previous)
                    }
                    className="font-semibold"
                  >
                    <LayoutDashboard />
                    <span>Ruang Kerja</span>
                    <ChevronDown
                      className={`ml-auto transition-transform ${
                        workspaceOpen ? "rotate-180" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {workspaceOpen && (
                <SidebarMenu className="mt-1 pl-3">
                  {renderMenuItems(workspaceItems)}
                </SidebarMenu>
              )}
            </>
          ) : (
            <>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
                Ruang Kerja
              </SidebarGroupLabel>

              <SidebarMenu>
                {renderMenuItems(workspaceItems)}
              </SidebarMenu>
            </>
          )}
        </SidebarGroup>

        {/* ADMINISTRASI */}
        <SidebarGroup>
          {isMobile ? (
            <>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() =>
                      setManagementOpen((previous) => !previous)
                    }
                    className="font-semibold"
                  >
                    <Building2 />
                    <span>Administrasi</span>
                    <ChevronDown
                      className={`ml-auto transition-transform ${
                        managementOpen ? "rotate-180" : ""
                      }`}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              {managementOpen && (
                <SidebarMenu className="mt-1 pl-3">
                  {renderMenuItems(managementItems)}
                </SidebarMenu>
              )}
            </>
          ) : (
            <>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                Administrasi
              </SidebarGroupLabel>

              <SidebarMenu>
                {renderMenuItems(managementItems)}
              </SidebarMenu>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* SIDEBAR FOOTER */}
      <SidebarFooter className="border-t p-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-muted-foreground">
          YP-MMS · Yuk Peduli Grup
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
