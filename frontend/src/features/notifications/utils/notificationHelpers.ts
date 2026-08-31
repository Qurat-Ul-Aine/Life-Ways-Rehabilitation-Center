import {
  Activity,
  Bell,
  CalendarDays,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "../types/notification";

export function getNotificationIcon(type?: string | null): LucideIcon {
  switch (type) {
    case "APPOINTMENT":
      return CalendarDays;
    case "PAYMENT":
      return CreditCard;
    case "MILESTONE":
      return Activity;
    default:
      return Bell;
  }
}

export function getNotificationStyle(type?: string | null): string {
  switch (type) {
    case "APPOINTMENT":
      return "bg-primary/10 text-primary";
    case "PAYMENT":
      return "bg-amber-100 text-amber-700";
    case "MILESTONE":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-violet-100 text-violet-700";
  }
}

export function formatNotificationTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
  });
}

export function isUnread(notification: AppNotification): boolean {
  if (notification.isRead === true || notification.read === true) return false;
  if (String(notification.status ?? "").toLowerCase() === "read") return false;
  return true;
}
