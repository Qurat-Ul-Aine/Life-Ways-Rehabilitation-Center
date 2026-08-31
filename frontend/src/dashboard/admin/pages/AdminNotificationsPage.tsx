import NotificationInbox from "@/features/notifications/components/NotificationInbox";
import PageHeader from "@/components/common/PageHeader";

/** Admin dashboard page — system notification log via shared inbox. */
export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="System-wide notification log for the rehabilitation center"
      />
      <NotificationInbox />
    </div>
  );
}
