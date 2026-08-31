import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Briefcase,
  CalendarClock,
  Camera,
  Lock,
  Palette,
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
import { useAuth } from "@/context/AuthContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import SettingsLayout from "@/features/settings/components/SettingsLayout";
import ChangePasswordSection from "@/features/settings/components/ChangePasswordSection";
import NotificationPreferencesSection from "@/features/settings/components/NotificationPreferencesSection";
import AppearanceSection from "@/features/settings/components/AppearanceSection";
import AvailabilityScheduleSection from "@/features/settings/components/AvailabilityScheduleSection";
import type { SettingsSection } from "@/features/settings/settings.types";
import { doctorDashboardService } from "../services/doctorDashboardService";
import { useDoctorDashboardContext } from "../hooks/DoctorDashboardContext";
import type { DoctorProfile, DoctorProfileUpdatePayload } from "../types/doctor-dashboard.types";
import DoctorGenderField, { resolveDoctorGenderFromForm } from "@/features/doctor/components/DoctorGenderField";
import {
  formatDoctorGender,
  parseDoctorGenderForForm,
  type DoctorGenderFormState,
} from "@/features/doctor/utils/doctorGender";

const SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", icon: <UserCircle />, description: "Personal & contact" },
  { id: "professional", label: "Professional", icon: <Briefcase />, description: "Credentials & fees" },
  { id: "availability", label: "Availability", icon: <CalendarClock />, description: "Working schedule" },
  { id: "security", label: "Security", icon: <Lock />, description: "Password" },
  { id: "notifications", label: "Notifications", icon: <Bell />, description: "Alert preferences" },
  { id: "appearance", label: "Appearance", icon: <Palette />, description: "Theme" },
];

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  image: string;
  gender: string | null;
  genderForm: DoctorGenderFormState;
};

type ProfessionalForm = {
  specialization: string;
  qualification: string;
  experience: string;
  about: string;
  consultationFee: string;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
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

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { refetch: refetchDashboard } = useDoctorDashboardContext();

  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileDraft, setProfileDraft] = useState<ProfileForm | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileForm | null>(null);
  const [professionalDraft, setProfessionalDraft] = useState<ProfessionalForm | null>(null);
  const [professionalSnapshot, setProfessionalSnapshot] = useState<ProfessionalForm | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await doctorDashboardService.getMe();
      const data = (result.data ?? result) as DoctorProfile;
      setProfile(data);

      const pForm: ProfileForm = {
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        image: data.image ?? "",
        gender: data.gender ?? null,
        genderForm: parseDoctorGenderForForm(data.gender),
      };
      setProfileDraft(pForm);
      setProfileSnapshot(pForm);

      const profForm: ProfessionalForm = {
        specialization: data.specialization ?? "",
        qualification: data.qualification ?? "",
        experience: String(data.experience ?? ""),
        about: data.about ?? "",
        consultationFee:
          data.consultationFee != null ? String(data.consultationFee) : "",
      };
      setProfessionalDraft(profForm);
      setProfessionalSnapshot(profForm);
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
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await doctorDashboardService.uploadProfileImage(file);
      const updated = (result.data ?? result) as DoctorProfile;
      setProfile(updated);
      const pForm: ProfileForm = {
        name: updated.name ?? profileDraft?.name ?? "",
        email: updated.email ?? profileDraft?.email ?? "",
        phone: updated.phone ?? profileDraft?.phone ?? "",
        image: updated.image ?? result.url ?? "",
        gender: updated.gender ?? profileDraft?.gender ?? null,
        genderForm: parseDoctorGenderForForm(updated.gender ?? profileDraft?.gender),
      };
      setProfileDraft(pForm);
      setProfileSnapshot(pForm);
      refetchDashboard();
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!profileDraft || !profileSnapshot) return;

    const payload: DoctorProfileUpdatePayload = {};
    if (profileDraft.name !== profileSnapshot.name) payload.name = profileDraft.name.trim();
    if (profileDraft.email !== profileSnapshot.email) payload.email = profileDraft.email.trim();
    if (profileDraft.phone !== profileSnapshot.phone) payload.phone = profileDraft.phone.trim();

    const resolvedGender = resolveDoctorGenderFromForm(
      profileDraft.genderForm.gender,
      profileDraft.genderForm.genderOther,
    );
    if (profileDraft.genderForm.gender === "other" && !profileDraft.genderForm.genderOther.trim()) {
      toast.error("Please specify your gender.");
      return;
    }
    if ((profileDraft.gender ?? null) !== (profileSnapshot.gender ?? null)) {
      payload.gender = resolvedGender;
    }
    if (profileDraft.image !== profileSnapshot.image) payload.image = profileDraft.image.trim();

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSavingProfile(true);
    try {
      const result = await doctorDashboardService.updateProfile(payload);
      const updated = (result.data ?? result) as DoctorProfile;
      setProfile(updated);
      const pForm: ProfileForm = {
        name: updated.name ?? "",
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        image: updated.image ?? "",
        gender: updated.gender ?? null,
        genderForm: parseDoctorGenderForForm(updated.gender),
      };
      setProfileDraft(pForm);
      setProfileSnapshot(pForm);
      refetchDashboard();

      if (payload.name || payload.email) {
        updateUser({
          id: user!.id,
          name: updated.name ?? user!.name,
          email: updated.email ?? user!.email,
          role: user!.role,
        });
      }

      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfessional = async () => {
    if (!professionalDraft || !professionalSnapshot) return;

    const payload: DoctorProfileUpdatePayload = {};
    if (professionalDraft.specialization !== professionalSnapshot.specialization) {
      payload.specialization = professionalDraft.specialization.trim();
    }
    if (professionalDraft.qualification !== professionalSnapshot.qualification) {
      payload.qualification = professionalDraft.qualification.trim();
    }
    if (professionalDraft.experience !== professionalSnapshot.experience) {
      payload.experience = professionalDraft.experience
        ? Number(professionalDraft.experience)
        : null;
    }
    if (professionalDraft.about !== professionalSnapshot.about) {
      payload.about = professionalDraft.about.trim();
    }
    if (professionalDraft.consultationFee !== professionalSnapshot.consultationFee) {
      payload.consultationFee = professionalDraft.consultationFee
        ? Number(professionalDraft.consultationFee)
        : null;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setSavingProfessional(true);
    try {
      const result = await doctorDashboardService.updateProfile(payload);
      const updated = (result.data ?? result) as DoctorProfile;
      setProfile(updated);
      const profForm: ProfessionalForm = {
        specialization: updated.specialization ?? "",
        qualification: updated.qualification ?? "",
        experience: String(updated.experience ?? ""),
        about: updated.about ?? "",
        consultationFee:
          updated.consultationFee != null ? String(updated.consultationFee) : "",
      };
      setProfessionalDraft(profForm);
      setProfessionalSnapshot(profForm);
      refetchDashboard();
      toast.success("Professional information saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save professional information.");
    } finally {
      setSavingProfessional(false);
    }
  };

  const handleSaveAvailability = async (payload: {
    availability: DoctorProfileUpdatePayload["availability"];
    availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
  }) => {
    await doctorDashboardService.updateProfile({
      availability: payload.availability,
      availabilityStatus: payload.availabilityStatus,
    });
    await loadProfile();
    refetchDashboard();
  };

  const avatarUrl = resolveUploadUrl(profileDraft?.image);
  const displayName = profileDraft?.name || user?.name || "Doctor";

  const renderProfile = () => {
    if (loading) return <LoadingCard />;
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
    if (!profileDraft) return null;

    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Personal information and contact details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
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
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{profileDraft.email}</p>
              {profileDraft.gender ? (
                <p className="text-xs text-muted-foreground">
                  Gender: {formatDoctorGender(profileDraft.gender)}
                </p>
              ) : null}
              {uploadingImage ? (
                <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doctor-name">Full Name</Label>
              <Input
                id="doctor-name"
                value={profileDraft.name}
                onChange={(e) =>
                  setProfileDraft((p) => (p ? { ...p, name: e.target.value } : p))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctor-email">Email</Label>
              <Input
                id="doctor-email"
                type="email"
                value={profileDraft.email}
                onChange={(e) =>
                  setProfileDraft((p) => (p ? { ...p, email: e.target.value } : p))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctor-phone">Phone</Label>
              <Input
                id="doctor-phone"
                type="tel"
                value={profileDraft.phone}
                onChange={(e) =>
                  setProfileDraft((p) => (p ? { ...p, phone: e.target.value } : p))
                }
              />
            </div>
            <div className="space-y-1.5">
              <DoctorGenderField
                value={profileDraft.gender}
                gender={profileDraft.genderForm.gender}
                genderOther={profileDraft.genderForm.genderOther}
                onChange={(next) =>
                  setProfileDraft((p) =>
                    p
                      ? {
                          ...p,
                          genderForm: next,
                          gender: resolveDoctorGenderFromForm(next.gender, next.genderOther),
                        }
                      : p,
                  )
                }
                required
                inputClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                labelClassName="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                idPrefix="doctor-settings-gender"
              />
            </div>
          </div>

          <Button type="button" onClick={() => void handleSaveProfile()} disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderProfessional = () => {
    if (loading) return <LoadingCard />;
    if (!professionalDraft) return null;

    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Professional Information</CardTitle>
              <CardDescription>Your credentials and practice details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={professionalDraft.specialization}
                onChange={(e) =>
                  setProfessionalDraft((p) =>
                    p ? { ...p, specialization: e.target.value } : p,
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qualification">Qualifications</Label>
              <Input
                id="qualification"
                value={professionalDraft.qualification}
                onChange={(e) =>
                  setProfessionalDraft((p) =>
                    p ? { ...p, qualification: e.target.value } : p,
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience">Experience (years)</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                value={professionalDraft.experience}
                onChange={(e) =>
                  setProfessionalDraft((p) =>
                    p ? { ...p, experience: e.target.value } : p,
                  )
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="consultation-fee">Consultation Fee</Label>
              <Input
                id="consultation-fee"
                type="number"
                min={0}
                step="0.01"
                value={professionalDraft.consultationFee}
                onChange={(e) =>
                  setProfessionalDraft((p) =>
                    p ? { ...p, consultationFee: e.target.value } : p,
                  )
                }
                placeholder="e.g. 150"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="about">About / Bio</Label>
              <Textarea
                id="about"
                rows={4}
                value={professionalDraft.about}
                onChange={(e) =>
                  setProfessionalDraft((p) => (p ? { ...p, about: e.target.value } : p))
                }
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleSaveProfessional()}
            disabled={savingProfessional}
          >
            {savingProfessional ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfile();
      case "professional":
        return renderProfessional();
      case "availability":
        return (
          <AvailabilityScheduleSection
            initialSchedule={profile?.availability ?? []}
            initialStatus={profile?.availability_status ?? "AVAILABLE"}
            onSave={handleSaveAvailability}
          />
        );
      case "security":
        return <ChangePasswordSection />;
      case "notifications":
        return <NotificationPreferencesSection role="doctor" />;
      case "appearance":
        return <AppearanceSection />;
      default:
        return null;
    }
  };

  return (
    <SettingsLayout
      title="Settings"
      subtitle="Manage your profile, schedule, and preferences"
      sections={SECTIONS}
      activeId={activeSection}
      onSelect={setActiveSection}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
