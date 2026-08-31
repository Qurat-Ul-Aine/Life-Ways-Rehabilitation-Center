import { useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import { PatientDashboardProvider } from "./hooks/usePatientContext";

export default function PatientDashboard() {
  const location = useLocation();

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

  if (location.pathname === "/patient/dashboard") {
    return <Navigate to="/patient/dashboard/home" replace />;
  }

  return (
    <PatientDashboardProvider>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-muted/30 font-sans text-foreground">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background shadow-[-4px_0_24px_-12px_hsl(var(--foreground)/0.06)]">
          <Topbar />
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