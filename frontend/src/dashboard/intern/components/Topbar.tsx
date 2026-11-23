import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOPBAR } from "../data/topbar";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { useNotificationBell } from "@/features/notifications/hooks/useNotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const formatToday = () =>
  new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const activeKey = location.pathname.split("/").pop() ?? "overview";
  const bell = useNotificationBell({ viewAllPath: "/intern/dashboard/notifications" });

  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-3 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {TOPBAR[activeKey] ?? "Dashboard"}
          </h1>
          <p className="text-xs text-muted-foreground">{formatToday()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell
          notifications={bell.notifications}
          unreadCount={bell.unreadCount}
          loading={bell.loading}
          viewAllPath={bell.viewAllPath}
          onMarkRead={bell.onMarkRead}
          onMarkAllRead={bell.onMarkAllRead}
          onDelete={bell.onDelete}
        />
      </div>
    </header>
  );
}
