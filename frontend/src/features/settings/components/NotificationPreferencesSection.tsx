import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "../hooks/usePreferences";
import type { UserPreferences } from "../settings.types";
import { preferencesService } from "../services/preferencesService";

type Role = "patient" | "doctor";

type ToggleField = {
  key: keyof UserPreferences;
  label: string;
  description: string;
};

const PATIENT_TOGGLES: ToggleField[] = [
  { key: "appointmentNotifications", label: "Appointment Notifications", description: "Reminders for upcoming and changed appointments" },
  { key: "medicationReminders", label: "Medication Reminders", description: "Alerts for prescribed medications and refills" },
  { key: "recoveryNotifications", label: "Recovery Progress Notifications", description: "Updates on therapy milestones and recovery scores" },
  { key: "emailNotifications", label: "Email Notifications", description: "Receive notifications via email" },
  { key: "inAppNotifications", label: "In-App Notifications", description: "Show notifications inside the dashboard" },
];

const DOCTOR_TOGGLES: ToggleField[] = [
  { key: "appointmentNotifications", label: "Appointment Notifications", description: "New bookings, cancellations, and schedule changes" },
  { key: "sessionNotifications", label: "Session Notifications", description: "Therapy session reminders and follow-ups" },
  { key: "patientUpdates", label: "Patient Updates", description: "Changes to assigned patient records and care plans" },
  { key: "emailNotifications", label: "Email Notifications", description: "Receive notifications via email" },
];

type Props = {
  role: Role;
};

export default function NotificationPreferencesSection({ role }: Props) {
  const { preferences, loading, error, reload, setPreferences } = usePreferences();
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  const toggles = role === "patient" ? PATIENT_TOGGLES : DOCTOR_TOGGLES;

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
    for (const toggle of toggles) {
      if (draft[toggle.key] !== preferences[toggle.key]) {
        (payload as Record<string, boolean>)[toggle.key] = draft[toggle.key] as boolean;
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
          {Array.from({ length: 4 }).map((_, i) => (
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
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {toggles.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3"
          >
            <div className="min-w-0">
              <Label htmlFor={`notif-${toggle.key}`} className="text-sm font-medium">
                {toggle.label}
              </Label>
              <p className="text-xs text-muted-foreground">{toggle.description}</p>
            </div>
            <Switch
              id={`notif-${toggle.key}`}
              checked={Boolean(draft[toggle.key])}
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
