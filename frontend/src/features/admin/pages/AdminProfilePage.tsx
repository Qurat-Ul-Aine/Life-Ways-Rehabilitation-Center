import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Camera,
  Settings,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { useAdminProfile } from "@/features/admin/context/AdminProfileContext";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import { adminSettingsService } from "@/features/admin/services/adminSettingsService";
import { formatTimezoneDisplay } from "@/features/admin/data/timezoneRegions";
import type { SystemPreferences } from "@/features/admin/types/admin-settings.types";

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  const { profile, loading, refresh, updateAvatar, setProfile: setGlobalProfile } = useAdminProfile();
  const { hospital, setHospital: setGlobalHospital } = useHospitalSettings();

  const [profileDraft, setProfileDraft] = useState({ name: "", email: "", phone: "" });
  const [profileSnapshot, setProfileSnapshot] = useState({ name: "", email: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [hospitalDraft, setHospitalDraft] = useState({
    hospitalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });
  const [hospitalSnapshot, setHospitalSnapshot] = useState({
    hospitalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
  });
  const [savingHospital, setSavingHospital] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [systemPrefs, setSystemPrefs] = useState<SystemPreferences | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const draft = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? "",
    };
    setProfileDraft(draft);
    setProfileSnapshot(draft);
  }, [profile]);

  useEffect(() => {
    const draft = {
      hospitalName: hospital.hospitalName,
      contactEmail: hospital.contactEmail ?? "",
      contactPhone: hospital.contactPhone ?? "",
      address: hospital.address ?? "",
    };
    setHospitalDraft(draft);
    setHospitalSnapshot(draft);
  }, [hospital]);

  const loadSystem = useCallback(async () => {
    setSystemLoading(true);
    try {
      const data = await adminSettingsService.getSystemPreferences();
      setSystemPrefs(data);
    } catch {
      setSystemPrefs(null);
    } finally {
      setSystemLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSystem();
  }, [loadSystem]);

  const avatarUrl = resolveUploadUrl(profile?.avatarUrl);
  const hospitalLogo = resolveUploadUrl(hospital.logoUrl);
  const displayName = profileDraft.name || profile?.name || user?.name || "Administrator";

  const profileDirty =
    profileDraft.name !== profileSnapshot.name ||
    profileDraft.email !== profileSnapshot.email ||
    profileDraft.phone !== profileSnapshot.phone;

  const hospitalDirty =
    hospitalDraft.hospitalName !== hospitalSnapshot.hospitalName ||
    hospitalDraft.contactEmail !== hospitalSnapshot.contactEmail ||
    hospitalDraft.contactPhone !== hospitalSnapshot.contactPhone ||
    hospitalDraft.address !== hospitalSnapshot.address;

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await adminSettingsService.uploadProfileImage(file);
      updateAvatar(url);
      await refresh();
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      setGlobalProfile(updated);
      setProfileSnapshot({
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? "",
      });
      if (user) {
        updateUser({ ...user, name: updated.name, email: updated.email });
      }
      toast.success("Personal information saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const updated = await adminSettingsService.uploadHospitalLogo(file);
      setGlobalHospital(updated);
      toast.success("Hospital logo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
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
      setGlobalHospital(updated);
      setHospitalSnapshot({
        hospitalName: updated.hospitalName,
        contactEmail: updated.contactEmail ?? "",
        contactPhone: updated.contactPhone ?? "",
        address: updated.address ?? "",
      });
      toast.success("Hospital information saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hospital information.");
    } finally {
      setSavingHospital(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border shadow-sm">
        <div className="h-28 bg-gradient-to-r from-primary/90 via-primary to-emerald-700" />
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-14">
                <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold text-foreground">{displayName}</h1>
                  <Badge variant="secondary" className="capitalize">
                    {profile?.role ?? user?.role ?? "admin"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profileDraft.email || profile?.email || user?.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Edit your administrator account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileDraft.email}
                onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profileDraft.phone}
                onChange={(e) => setProfileDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="+92 300 0000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3">
                <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize text-foreground">
                  {profile?.role ?? user?.role ?? "admin"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Role cannot be changed from this page.</p>
            </div>
            <Button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile || !profileDirty}
            >
              {savingProfile ? "Saving..." : "Save personal info"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Hospital Information</CardTitle>
                <CardDescription>Edit organization branding and contact details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {hospitalLogo ? (
                  <img src={hospitalLogo} alt="Hospital logo" className="h-full w-full object-contain p-2" />
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

            <div className="space-y-2">
              <Label htmlFor="hospital-name">Hospital name</Label>
              <Input
                id="hospital-name"
                value={hospitalDraft.hospitalName}
                onChange={(e) =>
                  setHospitalDraft((d) => ({ ...d, hospitalName: e.target.value }))
                }
                placeholder="Life Ways Rehab"
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
                placeholder="info@hospital.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-phone">Contact phone</Label>
              <Input
                id="hospital-phone"
                value={hospitalDraft.contactPhone}
                onChange={(e) =>
                  setHospitalDraft((d) => ({ ...d, contactPhone: e.target.value }))
                }
                placeholder="03430000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospital-address">Address</Label>
              <Textarea
                id="hospital-address"
                rows={3}
                value={hospitalDraft.address}
                onChange={(e) =>
                  setHospitalDraft((d) => ({ ...d, address: e.target.value }))
                }
                placeholder="Street, city, country"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleSaveHospital()}
              disabled={savingHospital || !hospitalDirty}
            >
              {savingHospital ? "Saving..." : "Save hospital info"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">System Preferences</CardTitle>
          <CardDescription>Current scheduling defaults — edit in Settings</CardDescription>
        </CardHeader>
        <CardContent>
          {systemLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : systemPrefs ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Appointment duration
                </p>
                <p className="mt-1 text-sm font-medium">{systemPrefs.defaultAppointmentDuration} minutes</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Time zone
                </p>
                <p className="mt-1 text-sm font-medium">{formatTimezoneDisplay(systemPrefs.timezone)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Date format
                </p>
                <p className="mt-1 text-sm font-medium">{systemPrefs.dateFormat}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">System preferences are not available.</p>
          )}
          <Separator className="my-4" />
          <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
            <Link to="/admin/dashboard/settings">
              <Settings className="h-4 w-4" />
              Manage system preferences
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
