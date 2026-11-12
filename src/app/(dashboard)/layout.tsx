import { redirect } from "next/navigation";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AccountBlocked } from "@/components/auth/account-blocked";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { getSessionState } from "@/lib/auth/session";

// TODO: ganti dengan jumlah notifikasi belum dibaca dari database.
const unreadNotifications = 3;

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Lapisan kedua setelah proxy.ts: verifikasi sesi + status akun di server.
  const session = await getSessionState();

  if (session.status === "anonymous") redirect("/login");
  if (session.status === "blocked") return <AccountBlocked reason={session.reason} />;

  const { user } = session;

  return (
    <SidebarProvider className="flex min-h-svh flex-col">
      {/* NAVBAR: berada di bagian paling atas */}
      <AppHeader
        user={{ name: user.fullName, role: user.roleLabel }}
        unreadCount={unreadNotifications}
      />

      {/* DASHBOARD BODY: sidebar dan konten */}
      <div className="flex min-h-0 flex-1">
        <AppSidebar role={user.role} />

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
