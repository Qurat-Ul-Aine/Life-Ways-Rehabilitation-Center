import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import { AdminProfileProvider } from "@/features/admin/context/AdminProfileContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { HospitalContactDisplay } from "@/features/admin/components/HospitalContactDisplay";

type DashboardLayoutProps = {
  children: ReactNode;
};

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { hospital } = useHospitalSettings();
  const logoUrl = resolveUploadUrl(hospital.logoUrl);

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        <div
          aria-hidden={!mobileSidebarOpen}
          className={cn(
            "fixed inset-0 z-40 lg:hidden",
            mobileSidebarOpen ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <button
            aria-label="Close sidebar overlay"
            className={cn(
              "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
              mobileSidebarOpen ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setMobileSidebarOpen(false)}
            type="button"
          />
          <aside
            className={cn(
              "relative z-50 h-full w-72 border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300 ease-out",
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-end border-b border-sidebar-border p-3">
              <Button
                aria-label="Close sidebar"
                onClick={() => setMobileSidebarOpen(false)}
                size="icon"
                variant="ghost"
                className="h-11 w-11"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100%-57px)]">
              <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </aside>
        </div>

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <div className="border-b bg-background lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Button
                aria-label="Open sidebar"
                onClick={() => setMobileSidebarOpen(true)}
                size="icon"
                variant="outline"
                className="h-11 w-11"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex min-w-0 items-center gap-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-md object-contain"
                  />
                ) : null}
                <p className="truncate font-heading text-sm font-semibold text-foreground">
                  {hospital.hospitalName}
                </p>
              </div>
              <ThemeToggle className="h-11 w-11" />
            </div>
          </div>

          <TopBar />

          <main className="flex-1 p-4 transition-opacity duration-200 lg:p-6">
            {children}
          </main>

          <div className="border-t border-border bg-card p-4 lg:p-6">
            <HospitalContactDisplay layout="grid" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AdminProfileProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AdminProfileProvider>
  );
}
