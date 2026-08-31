import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, ImageIcon } from "lucide-react";
import type { Doctor, DoctorInput, DoctorRole } from "../doctor.types";
import { useDoctors } from "../hooks/useDoctors";
import { doctorService } from "../services/doctorService";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import type { RehabilitationService } from "@/features/appointment/appointment.types";
import api from "@/lib/api";
import DoctorGenderField, { resolveDoctorGenderFromForm } from "./DoctorGenderField";
import {
  parseDoctorGenderForForm,
  type DoctorGenderFormState,
} from "../utils/doctorGender";

const ROLES: DoctorRole[] = ["Doctor", "Therapist", "Psychologist", "Consultant"];

const SPECIALIZATIONS = [
  "Psychiatry",
  "Clinical Psychology",
  "Cognitive Behavioral Therapy",
  "General Medicine",
  "Addiction Recovery",
  "Neurodiversity Care",
  "Physiotherapy",
];

const DEFAULT_AVAILABILITY = [
  { day: "Monday", hours: "09:00 - 17:00" },
  { day: "Tuesday", hours: "09:00 - 17:00" },
  { day: "Wednesday", hours: "09:00 - 17:00" },
  { day: "Thursday", hours: "09:00 - 17:00" },
  { day: "Friday", hours: "09:00 - 17:00" },
];

const emptyForm = (): DoctorInput => ({
  name: "",
  email: "",
  phone: "",
  license_no: "",
  specialization: SPECIALIZATIONS[0],
  qualification: "",
  role: "Doctor",
  experience: 1,
  consultationFee: null,
  patientsTreated: null,
  successRate: null,
  gender: null,
  image: "",
  about: "",
  availability: DEFAULT_AVAILABILITY,
});

const emptyGenderForm = (): DoctorGenderFormState => ({
  gender: "",
  genderOther: "",
});

const fromDoctor = (d: Doctor): DoctorInput => ({
  name: d.name ?? "",
  email: d.email ?? "",
  phone: d.phone ?? "",
  license_no: d.license_no ?? "",
  specialization: d.specialization ?? SPECIALIZATIONS[0],
  qualification: d.qualification ?? "",
  role: d.role ?? "Doctor",
  experience: d.experience ?? 1,
  consultationFee: d.consultationFee ?? null,
  patientsTreated: d.patientsTreated ?? null,
  successRate: d.successRate ?? null,
  gender: d.gender ?? null,
  image: d.image ?? "",
  about: d.about ?? "",
  availability: d.availability?.length ? d.availability : DEFAULT_AVAILABILITY,
});

interface Props {
  initial?: Doctor;
  mode: "add" | "edit";
}

const DoctorForm = ({ initial, mode }: Props) => {
  const navigate = useNavigate();
  const { create, update } = useDoctors();
  const [form, setForm] = useState<DoctorInput>(
    initial ? fromDoctor(initial) : emptyForm()
  );
  const [genderForm, setGenderForm] = useState<DoctorGenderFormState>(
    initial ? parseDoctorGenderForForm(initial.gender) : emptyGenderForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [devLoginUrl, setDevLoginUrl] = useState<string | null>(null);
  const [devTemporaryPassword, setDevTemporaryPassword] = useState<string | null>(null);

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string>(initial?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allServices, setAllServices] = useState<RehabilitationService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    initial?.services?.map((s) => s.id) ?? [],
  );

  useEffect(() => {
    appointmentService
      .listServices()
      .then(setAllServices)
      .catch(() => setAllServices([]));
  }, []);

  useEffect(() => {
    if (initial) {
      setForm(fromDoctor(initial));
      setGenderForm(parseDoctorGenderForForm(initial.gender));
      setImagePreview(initial.image ?? "");
      setSelectedServiceIds(initial.services?.map((s) => s.id) ?? []);
    }
  }, [initial]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const set = <K extends keyof DoctorInput>(k: K, v: DoctorInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setAvailDay = (i: number, field: "day" | "hours", val: string) => {
    const next = form.availability.map((a, idx) =>
      idx === i ? { ...a, [field]: val } : a
    );
    set("availability", next);
  };

  // ── Image Upload Handler ──────────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary via backend
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/upload/doctor-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success && data.url) {
        set("image", data.url);
      } else {
        setUploadError("Upload failed. Try again.");
      }
    } catch {
      setUploadError("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    set("image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Form Submit ───────────────────────────────────────────────────────────
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteNotice(null);
    setDevLoginUrl(null);
    setDevTemporaryPassword(null);
    setSubmitting(true);
    try {
      const resolvedGender = resolveDoctorGenderFromForm(
        genderForm.gender,
        genderForm.genderOther,
      );
      if (!resolvedGender) {
        setError("Please select gender.");
        setSubmitting(false);
        return;
      }
      if (genderForm.gender === "other" && !genderForm.genderOther.trim()) {
        setError("Please specify gender.");
        setSubmitting(false);
        return;
      }

      const payload: DoctorInput = { ...form, gender: resolvedGender };

      if (mode === "add") {
        const d = await create(payload);
        if (selectedServiceIds.length) {
          await doctorService.setServices(d.id, selectedServiceIds);
        }
        setSuccess(true);
        setInviteNotice(
          "Doctor created. Login email and temporary password have been sent to the doctor.",
        );
        if (import.meta.env.DEV) {
          setDevLoginUrl(d.devLoginUrl ?? null);
          setDevTemporaryPassword(d.devTemporaryPassword ?? null);
        }
        setTimeout(() => navigate(`/admin/doctors/${d.id}`), 1800);
      } else if (initial) {
        await update(initial.id, payload);
        await doctorService.setServices(initial.id, selectedServiceIds);
        setSuccess(true);
        setTimeout(() => navigate(`/admin/doctors/${initial.id}`), 800);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const cls = {
    input: "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50",
    label: "block text-sm font-semibold mb-1.5 text-foreground",
    section: "space-y-4",
  };

  return (
    <form onSubmit={submit} className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border space-y-8">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-500/10 text-green-700 text-sm font-medium">
          {mode === "add"
            ? inviteNotice ?? "Doctor added successfully! Redirecting..."
            : "Changes saved successfully!"}
        </div>
      )}
      {import.meta.env.DEV && (devLoginUrl || devTemporaryPassword) ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
          <p className="font-semibold">Development only — doctor login details</p>
          {devTemporaryPassword ? (
            <p className="mt-2">
              Temporary password: <span className="font-mono font-semibold">{devTemporaryPassword}</span>
            </p>
          ) : null}
          {devLoginUrl ? (
            <p className="mt-1 break-all font-mono text-xs">{devLoginUrl}</p>
          ) : null}
        </div>
      ) : null}

      {mode === "add" ? (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          A secure temporary password is generated automatically and emailed to the doctor with
          their login email and a link to the doctor portal.
        </div>
      ) : null}

      {/* ── Basic Info ── */}
      <div className={cls.section}>
        <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
          Basic Information
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={cls.label}>Full Name *</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={cls.input} placeholder="Dr. John Smith" />
          </div>
          <div>
            <label className={cls.label}>Email *</label>
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cls.input} placeholder="doctor@lifewaysrehab.com" />
          </div>
          <div>
            <label className={cls.label}>Phone *</label>
            <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={cls.input} placeholder="+92 300 0000000" />
          </div>
          <div>
            <label className={cls.label}>License Number *</label>
            <input required value={form.license_no} onChange={(e) => set("license_no", e.target.value)} className={cls.input} placeholder="PMC-12345" />
          </div>
          <div>
            <DoctorGenderField
              value={form.gender}
              gender={genderForm.gender}
              genderOther={genderForm.genderOther}
              onChange={(next) => {
                setGenderForm(next);
                set("gender", resolveDoctorGenderFromForm(next.gender, next.genderOther));
              }}
              required
              inputClassName={cls.input}
              labelClassName={cls.label}
              idPrefix="admin-doctor-gender"
            />
          </div>
        </div>
      </div>

      {/* ── Professional Info ── */}
      <div className={cls.section}>
        <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
          Professional Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={cls.label}>Role *</label>
            <select value={form.role} onChange={(e) => set("role", e.target.value as DoctorRole)} className={cls.input}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={cls.label}>Specialization *</label>
            <select value={form.specialization} onChange={(e) => set("specialization", e.target.value)} className={cls.input}>
              {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={cls.label}>Qualification</label>
            <input value={form.qualification ?? ""} onChange={(e) => set("qualification", e.target.value)} className={cls.input} placeholder="MBBS, MD, PhD..." />
          </div>
          <div>
            <label className={cls.label}>Experience (years) *</label>
            <input required type="number" min={0} max={60} value={form.experience} onChange={(e) => set("experience", Number(e.target.value))} className={cls.input} />
          </div>
          <div>
            <label className={cls.label}>Consultation Fee (PKR)</label>
            <input
              type="number" min={0}
              value={form.consultationFee ?? ""}
              onChange={(e) => set("consultationFee", e.target.value ? Number(e.target.value) : null)}
              className={cls.input} placeholder="2000"
            />
          </div>
          <div>
            <label className={cls.label}>Patients Treated</label>
            <input
              type="number" min={0}
              value={form.patientsTreated ?? ""}
              onChange={(e) => set("patientsTreated", e.target.value ? Number(e.target.value) : null)}
              className={cls.input} placeholder="500"
            />
          </div>
          <div>
            <label className={cls.label}>Success Rate (%)</label>
            <input
              type="number" min={0} max={100}
              value={form.successRate ?? ""}
              onChange={(e) => set("successRate", e.target.value ? Number(e.target.value) : null)}
              className={cls.input} placeholder="92"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={cls.label}>About / Bio</label>
            <textarea rows={3} value={form.about ?? ""} onChange={(e) => set("about", e.target.value)} className={cls.input + " resize-none"} placeholder="Brief professional background..." />
          </div>
        </div>
      </div>

      {/* ── Profile Image Upload ── */}
      <div className={cls.section}>
        <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
          Profile Image
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpg,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageChange}
        />

        {imagePreview ? (
          <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-border shadow-sm">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">Uploading...</span>
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center hover:opacity-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-36 h-36 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors gap-2"
          >
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Upload Photo</span>
          </button>
        )}

        {!imagePreview && !uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Upload className="w-4 h-4" />
            Choose Image
          </button>
        )}

        {uploadError && (
          <p className="text-sm text-destructive font-medium">{uploadError}</p>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5MB</p>
      </div>

      {allServices.length > 0 && (
        <div className={cls.section}>
          <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
            Rehabilitation Services
          </h3>
          <p className="text-sm text-muted-foreground">
            Assign one or more programs this doctor can treat. Patients booking those services will be
            routed to assigned doctors.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {allServices.map((service) => (
              <label
                key={service.id}
                className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedServiceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                />
                <span className="text-sm">
                  <span className="font-medium block">{service.title}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Availability ── */}
      <div className={cls.section}>
        <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
          Availability Schedule
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {form.availability.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={a.day} onChange={(e) => setAvailDay(i, "day", e.target.value)} className={cls.input + " flex-1"} placeholder="Day" />
              <input value={a.hours} onChange={(e) => setAvailDay(i, "hours", e.target.value)} className={cls.input + " flex-1"} placeholder="09:00 - 17:00" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting || uploading} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {submitting ? "Saving..." : mode === "add" ? "Add Doctor" : "Save Changes"}
        </button>
        <button type="button" onClick={() => navigate("/admin/doctors")} className="px-6 py-2.5 rounded-lg border border-border font-semibold hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default DoctorForm;