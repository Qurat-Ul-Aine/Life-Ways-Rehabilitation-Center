import { AlertTriangle, Bell, CheckCircle2, Clock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { NotificationAdminStats } from "../types/notification";

type Props = {
  stats: NotificationAdminStats;
  loading?: boolean;
};

const STAT_CARDS = [
  { key: "total" as const, label: "Total", icon: Bell, color: "text-foreground" },
  { key: "unread" as const, label: "Unread", icon: Mail, color: "text-primary" },
  { key: "sent" as const, label: "Sent", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "failed" as const, label: "Failed", icon: AlertTriangle, color: "text-destructive" },
  { key: "pending" as const, label: "Pending", icon: Clock, color: "text-amber-600" },
];

export default function AdminNotificationStats({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 p-4">
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold text-foreground">{stats[key]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
