import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

// TODO: ganti dengan data sesi/notifikasi dari Supabase saat backend siap.
const currentUser = { name: "Administrator", role: "Super Admin" };
const unreadNotifications = 3;

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider className="flex min-h-svh flex-col">
      {/* NAVBAR: berada di bagian paling atas */}
      <AppHeader user={currentUser} unreadCount={unreadNotifications} />

      {/* DASHBOARD BODY: sidebar dan konten */}
      <div className="flex min-h-0 flex-1">
        <AppSidebar />

        <SidebarInset className="min-h-0 min-w-0">
          {/*
            pt-[6.5rem] = ruang untuk header fixed (h-16) + tombol sidebar
            mobile + jarak konten. Halaman TIDAK perlu lagi memberi pt-20.
          */}
          <main className="min-w-0 flex-1 overflow-auto p-6 pt-[6.5rem]">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}