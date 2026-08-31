import api from "@/lib/api";
import type { UserPreferences } from "@/features/settings/settings.types";

import type {
  AppNotification,
  NotificationAdminStats,
  NotificationPreferences,
} from "@/features/notifications/types/notification";

export type MarkReadResult = {
  notification: AppNotification;
  unreadCount: number;
  adminStats?: NotificationAdminStats;
};

export type PaginatedNotifications = {
  items: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type BackendNotificationRow = {
  id: string;
  user_id?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  is_read?: boolean | null;
  sent_date?: string | null;
  created_at?: string | null;
  failure_reason?: string | null;
  related_id?: string | null;
  users?: { name?: string | null; email?: string | null } | null;
};

type PaginatedBackendResponse = {
  items?: BackendNotificationRow[];
  pagination?: PaginatedNotifications["pagination"];
};

const DEFAULT_PAGE_SIZE = 20;

function deriveTitle(message?: string | null): string {
  const text = String(message ?? "").toLowerCase();
  if (text.includes("appointment") || text.includes("session")) return "Appointment update";
  if (text.includes("payment") || text.includes("invoice")) return "Payment notification";
  if (text.includes("milestone") || text.includes("recovery")) return "Recovery milestone";
  return "Notification";
}

function sanitizeMessage(message?: string | null): string {
  return String(message ?? "").replace(/\s*milestone:[a-f0-9-]+:\d+\s*/gi, "").trim();
}

function mapNotification(row: BackendNotificationRow): AppNotification {
  const status = String(row.status ?? "");
  const isRead = row.is_read === true || status.toLowerCase() === "read";
  const message = sanitizeMessage(row.message);

  return {
    id: String(row.id),
    recipientId: row.user_id ?? undefined,
    type: row.type ?? null,
    title: row.title?.trim() || deriveTitle(message),
    message,
    isRead,
    read: isRead,
    status: row.status ?? null,
    failureReason: row.failure_reason ?? null,
    relatedId: row.related_id ?? null,
    recipientName: row.users?.name ?? null,
    recipientEmail: row.users?.email ?? null,
    createdAt: row.created_at ?? row.sent_date ?? undefined,
    sentDate: row.sent_date ?? undefined,
  };
}

function unwrapList(payload: unknown): AppNotification[] {
  if (Array.isArray(payload)) {
    return (payload as BackendNotificationRow[]).map(mapNotification);
  }

  const paginated = payload as PaginatedBackendResponse;
  if (Array.isArray(paginated?.items)) {
    return paginated.items.map(mapNotification);
  }

  const envelope = payload as ApiEnvelope<BackendNotificationRow[] | { items: BackendNotificationRow[] }>;
  const data = envelope?.data;

  if (Array.isArray(data)) return data.map(mapNotification);
  if (data && typeof data === "object" && "items" in data && Array.isArray(data.items)) {
    return data.items.map(mapNotification);
  }

  return [];
}

function unwrapPaginated(payload: unknown): PaginatedNotifications {
  const paginated = payload as PaginatedBackendResponse;
  if (paginated?.items && paginated?.pagination) {
    return {
      items: paginated.items.map(mapNotification),
      pagination: paginated.pagination,
    };
  }

  const items = unwrapList(payload);
  return {
    items,
    pagination: {
      page: 1,
      limit: items.length || DEFAULT_PAGE_SIZE,
      total: items.length,
      totalPages: 1,
      hasMore: false,
    },
  };
}

function unwrapData<T>(payload: unknown): T | null {
  const envelope = payload as ApiEnvelope<T>;
  if (envelope?.data !== undefined) return envelope.data;
  return (payload as T) ?? null;
}

function unwrapCount(payload: unknown): number {
  const data = unwrapData<{ count: number }>(payload);
  if (data?.count != null) return data.count;
  if (typeof payload === "object" && payload !== null && "count" in payload) {
    return Number((payload as { count: number }).count) || 0;
  }
  return 0;
}

const DEFAULT_PREFS: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  appointmentReminders: true,
  therapyNotifications: true,
};

function fromUserPreferences(prefs: Partial<UserPreferences>): NotificationPreferences {
  return {
    inAppEnabled: prefs.inAppNotifications ?? DEFAULT_PREFS.inAppEnabled,
    emailEnabled: prefs.emailNotifications ?? DEFAULT_PREFS.emailEnabled,
    smsEnabled: false,
    whatsappEnabled: false,
    appointmentReminders: prefs.appointmentNotifications ?? DEFAULT_PREFS.appointmentReminders,
    therapyNotifications: prefs.sessionNotifications ?? DEFAULT_PREFS.therapyNotifications,
  };
}

function toUserPreferencesUpdate(
  partial: Partial<NotificationPreferences>,
): Partial<UserPreferences> {
  const update: Partial<UserPreferences> = {};
  if (partial.inAppEnabled !== undefined) update.inAppNotifications = partial.inAppEnabled;
  if (partial.emailEnabled !== undefined) update.emailNotifications = partial.emailEnabled;
  if (partial.appointmentReminders !== undefined) {
    update.appointmentNotifications = partial.appointmentReminders;
  }
  if (partial.therapyNotifications !== undefined) {
    update.sessionNotifications = partial.therapyNotifications;
  }
  return update;
}

export const notificationApi = {
  async getMine(params?: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedNotifications> {
    const res = await api.get("/notifications/me", {
      params: {
        type: params?.type && params.type !== "all" ? params.type : undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? DEFAULT_PAGE_SIZE,
      },
    });
    return unwrapPaginated(res.data);
  },

  async getRecent(limit = 10): Promise<AppNotification[]> {
    const result = await this.getMine({ page: 1, limit });
    return result.items.slice(0, limit);
  },

  async getUnreadCount(): Promise<number> {
    const res = await api.get("/notifications/me/unread-count");
    return unwrapCount(res.data);
  },

  async markAsRead(id: string): Promise<MarkReadResult> {
    const res = await api.patch(`/notifications/${id}/read`);
    const unreadCount = await this.getUnreadCount();
    const data = unwrapData<{ id?: string; ok?: boolean }>(res.data);

    return {
      notification: {
        id: data?.id ?? id,
        title: "",
        message: "",
        isRead: true,
        read: true,
        type: null,
      },
      unreadCount,
    };
  },

  async markAllAsRead(): Promise<{ unreadCount: number }> {
    await api.patch("/notifications/me/read-all");
    return { unreadCount: 0 };
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async getAdminStats(): Promise<NotificationAdminStats> {
    const res = await api.get("/notifications/admin/stats");
    return (
      unwrapData<NotificationAdminStats>(res.data) ?? {
        total: 0,
        unread: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      }
    );
  },

  async getAdminHistory(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedNotifications> {
    const res = await api.get("/notifications/admin/history", {
      params: {
        status: params?.status && params.status !== "all" ? params.status : undefined,
        type: params?.type && params.type !== "all" ? params.type : undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? DEFAULT_PAGE_SIZE,
      },
    });
    return unwrapPaginated(res.data);
  },

  async getAdminList(params?: { page?: number; limit?: number }): Promise<PaginatedNotifications> {
    const res = await api.get("/notifications/", {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? DEFAULT_PAGE_SIZE,
      },
    });
    return unwrapPaginated(res.data);
  },

  async markAllAsReadAdmin(): Promise<void> {
    await api.patch("/notifications/read-all");
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await api.get<{ success: boolean; data: UserPreferences }>("/auth/preferences");
    return fromUserPreferences(res.data?.data ?? {});
  },

  async updatePreferences(
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const payload = toUserPreferencesUpdate(prefs);
    const res = await api.patch<{ success: boolean; data: UserPreferences }>(
      "/auth/preferences",
      payload,
    );
    return fromUserPreferences(res.data?.data ?? {});
  },
};

export type NotificationInboxItem = {
  id: string;
  title: string;
  message: string;
  type: "appointment" | "alert" | "note" | "system";
  createdAt: string;
  read: boolean;
};

function mapInboxItem(row: AppNotification): NotificationInboxItem {
  const message = row.message ?? "";
  const lower = message.toLowerCase();
  let title = row.title || "Notification";
  let type: NotificationInboxItem["type"] = "system";

  if (lower.includes("patient assigned") || lower.includes("assignment updated")) {
    title = lower.includes("updated") ? "Patient assignment updated" : "New patient assigned";
    type = "system";
  } else if (lower.includes("appointment") || lower.includes("session")) {
    title = row.title || "Appointment update";
    type = "appointment";
  } else if (lower.includes("alert") || lower.includes("critical")) {
    title = row.title || "Patient alert";
    type = "alert";
  }

  return {
    id: row.id,
    title,
    message,
    type,
    createdAt: row.createdAt ?? row.sentDate ?? new Date().toISOString(),
    read: row.isRead,
  };
}

/** @deprecated Use notificationApi directly — thin compatibility layer. */
export const notificationService = {
  async listMine(): Promise<NotificationInboxItem[]> {
    const result = await notificationApi.getMine({ page: 1, limit: 100 });
    return result.items.map(mapInboxItem);
  },

  async unreadCount(): Promise<number> {
    return notificationApi.getUnreadCount();
  },

  async markRead(id: string): Promise<void> {
    await notificationApi.markAsRead(id);
  },

  async markAllRead(): Promise<void> {
    await notificationApi.markAllAsRead();
  },

  async markAllReadAdmin(): Promise<void> {
    await notificationApi.markAllAsReadAdmin();
  },

  async deleteNotification(id: string): Promise<void> {
    await notificationApi.deleteNotification(id);
  },
};

export type { AppNotification };
