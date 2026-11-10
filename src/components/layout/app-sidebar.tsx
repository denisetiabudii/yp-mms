"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  Briefcase,
  Settings,
  ChevronDown,
  type LucideIcon,
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
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  iconColor: string;
};

// MENU RUANG KERJA
const workspaceItems: NavItem[] = [
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
  { title: "Rapat", url: "/meetings", icon: CalendarCheck, iconColor: "text-blue-600" },
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
const managementItems: NavItem[] = [
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

/** Aktif untuk halaman itu sendiri dan turunannya, mis. /minutes/12 */
function isPathActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

function MenuItems({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return items.map((item) => {
    const isActive = isPathActive(pathname, item.url);

    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          render={<Link href={item.url} />}
          isActive={isActive}
          tooltip={item.title}
          aria-current={isActive ? "page" : undefined}
          className="
            text-slate-700
            transition-colors
            hover:bg-[#EFF6FF]
            hover:text-[#0865ed]
            data-[active=true]:bg-[#E3EEFF]
            data-[active=true]:font-semibold
            data-[active=true]:text-[#0865ed]
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
}

/**
 * Satu grup menu. Di desktop tampil sebagai label + daftar menu,
 * di mobile tampil sebagai accordion.
 */
function NavGroup({
  label,
  icon: Icon,
  items,
  pathname,
  isMobile,
  open,
  onToggle,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  pathname: string;
  isMobile: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <SidebarGroup>
      {isMobile ? (
        <>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onToggle}
                aria-expanded={open}
                className="font-semibold text-[#101b3a]"
              >
                <Icon />
                <span>{label}</span>
                <ChevronDown
                  className={`ml-auto transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {open && (
            <SidebarMenu className="mt-1 pl-3">
              <MenuItems items={items} pathname={pathname} />
            </SidebarMenu>
          )}
        </>
      ) : (
        <>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
            {label}
          </SidebarGroupLabel>

          <SidebarMenu>
            <MenuItems items={items} pathname={pathname} />
          </SidebarMenu>
        </>
      )}
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Accordion mobile: null = ikuti halaman aktif (grup yang berisi halaman
  // yang sedang dibuka otomatis terbuka), true/false = pilihan pengguna.
  const [workspaceToggle, setWorkspaceToggle] = useState<boolean | null>(null);
  const [managementToggle, setManagementToggle] = useState<boolean | null>(
    null,
  );

  const workspaceOpen =
    workspaceToggle ??
    workspaceItems.some((item) => isPathActive(pathname, item.url));

  const managementOpen =
    managementToggle ??
    managementItems.some((item) => isPathActive(pathname, item.url));

  return (
    <Sidebar collapsible="icon" className="bg-[#F8FAFC] text-slate-700">
      <SidebarContent>
        <NavGroup
          label="Ruang Kerja"
          icon={Briefcase}
          items={workspaceItems}
          pathname={pathname}
          isMobile={isMobile}
          open={workspaceOpen}
          onToggle={() => setWorkspaceToggle(!workspaceOpen)}
        />

        <NavGroup
          label="Administrasi"
          icon={Settings}
          items={managementItems}
          pathname={pathname}
          isMobile={isMobile}
          open={managementOpen}
          onToggle={() => setManagementToggle(!managementOpen)}
        />
      </SidebarContent>

      {/* SIDEBAR FOOTER */}
      <SidebarFooter className="border-t p-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs font-medium text-slate-500">
          YP-MMS · Yuk Peduli Grup
        </p>
        <p className="text-[11px] text-slate-400">
          Connect · Discuss · Decide · Execute
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}