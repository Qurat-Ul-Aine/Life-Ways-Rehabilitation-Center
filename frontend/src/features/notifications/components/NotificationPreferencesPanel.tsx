import { useCallback, useEffect, useState } from "react";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { notificationApi } from "@/features/notifications/services/notificationApi";
import type { NotificationPreferences } from "../types/notification";

const DEFAULT_PREFS: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  appointmentReminders: true,
  therapyNotifications: true,
};

type PrefKey = keyof NotificationPreferences;

const CHANNEL_ITEMS: {
  key: PrefKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}[] = [
  {
    key: "inAppEnabled",
    label: "In-App Notifications",
    description: "Show alerts in the notification bell and notifications page.",
    icon: Bell,
  },
  {
    key: "emailEnabled",
    label: "Email Notifications",
    description: "Receive notification copies by email.",
    icon: Mail,
  },
  {
    key: "smsEnabled",
    label: "SMS Notifications",
    description: "Coming soon — enable when SMS gateway is configured.",
    icon: Smartphone,
    disabled: true,
  },
  {
    key: "whatsappEnabled",
    label: "WhatsApp Notifications",
    description: "Coming soon — enable when WhatsApp gateway is configured.",
    icon: MessageSquare,
    disabled: true,
  },
];

const CATEGORY_ITEMS: {
  key: PrefKey;
  label: string;
  description: string;
}[] = [
  {
    key: "appointmentReminders",
    label: "Appointment Reminders",
    description: "Confirmations, cancellations, and 24-hour reminders.",
  },
  {
    key: "therapyNotifications",
    label: "Therapy Notifications",
    description: "Session reminders, milestones, and progress reports.",
  },
];

export default function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.getPreferences();
      setPrefs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (key: PrefKey, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setError(null);
    try {
      const updated = await notificationApi.updatePreferences({ [key]: value });
      setPrefs(updated);
    } catch (err) {
      setPrefs(previous);
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Notification Preferences</CardTitle>
        <p className="text-sm text-muted-foreground">
          Control how and when you receive alerts. Changes apply immediately.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Channels
          </p>
          {CHANNEL_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={item.key} className="text-sm font-medium">
                        {item.label}
                      </Label>
                      {item.disabled ? (
                        <Badge variant="outline" className="text-[10px]">
                          Coming Soon
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Switch
                  id={item.key}
                  checked={Boolean(prefs[item.key])}
                  disabled={item.disabled || saving}
                  onCheckedChange={(checked) => void handleToggle(item.key, checked)}
                />
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alert Categories
          </p>
          {CATEGORY_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="min-w-0">
                <Label htmlFor={item.key} className="text-sm font-medium">
                  {item.label}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={Boolean(prefs[item.key])}
                disabled={saving}
                onCheckedChange={(checked) => void handleToggle(item.key, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
