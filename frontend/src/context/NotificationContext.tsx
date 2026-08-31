import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { notificationApi } from "@/features/notifications/services/notificationApi";

export type Notification = {
  id: string;
  message: string;
  read: boolean;
  createdAt?: string;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

type NotificationProviderProps = {
  children: ReactNode;
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const [result, count] = await Promise.all([
        notificationApi.getMine({ page: 1, limit: 100 }),
        notificationApi.getUnreadCount(),
      ]);

      setNotifications(
        result.items.map((n) => ({
          id: n.id,
          message: n.message,
          read: n.isRead,
          createdAt: n.createdAt,
        })),
      );
      setUnreadCount(count);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
    if (!isAuthenticated) return undefined;

    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [refresh, isAuthenticated]);

  const markAsRead = useCallback(
    async (id: string) => {
      await notificationApi.markAsRead(id);
      await refresh();
    },
    [refresh],
  );

  const deleteNotification = useCallback(
    async (id: string) => {
      await notificationApi.deleteNotification(id);
      await refresh();
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    await notificationApi.markAllAsRead();
    await refresh();
  }, [refresh]);

  const markAllAsRead = clearAll;

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      deleteNotification,
      clearAll,
      markAllAsRead,
      refresh,
    }),
    [clearAll, deleteNotification, markAllAsRead, markAsRead, notifications, unreadCount, refresh],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
