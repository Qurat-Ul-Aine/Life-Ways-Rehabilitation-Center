import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Lock,
  Palette,
  Shield,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import {
  patientService,
  type PatientMeProfile,
  type PatientProfileUpdate,
} from "@/features/patient/services/patientService";
import SettingsLayout from "@/features/settings/components/SettingsLayout";
import ChangePasswordSection from "@/features/settings/components/ChangePasswordSection";
import NotificationPreferencesSection from "@/features/settings/components/NotificationPreferencesSection";
import AppearanceSection from "@/features/settings/components/AppearanceSection";
import PrivacySection from "@/features/settings/components/PrivacySection";
import type { SettingsSection } from "@/features/settings/settings.types";
import { usePatientContext } from "../hooks/usePatientContext";

const SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", icon: <UserCircle />, description: "Personal information" },
  { id: "security", label: "Security", icon: <Lock />, description: "Password & access" },
  { id: "notifications", label: "Notifications", icon: <Bell />, description: "Alert preferences" },
  { id: "appearance", label: "Appearance", icon: <Palette />, description: "Theme & display" },
  { id: "privacy", label: "Privacy", icon: <Shield />, description: "Visibility & sharing" },
];

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  profileImageUrl: string;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const toForm = (profile: PatientMeProfile): ProfileForm => ({
  fullName: profile.fullName ?? "",
  email: profile.email ?? "",
  phone: profile.phone ?? "",
  address: profile.address ?? "",
  profileImageUrl: profile.profileImageUrl ?? "",
});

function ProfileSkeleton() {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPanel() {
  const { user, updateUser } = useAuth();
  const { refetch: refetchContext } = usePatientContext();
  const isFamily = String(user?.role ?? "").toLowerCase() === "family";

  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState<PatientMeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileForm | null>(null);
  const [snapshot, setSnapshot] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getMe();
      setProfile(data);
      const form = toForm(data);
      setDraft(form);
      setSnapshot(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isFamily) return;

    setUploadingImage(true);
    try {
      const { url, profile: updated } = await patientService.uploadProfileImage(file);
      setProfile(updated);
      const form = toForm(updated);
      setDraft(form);
      setSnapshot(form);
      refetchContext();
      toast.success("Profile picture updated.");
      if (!url) return;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!draft || !snapshot || isFamily) return;

    const payload: PatientProfileUpdate = {};
    if (draft.fullName !== snapshot.fullName) payload.name = draft.fullName.trim();
    if (draft.email !== snapshot.email) payload.email = draft.email.trim();
    if (draft.phone !== snapshot.phone) payload.phone = draft.phone.trim();
    if (draft.address !== snapshot.address) payload.address = draft.address.trim() || null;
    if (draft.profileImageUrl !== snapshot.profileImageUrl) {
      payload.profileImageUrl = draft.profileImageUrl.trim() || null;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const updated = await patientService.updateMe(payload);
      setProfile(updated);
      const form = toForm(updated);
      setDraft(form);
      setSnapshot(form);
      refetchContext();

      if (payload.name || payload.email) {
        updateUser({
          id: user!.id,
          name: updated.fullName ?? user!.name,
          email: updated.email ?? user!.email,
          role: user!.role,
        });
      }

      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = resolveUploadUrl(draft?.profileImageUrl);
  const displayName = draft?.fullName || user?.name || "Patient";

  const renderProfile = () => {
    if (loading) return <ProfileSkeleton />;

    if (error) {
      return (
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadProfile()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (!draft) return null;

    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isFamily ? (
            <Badge variant="outline" className="text-xs">
              Family accounts have read-only access to patient profile
            </Badge>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {!isFamily ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{draft.email}</p>
              {uploadingImage ? (
                <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="settings-full-name">Full Name</Label>
              <Input
                id="settings-full-name"
                value={draft.fullName}
                onChange={(e) => setDraft((p) => (p ? { ...p, fullName: e.target.value } : p))}
                disabled={isFamily}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((p) => (p ? { ...p, email: e.target.value } : p))}
                disabled={isFamily}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-phone">Phone Number</Label>
              <Input
                id="settings-phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft((p) => (p ? { ...p, phone: e.target.value } : p))}
                disabled={isFamily}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="settings-address">Address</Label>
              <Textarea
                id="settings-address"
                rows={3}
                value={draft.address}
                onChange={(e) => setDraft((p) => (p ? { ...p, address: e.target.value } : p))}
                disabled={isFamily}
              />
            </div>
          </div>

          {!isFamily ? (
            <Button type="button" onClick={() => void handleSaveProfile()} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfile();
      case "security":
        return <ChangePasswordSection />;
      case "notifications":
        return <NotificationPreferencesSection role="patient" />;
      case "appearance":
        return <AppearanceSection />;
      case "privacy":
        return <PrivacySection />;
      default:
        return null;
    }
  };

  return (
    <SettingsLayout
      title="Settings"
      subtitle="Manage your account, notifications, and preferences"
      sections={SECTIONS}
      activeId={activeSection}
      onSelect={setActiveSection}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
