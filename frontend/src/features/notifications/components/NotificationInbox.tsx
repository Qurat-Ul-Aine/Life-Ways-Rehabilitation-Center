import { useCallback, useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { notificationApi } from "@/features/notifications/services/notificationApi";
import type { AppNotification, NotificationAdminStats } from "@/features/notifications/types/notification";
import {
  formatNotificationTime,
  getNotificationIcon,
  getNotificationStyle,
  isUnread,
} from "@/features/notifications/utils/notificationHelpers";
import NotificationChannelsBanner from "@/features/notifications/components/NotificationChannelsBanner";
import NotificationPreferencesPanel from "@/features/notifications/components/NotificationPreferencesPanel";
import AdminNotificationStats from "@/features/notifications/components/AdminNotificationStats";

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "APPOINTMENT", label: "Appointments" },
  { value: "PAYMENT", label: "Payments" },
  { value: "MILESTONE", label: "Milestones" },
  { value: "SYSTEM", label: "System" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "sent", label: "Sent" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const PAGE_SIZE = 20;

function deliveryBadge(status?: string | null) {
  if (!status || status === "read" || status === "unread") return null;
  const variant =
    status === "sent" ? "secondary" : status === "failed" ? "destructive" : "outline";
  return (
    <Badge variant={variant} className="text-[10px] capitalize">
      {status}
    </Badge>
  );
}

export default function NotificationInbox() {
  const { user } = useAuth();
  const {
    unreadCount: bellUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications();
  const isAdmin = user?.role === "admin" || user?.role === "staff";

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminStats, setAdminStats] = useState<NotificationAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const result = await notificationApi.getAdminHistory({
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          limit: PAGE_SIZE,
        });
        setNotifications(result.items);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      } else {
        const result = await notificationApi.getMine({
          type: typeFilter === "all" ? undefined : typeFilter,
          page,
          limit: PAGE_SIZE,
        });
        setNotifications(result.items);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, typeFilter, statusFilter, page]);

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsLoading(true);
    try {
      const stats = await notificationApi.getAdminStats();
      setAdminStats(stats);
    } catch {
      setAdminStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  const handleMarkRead = async (id: string) => {
    if (!id) return;
    try {
      await markAsRead(id);
      await load();
      refresh();
      if (isAdmin) {
        await loadStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification as read");
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    try {
      await deleteNotification(id);
      await load();
      refresh();
      if (isAdmin) {
        await loadStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (isAdmin) {
        await notificationApi.markAllAsReadAdmin();
      } else {
        await markAllAsRead();
      }
      await load();
      refresh();
      if (isAdmin) {
        await loadStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all as read");
    }
  };

  const displayUnreadCount = isAdmin
    ? (adminStats?.unread ?? notifications.filter(isUnread).length)
    : bellUnreadCount;

  return (
    <div className="space-y-4">
      <NotificationChannelsBanner />
      <NotificationPreferencesPanel />

      {isAdmin ? (
        <AdminNotificationStats
          stats={adminStats ?? { total: 0, unread: 0, sent: 0, failed: 0, pending: 0 }}
          loading={statsLoading}
        />
      ) : null}

      <Card className="rounded-2xl border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {isAdmin ? "System Notification Monitor" : "Notifications"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {displayUnreadCount > 0
                ? isAdmin
                  ? `${displayUnreadCount} unread system-wide`
                  : `${displayUnreadCount} unread`
                : "All caught up"}
              {total > 0 ? ` · ${total} total` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin ? (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarkAllRead()}
              disabled={displayUnreadCount === 0}
            >
              Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Alerts from appointments, payments, and therapy progress will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {notifications.map((n) => {
                  const Icon = getNotificationIcon(n.type);
                  const unread = isUnread(n);
                  return (
                    <div
                      key={n.id}
                      className={`flex w-full items-start gap-3 py-4 first:pt-0 last:pb-0 ${
                        unread ? "bg-primary/5 -mx-4 rounded-lg px-4" : ""
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getNotificationStyle(n.type)}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <button
                        type="button"
                        onClick={() => unread && n.id && void handleMarkRead(n.id)}
                        disabled={!unread || !n.id}
                        className="min-w-0 flex-1 text-left transition-colors hover:opacity-90 disabled:cursor-default"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm ${unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                          >
                            {n.title}
                          </p>
                          {n.type ? (
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {String(n.type).toLowerCase()}
                            </Badge>
                          ) : null}
                          {deliveryBadge(n.status)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                        {isAdmin && n.recipientName ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            To: {n.recipientName}
                            {n.recipientEmail ? ` (${n.recipientEmail})` : ""}
                          </p>
                        ) : null}
                        {n.status === "failed" && n.failureReason ? (
                          <p className="mt-0.5 text-xs text-destructive">
                            Delivery failed: {n.failureReason}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNotificationTime(n.createdAt ?? n.sentDate)}
                        </p>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {unread ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => n.id && void handleMarkRead(n.id)}
                          >
                            Mark read
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Delete notification"
                          onClick={() => n.id && void handleDelete(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
