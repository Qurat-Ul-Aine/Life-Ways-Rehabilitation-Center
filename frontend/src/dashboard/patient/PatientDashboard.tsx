import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import { PatientDashboardProvider } from "./hooks/usePatientContext";

export default function PatientDashboard() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/patient/dashboard") {
    return <Navigate to="/patient/dashboard/home" replace />;
  }

  return (
    <PatientDashboardProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-muted/30 font-sans text-foreground">
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
            <aside className="relative h-full w-48 max-w-[88vw]">
              <Sidebar />
            </aside>
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background shadow-[-4px_0_24px_-12px_hsl(var(--foreground)/0.06)]">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
          <main
            id="patient-dashboard-main"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-8 sm:px-6 sm:py-6 sm:pb-10 md:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PatientDashboardProvider>
  );
}