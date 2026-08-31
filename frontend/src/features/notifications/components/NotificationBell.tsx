import { Bell } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import type { AppNotification } from "../types/notification";

type NotificationBellProps = {
  notifications: AppNotification[];
  unreadCount: number;
  loading?: boolean;
  viewAllPath: string;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete?: (id: string) => void;
  className?: string;
};

export default function NotificationBell({
  notifications,
  unreadCount,
  loading,
  viewAllPath,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  className = "",
}: NotificationBellProps) {
  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
      viewAllPath={viewAllPath}
      onMarkRead={onMarkRead}
      onMarkAllRead={onMarkAllRead}
      onDelete={onDelete}
      trigger={
        <button
          type="button"
          aria-label="Notifications"
          className={`relative rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      }
    />
  );
}
