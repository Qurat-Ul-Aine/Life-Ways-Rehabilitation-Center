import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { InternDashboardProvider } from "./hooks/InternDashboardContext";
import { Button } from "@/components/ui/button";

export default function InternDashboard() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/intern/dashboard") {
    return <Navigate to="/intern/dashboard/overview" replace />;
  }

  return (
    <InternDashboardProvider>
      <div className="flex h-dvh overflow-hidden bg-muted/30 font-sans text-foreground">
        <aside className="hidden h-full shrink-0 lg:block">
          <Sidebar />
        </aside>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-overlay backdrop-blur-sm"
              aria-label="Close navigation menu"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="relative h-full w-[min(13rem,88vw)]">
              <Sidebar />
            </aside>
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 md:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </InternDashboardProvider>
  );
}
