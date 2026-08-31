import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { notificationApi } from "@/features/notifications/services/notificationApi";
import type { AppNotification } from "@/features/notifications/types/notification";

type UseNotificationBellOptions = {
  viewAllPath: string;
};

export function useNotificationBell({ viewAllPath }: UseNotificationBellOptions) {
  const { unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh } = useNotifications();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const items = await notificationApi.getRecent(8);
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent, unreadCount]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
      await loadRecent();
      await refresh();
    },
    [loadRecent, markAsRead, refresh],
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    await loadRecent();
    await refresh();
  }, [loadRecent, markAllAsRead, refresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteNotification(id);
      await loadRecent();
      await refresh();
    },
    [deleteNotification, loadRecent, refresh],
  );

  return {
    notifications,
    unreadCount,
    loading,
    viewAllPath,
    onMarkRead: handleMarkRead,
    onMarkAllRead: handleMarkAllRead,
    onDelete: handleDelete,
    refresh: loadRecent,
  };
}
