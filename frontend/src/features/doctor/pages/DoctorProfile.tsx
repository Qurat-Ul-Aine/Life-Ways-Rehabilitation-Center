import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Pencil, Phone, Trash2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { doctorService } from "../services/doctorService";
import type { Doctor } from "../doctor.types";
import { formatDoctorGender } from "../utils/doctorGender";

const getInitials = (name?: string) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "DR";

const DoctorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    doctorService
      .getById(id)
      .then(setDoctor)
      .catch(() => setError("Doctor not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await doctorService.remove(id);
      navigate("/admin/doctors");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Failed to delete doctor.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading doctor profile...</p>
    );
  }

  if (error || !doctor) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? "Doctor not found."}</p>
        <Button variant="outline" onClick={() => navigate("/admin/doctors")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to doctors
        </Button>
      </div>
    );
  }

  const imageUrl = doctor.image ? resolveUploadUrl(doctor.image) : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Care team"
        title={doctor.name ?? "Doctor profile"}
        subtitle={`${doctor.specialization || "No specialization"} • ${doctor.role ?? "Doctor"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/doctors")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/doctors/edit/${doctor.id}`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:p-8">
          <Avatar className="h-24 w-24 shrink-0 rounded-2xl border border-border">
            {imageUrl ? <AvatarImage src={imageUrl} alt={doctor.name} className="object-cover" /> : null}
            <AvatarFallback className="rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {getInitials(doctor.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={doctor.is_approved ? "default" : "secondary"}>
                {doctor.is_approved ? "Approved" : "Pending approval"}
              </Badge>
              <Badge variant={doctor.is_active ? "outline" : "destructive"}>
                {doctor.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {doctor.about ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{doctor.about}</p>
            ) : null}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {doctor.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  {doctor.email}
                </span>
              ) : null}
              {doctor.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0" />
                  {doctor.phone}
                </span>
              ) : null}
              {doctor.gender ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-4 w-4 shrink-0" />
                  {formatDoctorGender(doctor.gender)}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="License no." value={doctor.license_no || "—"} mono />
        <InfoCard label="Gender" value={formatDoctorGender(doctor.gender)} />
        <InfoCard label="Qualification" value={doctor.qualification || "—"} />
        <InfoCard label="Experience" value={doctor.experience ? `${doctor.experience} years` : "—"} />
        <InfoCard
          label="Consultation fee"
          value={
            doctor.consultationFee
              ? `PKR ${Number(doctor.consultationFee).toLocaleString()}`
              : "—"
          }
        />
        <InfoCard
          label="Patients treated"
          value={doctor.patientsTreated ? `${doctor.patientsTreated}+` : "—"}
        />
        <InfoCard
          label="Success rate"
          value={doctor.successRate ? `${doctor.successRate}%` : "—"}
        />
        {doctor.rating ? <InfoCard label="Rating" value={`${doctor.rating} / 5`} /> : null}
      </div>

      {(doctor.availability?.length ?? 0) > 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Availability schedule</CardTitle>
            <CardDescription>Weekly consultation hours</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {doctor.availability!.map((slot, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{slot.day}</span>
                <span className="text-muted-foreground">{slot.hours}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete doctor?"
        description={`This permanently removes Dr. ${doctor.name} and their user account. This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete doctor"}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

const InfoCard = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <Card className="border-border/80 shadow-sm">
    <CardContent className="px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

export default DoctorProfile;
