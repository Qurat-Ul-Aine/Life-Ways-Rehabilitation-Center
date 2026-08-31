import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * SRS 2.8.7 — In-App + Email supported; SMS/WhatsApp shown as Coming Soon.
 */
export default function NotificationChannelsBanner() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Notification Channels</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            In-app and email alerts are active. Use the preferences panel below to opt in or out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Bell className="h-3 w-3" /> In-App
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Mail className="h-3 w-3" /> Email
          </Badge>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Smartphone className="h-3 w-3" /> SMS — Coming Soon
          </Badge>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" /> WhatsApp — Coming Soon
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
