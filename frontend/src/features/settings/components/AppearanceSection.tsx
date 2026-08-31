import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ThemePreference, UserPreferences } from "../settings.types";
import { preferencesService } from "../services/preferencesService";

const THEMES: { id: ThemePreference; label: string; description: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", description: "Bright, clean interface", icon: Sun },
  { id: "dark", label: "Dark", description: "Reduced glare for low light", icon: Moon },
  { id: "system", label: "System", description: "Match your device settings", icon: Laptop },
];

const DEFAULT_PREFS: UserPreferences = {
  appointmentNotifications: true,
  medicationReminders: true,
  recoveryNotifications: true,
  sessionNotifications: true,
  patientUpdates: true,
  emailNotifications: true,
  inAppNotifications: true,
  profileVisibility: "care_team",
  dataSharing: true,
  theme: "system",
};

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ThemePreference>("system");
  const [saving, setSaving] = useState(false);

  const loadPreferences = () => {
    setLoading(true);
    setLoadError(null);
    preferencesService
      .getMine()
      .then((data) => {
        setPreferences(data);
        if (data.theme) {
          setSelected(data.theme);
          setTheme(data.theme);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Could not load saved theme.";
        setLoadError(message);
        setPreferences(null);
        const fallback = (theme as ThemePreference) || "system";
        setSelected(fallback);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (preferences?.theme) {
      setSelected(preferences.theme);
    } else if (theme && !loading) {
      setSelected(theme as ThemePreference);
    }
  }, [preferences, theme, loading]);

  const handleSelect = (value: ThemePreference) => {
    setSelected(value);
    setTheme(value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await preferencesService.updateMine({ theme: selected });
      setPreferences(updated);
      setLoadError(null);
      setTheme(selected);
      toast.success("Theme preference saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="grid gap-3 p-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Customize how the dashboard looks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loadError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            <p>Could not load saved theme from the server. You can still preview themes below.</p>
            <p className="mt-1 text-xs opacity-80">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={loadPreferences}
            >
              Retry
            </Button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((item) => {
            const Icon = item.icon;
            const active = selected === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                )}
              >
                {active ? (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
                ) : null}
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving..." : "Save Theme"}
        </Button>

        {!preferences && !loadError ? (
          <p className="text-xs text-muted-foreground">
            Using defaults: {DEFAULT_PREFS.theme} theme
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
