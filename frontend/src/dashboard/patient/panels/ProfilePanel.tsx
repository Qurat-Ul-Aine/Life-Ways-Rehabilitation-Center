import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  Camera,
  KeyRound,
  Lock,
  Pencil,
  RefreshCw,
  Upload,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import {
  getLocalTodayDate,
  normalizePersonName,
  normalizePhone,
  validateDateOfBirth,
  validatePersonName,
  validatePhone,
} from "@/lib/validation";
import { patientService, type PatientMeProfile, type PatientProfileUpdate } from "@/features/patient/services/patientService";
import { usePatientContext } from "../hooks/usePatientContext";

type ProfileForm = {
  fullName: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  bloodGroup: string;
  address: string;
  condition: string;
  allergies: string;
  aboutMe: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profileImageUrl: string;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const toDateInput = (value?: string | null): string => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const toForm = (profile: PatientMeProfile): ProfileForm => ({
  fullName: profile.fullName ?? "",
  phone: profile.phone ?? "",
  gender: profile.gender ?? "",
  dateOfBirth: toDateInput(profile.dateOfBirth),
  nationality: profile.nationality ?? "",
  bloodGroup: profile.bloodGroup ?? "",
  address: profile.address ?? "",
  condition: profile.condition ?? profile.primaryDiagnosis ?? "",
  allergies: profile.allergies ?? "",
  aboutMe: profile.aboutMe ?? "",
  emergencyContactName: profile.emergencyContactName ?? "",
  emergencyContactPhone: profile.emergencyContactPhone ?? "",
  profileImageUrl: profile.profileImageUrl ?? "",
});

const buildPayload = (draft: ProfileForm, snapshot: ProfileForm): PatientProfileUpdate => {
  const payload: PatientProfileUpdate = {};
  if (draft.fullName !== snapshot.fullName) payload.name = draft.fullName.trim();
  if (draft.phone !== snapshot.phone) payload.phone = draft.phone.trim() || null;
  if (draft.gender !== snapshot.gender) payload.gender = draft.gender || null;
  if (draft.dateOfBirth !== snapshot.dateOfBirth) payload.dateOfBirth = draft.dateOfBirth || null;
  if (draft.nationality !== snapshot.nationality) payload.nationality = draft.nationality.trim() || null;
  if (draft.bloodGroup !== snapshot.bloodGroup) payload.bloodGroup = draft.bloodGroup.trim() || null;
  if (draft.address !== snapshot.address) payload.address = draft.address.trim() || null;
  if (draft.allergies !== snapshot.allergies) payload.allergies = draft.allergies.trim() || null;
  if (draft.aboutMe !== snapshot.aboutMe) payload.aboutMe = draft.aboutMe.trim() || null;
  if (draft.emergencyContactName !== snapshot.emergencyContactName) {
    payload.emergencyContactName = draft.emergencyContactName.trim() || null;
  }
  if (draft.emergencyContactPhone !== snapshot.emergencyContactPhone) {
    payload.emergencyContactPhone = draft.emergencyContactPhone.trim() || null;
  }
  if (draft.profileImageUrl !== snapshot.profileImageUrl) {
    payload.profileImageUrl = draft.profileImageUrl.trim() || null;
  }
  return payload;
};

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
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
        <span className="truncate text-sm text-foreground">{value || "—"}</span>
      </div>
    </div>
  );
}

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const { profile: contextProfile, loading: contextLoading, error: contextError, refetch } =
    usePatientContext();

  const [profile, setProfile] = useState<PatientMeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draft, setDraft] = useState<ProfileForm | null>(null);
  const [snapshot, setSnapshot] = useState<ProfileForm | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getMe();
      setProfile(data);
      const form = toForm(data);
      setDraft(form);
      if (!isEditing) setSnapshot(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, [isEditing]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile && !isEditing) {
      const form = toForm(profile);
      setDraft(form);
      setSnapshot(form);
    }
  }, [profile, isEditing]);

  const displayProfile = profile ?? (contextProfile
    ? ({
        ...contextProfile,
        primaryDiagnosis: contextProfile.condition,
        profileImageUrl: contextProfile.profileImageUrl ?? null,
        aboutMe: contextProfile.aboutMe ?? null,
        allergies: contextProfile.allergies ?? null,
        bloodGroup: contextProfile.bloodGroup ?? null,
      } as PatientMeProfile)
    : null);

  const handleStartEdit = () => {
    if (!displayProfile || !draft) return;
    setSnapshot(draft);
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (snapshot) setDraft(snapshot);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!draft || !snapshot) return;

    const payload = buildPayload(draft, snapshot);
    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      setIsEditing(false);
      return;
    }

    const validationErrors = [
      payload.name !== undefined ? validatePersonName(payload.name) : null,
      payload.phone ? validatePhone(payload.phone) : null,
      payload.dateOfBirth ? validateDateOfBirth(payload.dateOfBirth) : null,
      payload.emergencyContactPhone
        ? validatePhone(payload.emergencyContactPhone)
        : null,
    ];
    const validationError = validationErrors.find(Boolean);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (payload.name !== undefined) payload.name = normalizePersonName(payload.name);
    if (payload.phone) payload.phone = normalizePhone(payload.phone);
    if (payload.emergencyContactPhone) {
      payload.emergencyContactPhone = normalizePhone(payload.emergencyContactPhone);
    }

    setIsSaving(true);
    try {
      const updated = await patientService.updateMe(payload);
      setProfile(updated);
      const form = toForm(updated);
      setDraft(form);
      setSnapshot(form);
      setIsEditing(false);
      refetch();

      if (payload.name && user) {
        updateUser({ ...user, name: updated.fullName });
      }

      toast.success("Profile saved successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      toast.error("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }

    setUploadingImage(true);
    try {
      const { url, profile: updated } = await patientService.uploadProfileImage(file);
      setProfile(updated);
      const form = toForm(updated);
      setDraft(form);
      setSnapshot(form);
      refetch();
      toast.success("Profile photo updated.");
      if (!url) return;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (!draft) return;
    setDraft((d) => (d ? { ...d, profileImageUrl: "" } : d));
    if (!isEditing) {
      setIsSaving(true);
      try {
        const updated = await patientService.updateMe({ profileImageUrl: null });
        setProfile(updated);
        const form = toForm(updated);
        setDraft(form);
        setSnapshot(form);
        refetch();
        toast.success("Profile photo removed.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove photo.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (loading || contextLoading) return <ProfileSkeleton />;

  if (error || contextError) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold text-foreground">Could not load profile</p>
          <p className="text-sm text-muted-foreground">{error ?? contextError}</p>
          <Button type="button" variant="outline" onClick={() => void loadProfile()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!displayProfile || !draft) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <UserCircle className="h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-foreground">No profile found</p>
          <p className="text-sm text-muted-foreground">
            We could not find your patient record. Please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  const avatarSrc = resolveUploadUrl(draft.profileImageUrl);

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-0 pt-4 sm:px-6">
          <CardTitle className="text-base font-semibold">My Profile</CardTitle>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleStartEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="h-8" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6 px-4 pb-6 pt-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={draft.fullName} /> : null}
                  <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                    {getInitials(draft.fullName || displayProfile.fullName)}
                  </AvatarFallback>
                </Avatar>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
                    aria-label="Change profile photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleImageUpload(e)}
              />

              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingImage ? "Uploading…" : "Change photo"}
                </Button>
                {isEditing && draft.profileImageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => void handleRemoveImage()}
                  >
                    Remove photo
                  </Button>
                ) : null}
                <p className="text-center text-[11px] text-muted-foreground">JPG, PNG, WebP — max 5MB</p>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-xl font-semibold text-foreground">{displayProfile.fullName}</h2>
              <p className="text-sm text-muted-foreground">{displayProfile.email}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="capitalize">
                  {displayProfile.status || "active"}
                </Badge>
                {displayProfile.assignedDoctorName ? (
                  <span className="text-xs text-muted-foreground">
                    Assigned doctor: {displayProfile.assignedDoctorName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Personal information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing ? (
                <>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={draft.fullName}
                      onChange={(e) => setDraft((d) => (d ? { ...d, fullName: e.target.value } : d))}
                    />
                  </div>
                  <ReadOnlyField label="Email" value={displayProfile.email} />
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={draft.phone}
                      onChange={(e) => setDraft((d) => (d ? { ...d, phone: e.target.value } : d))}
                      placeholder="+92 300 0000000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select
                      value={draft.gender || "other"}
                      onValueChange={(v) => setDraft((d) => (d ? { ...d, gender: v } : d))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      max={getLocalTodayDate()}
                      value={draft.dateOfBirth}
                      onChange={(e) => setDraft((d) => (d ? { ...d, dateOfBirth: e.target.value } : d))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={draft.nationality}
                      onChange={(e) => setDraft((d) => (d ? { ...d, nationality: e.target.value } : d))}
                      placeholder="Pakistani"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bloodGroup">Blood group</Label>
                    <Select
                      value={draft.bloodGroup || "unknown"}
                      onValueChange={(v) =>
                        setDraft((d) => (d ? { ...d, bloodGroup: v === "unknown" ? "" : v } : d))
                      }
                    >
                      <SelectTrigger id="bloodGroup">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Not specified</SelectItem>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>
                            {bg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address">Home address</Label>
                    <Textarea
                      id="address"
                      value={draft.address}
                      onChange={(e) => setDraft((d) => (d ? { ...d, address: e.target.value } : d))}
                      rows={2}
                      placeholder="Street, city, province"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Full name</p>
                    <p className="text-sm text-foreground">{displayProfile.fullName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{displayProfile.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm text-foreground">{displayProfile.phone || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="text-sm capitalize text-foreground">{displayProfile.gender || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date of birth</p>
                    <p className="text-sm text-foreground">
                      {draft.dateOfBirth
                        ? new Date(`${draft.dateOfBirth}T12:00:00`).toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="text-sm text-foreground">{displayProfile.nationality || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Blood group</p>
                    <p className="text-sm text-foreground">{displayProfile.bloodGroup || "—"}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Home address</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{displayProfile.address || "—"}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Health & care details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing ? (
                <>
                  <div className="space-y-1.5 sm:col-span-2">
                    <ReadOnlyField
                      label="Primary condition / diagnosis"
                      value={displayProfile.condition || displayProfile.primaryDiagnosis || "Set by your care team"}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={draft.allergies}
                      onChange={(e) => setDraft((d) => (d ? { ...d, allergies: e.target.value } : d))}
                      rows={2}
                      placeholder="Medication or food allergies"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="aboutMe">About me / additional notes</Label>
                    <Textarea
                      id="aboutMe"
                      value={draft.aboutMe}
                      onChange={(e) => setDraft((d) => (d ? { ...d, aboutMe: e.target.value } : d))}
                      rows={4}
                      placeholder="Share anything your care team should know"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Primary condition</p>
                    <p className="text-sm text-foreground">
                      {displayProfile.condition || displayProfile.primaryDiagnosis || "—"}
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Allergies</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {displayProfile.allergies?.trim() || "None recorded"}
                    </p>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">About me</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {displayProfile.aboutMe?.trim() || "No additional notes yet."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Emergency contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ecName">Contact name</Label>
                    <Input
                      id="ecName"
                      value={draft.emergencyContactName}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, emergencyContactName: e.target.value } : d))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ecPhone">Contact phone</Label>
                    <Input
                      id="ecPhone"
                      value={draft.emergencyContactPhone}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, emergencyContactPhone: e.target.value } : d))
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Contact name</p>
                    <p className="text-sm text-foreground">{displayProfile.emergencyContactName || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Contact phone</p>
                    <p className="text-sm text-foreground">{displayProfile.emergencyContactPhone || "—"}</p>
                  </div>
                </>
              )}
            </div>
          </section>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="px-4 pb-0 pt-4 sm:px-6">
          <CardTitle className="text-sm font-semibold">Account security</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 pt-4 sm:px-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Keep your account secure by using a strong password and updating it regularly.
          </p>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/change-password">
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
