import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Camera,
  KeyRound,
  Lock,
  Pencil,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { authService } from "@/features/auth/services/authService";
import { useDoctorDashboardContext } from "../hooks/DoctorDashboardContext";
import { doctorDashboardService } from "../services/doctorDashboardService";
import type { DoctorProfile } from "../types/doctor-dashboard.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableFields = {
  phone: string;
  about: string;
  image: string;
};

type PasswordFields = {
  current: string;
  next: string;
  confirm: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const toEditableFields = (profile: DoctorProfile): EditableFields => ({
  phone: profile.phone ?? "",
  about: profile.about ?? "",
  image: profile.image ?? "",
});

const getAccountStatus = (profile: DoctorProfile): string => {
  if (profile.is_approved === false) return "Pending Approval";
  if (profile.is_active === false) return "Inactive";
  return "Active";
};

const accountStatusVariant = (
  status: string,
): "default" | "secondary" | "outline" => {
  if (status === "Active") return "default";
  if (status === "Pending Approval") return "outline";
  return "secondary";
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Could not load profile</p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileEmpty() {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <UserCircle className="h-12 w-12 text-muted-foreground" />
        <p className="font-semibold text-foreground">No profile information yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your doctor profile has not been set up. Please contact your administrator.
        </p>
      </CardContent>
    </Card>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
          <Lock className="h-2.5 w-2.5" />
          Read-only
        </Badge>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-foreground">{value || "—"}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">Managed by administrator</p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data, loading, error, refetch } = useDoctorDashboardContext();

  const profile = data?.profile ?? null;
  const stats = data?.stats ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<EditableFields>({ phone: "", about: "", image: "" });
  const [snapshot, setSnapshot] = useState<EditableFields>({ phone: "", about: "", image: "" });

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState<PasswordFields>({
    current: "",
    next: "",
    confirm: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      const fields = toEditableFields(profile);
      setDraft(fields);
      if (!isEditing) setSnapshot(fields);
    }
  }, [profile, isEditing]);

  const accountStatus = useMemo(
    () => (profile ? getAccountStatus(profile) : "—"),
    [profile],
  );

  const handleStartEdit = () => {
    if (!profile) return;
    const fields = toEditableFields(profile);
    setSnapshot(fields);
    setDraft(fields);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(snapshot);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    const payload: { phone?: string; about?: string; image?: string } = {};
    if (draft.phone !== snapshot.phone) payload.phone = draft.phone.trim();
    if (draft.about !== snapshot.about) payload.about = draft.about;
    if (draft.image !== snapshot.image) payload.image = draft.image.trim();

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await doctorDashboardService.updateProfile(payload);
      toast.success("Profile updated successfully.");
      setIsEditing(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordFields.current.trim()) {
      toast.error("Current password is required.");
      return;
    }
    if (passwordFields.next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (passwordFields.next !== passwordFields.confirm) {
      toast.error("New password confirmation does not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await authService.changePassword(
        passwordFields.current,
        passwordFields.next,
      );
      setPasswordFields({ current: "", next: "", confirm: "" });
      setPasswordOpen(false);
      toast.success(result.message || "Password changed successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (loading) return <ProfileSkeleton />;

  if (error) return <ProfileError message={error} onRetry={handleRetry} />;

  if (!profile) return <ProfileEmpty />;

  const statCards = [
    { label: "Total Patients", value: stats?.totalPatients ?? 0 },
    { label: "Success Rate", value: `${profile.successRate ?? 0}%` },
    { label: "Experience", value: `${profile.experience ?? 0} yrs` },
    { label: "Patients Treated", value: profile.patientsTreated ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile details */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4">
          <CardTitle className="text-sm font-semibold text-foreground">Profile Information</CardTitle>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleStartEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6 px-4 pb-4 pt-4">
          {/* Avatar + identity */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20 border border-border">
                {draft.image ? (
                  <AvatarImage src={draft.image} alt={profile.name} />
                ) : null}
                <AvatarFallback className="bg-muted text-lg font-semibold text-foreground">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              {isEditing ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Camera className="h-3 w-3" />
                  Update avatar URL below
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant={accountStatusVariant(accountStatus)}>{accountStatus}</Badge>
                <span className="text-xs text-muted-foreground">Doctor ID: {profile.id}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            {isEditing ? (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="profile-image">Profile Avatar URL</Label>
                  <Input
                    id="profile-image"
                    value={draft.image}
                    onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-phone">Phone Number</Label>
                  <Input
                    id="profile-phone"
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    placeholder="+92 300 0000000"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="profile-about">Bio / About Me</Label>
                  <Textarea
                    id="profile-about"
                    value={draft.about}
                    onChange={(e) => setDraft((d) => ({ ...d, about: e.target.value }))}
                    placeholder="Write a short professional bio…"
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <p className="text-sm text-foreground">{profile.phone || "—"}</p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Bio / About Me</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {profile.about?.trim() || "No bio added yet."}
                  </p>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Read-only admin-controlled fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Full Name" value={profile.name} />
            <ReadOnlyField label="Email" value={profile.email} />
            <ReadOnlyField label="Specialization" value={profile.specialization} />
            {profile.department ? (
              <ReadOnlyField label="Department" value={profile.department} />
            ) : null}
            <ReadOnlyField label="License Number" value={profile.license_no} />
            <ReadOnlyField label="Qualification" value={profile.qualification} />
            <ReadOnlyField label="Role" value={profile.role} />
            <ReadOnlyField label="Account Status" value={accountStatus} />
            <ReadOnlyField
              label="Experience"
              value={`${profile.experience ?? 0} years`}
            />
            <ReadOnlyField
              label="Patients Treated"
              value={String(profile.patientsTreated ?? 0)}
            />
            <ReadOnlyField
              label="Success Rate"
              value={`${profile.successRate ?? 0}%`}
            />
          </div>

          {/* Assigned services */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Assigned Services</Label>
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                <Lock className="h-2.5 w-2.5" />
                Read-only
              </Badge>
            </div>
            <div className="rounded-md border border-border bg-muted p-3">
              {profile.services && profile.services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.services.map((service) => (
                    <Badge key={service.id} variant="secondary">
                      {service.title}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No services assigned yet.</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Managed by administrator</p>
          </div>
        </CardContent>
      </Card>

      {/* Account security */}
      <Card className="border-border shadow-sm">
        <CardHeader className="px-4 pb-0 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold text-foreground">Account Security</CardTitle>
            </div>
            {!passwordOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setPasswordOpen(true)}
              >
                Change Password
              </Button>
            ) : null}
          </div>
        </CardHeader>

        {passwordOpen ? (
          <CardContent className="px-4 pb-4 pt-4">
            <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordFields.current}
                  onChange={(e) =>
                    setPasswordFields((f) => ({ ...f, current: e.target.value }))
                  }
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordFields.next}
                  onChange={(e) =>
                    setPasswordFields((f) => ({ ...f, next: e.target.value }))
                  }
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordFields.confirm}
                  onChange={(e) =>
                    setPasswordFields((f) => ({ ...f, confirm: e.target.value }))
                  }
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPasswordOpen(false);
                    setPasswordFields({ current: "", next: "", confirm: "" });
                  }}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating…" : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="px-4 pb-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Keep your account secure by using a strong, unique password.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
