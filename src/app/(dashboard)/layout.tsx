import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider className="flex min-h-svh flex-col">
      {/* NAVBAR: berada di bagian paling atas */}
      <AppHeader />

      {/* DASHBOARD BODY: sidebar dan konten */}
      <div className="flex min-h-0 flex-1">
        <AppSidebar />

        <SidebarInset className="min-h-0 min-w-0">
          <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
