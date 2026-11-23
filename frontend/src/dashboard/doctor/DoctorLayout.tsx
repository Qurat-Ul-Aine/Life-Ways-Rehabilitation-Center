import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Breadcrumb from "./components/Breadcrumb";
import HeroSection from "./components/HeroSection";
import RightSidebar from "./components/RightSidebar";
import BottomNav from "./components/BottomNav";
import MobileFab from "./components/MobileFab";
import DashboardFooter from "./components/DashboardFooter";
import PageTransition from "./components/PageTransition";
import { useDoctorDashboard } from "./hooks/DoctorDashboardContext";
import { MOBILE_BOTTOM_NAV } from "./data/nav";
import { resolvePanelMeta } from "./data/panelMeta";

export default function DoctorLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, loading, refetch } = useDoctorDashboard();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const touchStartX = useRef<number | null>(null);

  const panel = resolvePanelMeta(pathname);
  const isDashboardHome = pathname === "/doctor/dashboard";
  const hideHero =
    pathname === "/doctor/ai-matches"
    || (pathname.startsWith("/doctor/therapy/") && pathname.length > "/doctor/therapy/".length);

  useEffect(() => {
    if (!loading && data) {
      setLastSync(new Date());
    }
  }, [loading, data]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const swipeToAdjacentPanel = useCallback(
    (direction: "left" | "right") => {
      const paths = MOBILE_BOTTOM_NAV.map((p) => p.path);
      const idx = paths.indexOf(panel.path);
      if (idx < 0) return;
      const next =
        direction === "left"
          ? paths[Math.min(idx + 1, paths.length - 1)]
          : paths[Math.max(idx - 1, 0)];
      if (next !== panel.path) navigate(next);
    },
    [navigate, panel.path],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 72) return;
    if (delta < 0) swipeToAdjacentPanel("left");
    else swipeToAdjacentPanel("right");
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-muted/30 font-sans text-foreground">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Topbar
          onMenuClick={() => setMobileNavOpen(true)}
          onWidgetsToggle={() => setRightCollapsed((v) => !v)}
          widgetsCollapsed={rightCollapsed}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
              <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
                <Breadcrumb className="mb-4" />

                {!isDashboardHome && !hideHero && (
                  <HeroSection
                    title={panel.getTitle(data, loading)}
                    subtitle={panel.getSubtitle(data, loading)}
                    stats={panel.getStats(data, loading)}
                    gradient={panel.gradient}
                    loading={loading}
                    primaryAction={panel.primaryAction}
                  />
                )}

                <div className={isDashboardHome || hideHero ? "mt-0" : "mt-5 sm:mt-6"}>
                  <PageTransition />
                </div>

                <DashboardFooter
                  lastSync={lastSync}
                  syncing={loading}
                  onRefresh={handleRefresh}
                />
              </div>
            </main>
          </div>

          <RightSidebar collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)} />
        </div>
      </div>

      <BottomNav />
      <MobileFab action={panel.primaryAction} />
    </div>
  );
}
