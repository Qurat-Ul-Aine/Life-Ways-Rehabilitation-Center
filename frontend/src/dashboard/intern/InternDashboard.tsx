import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { InternDashboardProvider } from "./hooks/InternDashboardContext";

export default function InternDashboard() {
  const location = useLocation();

  if (location.pathname === "/intern/dashboard") {
    return <Navigate to="/intern/dashboard/overview" replace />;
  }

  return (
    <InternDashboardProvider>
      <div className="flex h-screen overflow-hidden bg-muted/30 font-sans text-foreground">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Topbar />
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
