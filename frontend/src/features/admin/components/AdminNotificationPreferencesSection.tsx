import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/features/settings/hooks/usePreferences";
import type { UserPreferences } from "@/features/settings/settings.types";
import { preferencesService } from "@/features/settings/services/preferencesService";

type ToggleField = {
  key: keyof UserPreferences;
  label: string;
  description: string;
};

const ADMIN_TOGGLES: ToggleField[] = [
  {
    key: "doctorRegistrationNotifications",
    label: "New Doctor Registration",
    description: "Alert when a new doctor registers or is added",
  },
  {
    key: "patientRegistrationNotifications",
    label: "New Patient Registration",
    description: "Alert when a new patient is registered",
  },
  {
    key: "appointmentNotifications",
    label: "Appointment Notifications",
    description: "Bookings, cancellations, and schedule changes",
  },
  {
    key: "telehealthNotifications",
    label: "Telehealth Session Notifications",
    description: "Online session starts, joins, and reminders",
  },
  {
    key: "emailNotifications",
    label: "Email Notifications",
    description: "Receive notifications via email",
  },
  {
    key: "inAppNotifications",
    label: "In-App Notifications",
    description: "Show notifications inside the admin dashboard",
  },
];

export default function AdminNotificationPreferencesSection() {
  const { preferences, loading, error, reload, setPreferences } = usePreferences();
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) setDraft(preferences);
  }, [preferences]);

  const setField = (key: keyof UserPreferences, value: boolean) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const handleSave = async () => {
    if (!draft || !preferences) return;

    const payload: Partial<UserPreferences> = {};
    for (const toggle of ADMIN_TOGGLES) {
      const draftVal = draft[toggle.key];
      const savedVal = preferences[toggle.key];
      if (draftVal !== savedVal) {
        (payload as Record<string, boolean>)[toggle.key] = Boolean(draftVal);
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const updated = await preferencesService.updateMine(payload);
      setPreferences(updated);
      setDraft(updated);
      toast.success("Notification preferences saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !draft) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{error ?? "Could not load preferences."}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Notification Settings</CardTitle>
            <CardDescription>Control admin alerts across the platform</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {ADMIN_TOGGLES.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3"
          >
            <div className="min-w-0">
              <Label htmlFor={`admin-notif-${toggle.key}`} className="text-sm font-medium">
                {toggle.label}
              </Label>
              <p className="text-xs text-muted-foreground">{toggle.description}</p>
            </div>
            <Switch
              id={`admin-notif-${toggle.key}`}
              checked={Boolean(draft[toggle.key] ?? true)}
              onCheckedChange={(checked) => setField(toggle.key, checked)}
            />
          </div>
        ))}

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
