export type NotificationType =
  | "APPOINTMENT"
  | "PAYMENT"
  | "MILESTONE"
  | "SYSTEM"
  | "EMAIL"
  | "WHATSAPP";

export type DeliveryStatus = "pending" | "sent" | "failed" | "read";

export interface AppNotification {
  id: string;
  recipientId?: string;
  recipientRole?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  type: NotificationType | string | null;
  title: string;
  message: string;
  isRead: boolean;
  read: boolean;
  status?: DeliveryStatus | string | null;
  failureReason?: string | null;
  relatedId?: string | null;
  createdAt?: string;
  sentDate?: string;
}

export interface NotificationAdminStats {
  total: number;
  unread: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  appointmentReminders: boolean;
  therapyNotifications: boolean;
  updatedAt?: string;
}
