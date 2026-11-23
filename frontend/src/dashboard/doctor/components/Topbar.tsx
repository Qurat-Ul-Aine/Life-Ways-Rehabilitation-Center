import { useLocation } from "react-router-dom";
import { Menu, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { useNotificationBell } from "@/features/notifications/hooks/useNotificationBell";
import { getTopbarTitle } from "../data/topbar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const formatToday = () =>
  new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

type Props = {
  onMenuClick?: () => void;
  onWidgetsToggle?: () => void;
  widgetsCollapsed?: boolean;
};

export default function Topbar({ onMenuClick, onWidgetsToggle }: Props) {
  const { pathname } = useLocation();
  const title = getTopbarTitle(pathname);
  const bell = useNotificationBell({ viewAllPath: "/doctor/notifications" });

  return (
    <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground lg:hidden">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">{formatToday()}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden h-8 w-8 xl:inline-flex"
          onClick={onWidgetsToggle}
          aria-label="Toggle widgets panel"
        >
          <PanelRight className="h-4 w-4" />
        </Button>

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
