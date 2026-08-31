import { Link } from "react-router-dom";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "../types/notification";
import {
  formatNotificationTime,
  getNotificationIcon,
  getNotificationStyle,
  isUnread,
} from "../utils/notificationHelpers";

type NotificationDropdownProps = {
  notifications: AppNotification[];
  unreadCount: number;
  loading?: boolean;
  viewAllPath: string;
  onMarkRead: (id: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  trigger: React.ReactNode;
};

export default function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  viewAllPath,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  trigger,
}: NotificationDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.preventDefault();
                void onMarkAllRead();
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-72">
          {loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((n) => {
                const Icon = getNotificationIcon(n.type);
                const unread = isUnread(n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (n.id && unread) void onMarkRead(n.id);
                    }}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                      unread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getNotificationStyle(n.type)}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatNotificationTime(n.createdAt ?? n.sentDate)}
                      </p>
                    </div>
                    {unread ? (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    {onDelete && n.id ? (
                      <button
                        type="button"
                        aria-label="Delete notification"
                        className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDelete(n.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={viewAllPath}>View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
