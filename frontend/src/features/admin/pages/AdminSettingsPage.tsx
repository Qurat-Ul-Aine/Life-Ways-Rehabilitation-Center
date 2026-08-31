import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  Lock,
  Palette,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import SettingsLayout from "@/features/settings/components/SettingsLayout";
import ChangePasswordSection from "@/features/settings/components/ChangePasswordSection";
import AppearanceSection from "@/features/settings/components/AppearanceSection";
import AdminNotificationPreferencesSection from "@/features/admin/components/AdminNotificationPreferencesSection";
import TimezoneRegionPicker from "@/features/admin/components/TimezoneRegionPicker";
import { adminSettingsService } from "@/features/admin/services/adminSettingsService";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import { useAdminProfile } from "@/features/admin/context/AdminProfileContext";
import type {
  AdminProfile,
  HospitalSettings,
  SystemPreferences,
} from "@/features/admin/types/admin-settings.types";
import {
  APPOINTMENT_DURATION_OPTIONS,
  DATE_FORMAT_OPTIONS,
} from "@/features/admin/types/admin-settings.types";
import type { SettingsSection } from "@/features/settings/settings.types";

const SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", icon: <UserCircle />, description: "Name, email & photo" },
  { id: "security", label: "Security", icon: <Lock />, description: "Password" },
  { id: "notifications", label: "Notifications", icon: <Bell />, description: "Alert preferences" },
  { id: "appearance", label: "Appearance", icon: <Palette />, description: "Theme" },
  { id: "hospital", label: "Hospital Info", icon: <Building2 />, description: "Branding & contact" },
  { id: "system", label: "System", icon: <SlidersHorizontal />, description: "Defaults & formats" },
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

function LoadingCard() {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const { setHospital: setGlobalHospital } = useHospitalSettings();
  const { updateAvatar, setProfile: setGlobalProfile, refresh: refreshGlobalProfile } = useAdminProfile();

  const [activeSection, setActiveSection] = useState("profile");

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "", phone: "" });
  const [profileSnapshot, setProfileSnapshot] = useState({ name: "", email: "", phone: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [hospital, setHospital] = useState<HospitalSettings | null>(null);
  const [hospitalDraft, setHospitalDraft] = useState({
    hospitalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });
  const [hospitalLoading, setHospitalLoading] = useState(true);
  const [savingHospital, setSavingHospital] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [systemPrefs, setSystemPrefs] = useState<SystemPreferences | null>(null);
  const [systemDraft, setSystemDraft] = useState({
    defaultAppointmentDuration: "30",
    timezone: "Asia/Karachi",
    dateFormat: "dd MMM yyyy",
  });
  const [systemLoading, setSystemLoading] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await adminSettingsService.getProfile();
      setProfile(data);
      const draft = { name: data.name, email: data.email, phone: data.phone ?? "" };
      setProfileDraft(draft);
      setProfileSnapshot(draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadHospital = useCallback(async () => {
    setHospitalLoading(true);
    try {
      const data = await adminSettingsService.getHospital();
      setHospital(data);
      setHospitalDraft({
        hospitalName: data.hospitalName,
        contactEmail: data.contactEmail ?? "",
        contactPhone: data.contactPhone ?? "",
        address: data.address ?? "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load hospital settings.");
    } finally {
      setHospitalLoading(false);
    }
  }, []);

  const loadSystem = useCallback(async () => {
    setSystemLoading(true);
    try {
      const data = await adminSettingsService.getSystemPreferences();
      setSystemPrefs(data);
      setSystemDraft({
        defaultAppointmentDuration: String(data.defaultAppointmentDuration),
        timezone: data.timezone,
        dateFormat: data.dateFormat,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load system preferences.");
    } finally {
      setSystemLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadHospital();
    void loadSystem();
  }, [loadProfile, loadHospital, loadSystem]);

  const handleSaveProfile = async () => {
    if (!profileDraft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileDraft.email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await adminSettingsService.updateProfile({
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
      });
      setProfile(updated);
      setProfileSnapshot({
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? "",
      });
      if (user) {
        updateUser({ ...user, name: updated.name, email: updated.email });
      }
      setGlobalProfile(updated);
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await adminSettingsService.uploadProfileImage(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      updateAvatar(url);
      await refreshGlobalProfile();
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveHospital = async () => {
    if (!hospitalDraft.hospitalName.trim()) {
      toast.error("Hospital name is required.");
      return;
    }

    setSavingHospital(true);
    try {
      const updated = await adminSettingsService.updateHospital({
        hospitalName: hospitalDraft.hospitalName.trim(),
        contactEmail: hospitalDraft.contactEmail.trim() || undefined,
        contactPhone: hospitalDraft.contactPhone.trim() || undefined,
        address: hospitalDraft.address.trim() || undefined,
      });
      setHospital(updated);
      setGlobalHospital(updated);
      toast.success("Hospital information saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hospital settings.");
    } finally {
      setSavingHospital(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const updated = await adminSettingsService.uploadHospitalLogo(file);
      setHospital(updated);
      setGlobalHospital(updated);
      toast.success("Hospital logo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveSystem = async () => {
    const duration = Number(systemDraft.defaultAppointmentDuration);
    if (!Number.isFinite(duration) || duration < 5) {
      toast.error("Select a valid appointment duration.");
      return;
    }

    setSavingSystem(true);
    try {
      const updated = await adminSettingsService.updateSystemPreferences({
        defaultAppointmentDuration: duration,
        timezone: systemDraft.timezone,
        dateFormat: systemDraft.dateFormat,
      });
      setSystemPrefs(updated);
      setSystemDraft({
        defaultAppointmentDuration: String(updated.defaultAppointmentDuration),
        timezone: updated.timezone,
        dateFormat: updated.dateFormat,
      });
      toast.success("System preferences saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save system preferences.");
    } finally {
      setSavingSystem(false);
    }
  };

  const profileDirty =
    profileDraft.name !== profileSnapshot.name ||
    profileDraft.email !== profileSnapshot.email ||
    profileDraft.phone !== profileSnapshot.phone;

  const avatarUrl = resolveUploadUrl(profile?.avatarUrl);
  const logoUrl = resolveUploadUrl(hospital?.logoUrl);

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        if (profileLoading) return <LoadingCard />;
        return (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile Settings</CardTitle>
                  <CardDescription>Update your administrator account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={profile?.name} /> : null}
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {getInitials(profile?.name ?? user?.name ?? "Admin")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAvatarUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {uploadingAvatar ? "Uploading..." : "Change photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 5 MB.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Full name</Label>
                  <Input
                    id="admin-name"
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-phone">Phone number</Label>
                  <Input
                    id="admin-phone"
                    value={profileDraft.phone}
                    onChange={(e) => setProfileDraft((d) => ({ ...d, phone: e.target.value }))}
                    placeholder="+92 300 0000000"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile || !profileDirty}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        );

      case "security":
        return <ChangePasswordSection />;

      case "notifications":
        return <AdminNotificationPreferencesSection />;

      case "appearance":
        return <AppearanceSection />;

      case "hospital":
        if (hospitalLoading) return <LoadingCard />;
        return (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Hospital Information</CardTitle>
                  <CardDescription>Branding shown across the admin portal and reports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Hospital logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {uploadingLogo ? "Uploading..." : "Upload logo"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="hospital-name">Hospital name</Label>
                  <Input
                    id="hospital-name"
                    value={hospitalDraft.hospitalName}
                    onChange={(e) =>
                      setHospitalDraft((d) => ({ ...d, hospitalName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospital-email">Contact email</Label>
                  <Input
                    id="hospital-email"
                    type="email"
                    value={hospitalDraft.contactEmail}
                    onChange={(e) =>
                      setHospitalDraft((d) => ({ ...d, contactEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospital-phone">Contact number</Label>
                  <Input
                    id="hospital-phone"
                    value={hospitalDraft.contactPhone}
                    onChange={(e) =>
                      setHospitalDraft((d) => ({ ...d, contactPhone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="hospital-address">Address</Label>
                  <Textarea
                    id="hospital-address"
                    rows={3}
                    value={hospitalDraft.address}
                    onChange={(e) =>
                      setHospitalDraft((d) => ({ ...d, address: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={() => void handleSaveHospital()}
                disabled={savingHospital}
              >
                {savingHospital ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        );

      case "system":
        if (systemLoading) return <LoadingCard />;
        return (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">System Preferences</CardTitle>
                  <CardDescription>Default scheduling and display formats</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default appointment duration</Label>
                  <Select
                    value={systemDraft.defaultAppointmentDuration}
                    onValueChange={(v) =>
                      setSystemDraft((d) => ({ ...d, defaultAppointmentDuration: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_DURATION_OPTIONS.map((mins) => (
                        <SelectItem key={mins} value={String(mins)}>
                          {mins} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <TimezoneRegionPicker
                    id="admin-timezone"
                    value={systemDraft.timezone}
                    onChange={(v) => setSystemDraft((d) => ({ ...d, timezone: v }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Date format</Label>
                  <Select
                    value={systemDraft.dateFormat}
                    onValueChange={(v) => setSystemDraft((d) => ({ ...d, dateFormat: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((fmt) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {systemPrefs?.updatedAt ? (
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(systemPrefs.updatedAt).toLocaleString("en-PK")}
                </p>
              ) : null}

              <Button
                type="button"
                onClick={() => void handleSaveSystem()}
                disabled={savingSystem}
              >
                {savingSystem ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <SettingsLayout
      title="Admin Settings"
      subtitle="Manage your account, hospital branding, and system preferences"
      sections={SECTIONS}
      activeId={activeSection}
      onSelect={setActiveSection}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
