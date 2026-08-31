import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "../hooks/usePreferences";
import type { ProfileVisibility, UserPreferences } from "../settings.types";
import { preferencesService } from "../services/preferencesService";

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  { value: "care_team", label: "Care Team Only", description: "Visible to your doctors and care staff" },
  { value: "private", label: "Private", description: "Only you can see full profile details" },
  { value: "public", label: "Public", description: "Basic profile visible across the platform" },
];

export default function PrivacySection() {
  const { preferences, loading, error, reload, setPreferences } = usePreferences();
  const [draft, setDraft] = useState<Pick<UserPreferences, "profileVisibility" | "dataSharing"> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setDraft({
        profileVisibility: preferences.profileVisibility,
        dataSharing: preferences.dataSharing,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!draft || !preferences) return;

    const payload: Partial<UserPreferences> = {};
    if (draft.profileVisibility !== preferences.profileVisibility) {
      payload.profileVisibility = draft.profileVisibility;
    }
    if (draft.dataSharing !== preferences.dataSharing) {
      payload.dataSharing = draft.dataSharing;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const updated = await preferencesService.updateMine(payload);
      setPreferences(updated);
      setDraft({
        profileVisibility: updated.profileVisibility,
        dataSharing: updated.dataSharing,
      });
      toast.success("Privacy settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !draft) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">{error ?? "Could not load privacy settings."}</p>
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
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Privacy</CardTitle>
            <CardDescription>Control who can see your information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="profile-visibility">Profile Visibility</Label>
          <Select
            value={draft.profileVisibility}
            onValueChange={(value) =>
              setDraft((prev) =>
                prev ? { ...prev, profileVisibility: value as ProfileVisibility } : prev,
              )
            }
          >
            <SelectTrigger id="profile-visibility">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {VISIBILITY_OPTIONS.find((o) => o.value === draft.profileVisibility)?.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <Label htmlFor="data-sharing" className="text-sm font-medium">
              Data Sharing Preferences
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow anonymized health data to improve care recommendations
            </p>
          </div>
          <Switch
            id="data-sharing"
            checked={draft.dataSharing}
            onCheckedChange={(checked) =>
              setDraft((prev) => (prev ? { ...prev, dataSharing: checked } : prev))
            }
          />
        </div>

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
