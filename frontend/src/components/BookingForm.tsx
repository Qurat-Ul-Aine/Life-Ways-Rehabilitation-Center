import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Doctor } from "@/data/doctors";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { usePatientContext } from "@/dashboard/patient/hooks/usePatientContext";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import type { Appointment } from "@/features/appointment/appointment.types";
import AppointmentReasonField from "@/features/appointment/components/AppointmentReasonField";
import {
  formatAppointmentReason,
  validateAppointmentReason,
  type AppointmentReasonOption,
} from "@/features/appointment/utils/appointmentReason";
import { doctorService } from "@/features/doctor/services/doctorService";
import { refreshPatientDashboard } from "@/features/patient/utils/patientDashboardRefresh";

interface Props {
  doctor?: Doctor;
  serviceName?: string;
  serviceSlug?: string;
}

function nextDays(count: number) {
  const out: { iso: string; label: string; weekday: string; day: string }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    out.push({
      iso: `${y}-${m}-${dayNum}`,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      day: String(d.getDate()),
    });
  }
  return out;
}

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

const BookingForm = ({ doctor, serviceName, serviceSlug }: Props) => {
  const { user } = useAuth();
  const { patientId, profile } = usePatientContext();
  const dates = nextDays(7);
  const initialServiceSlug = serviceSlug ?? services[0]?.slug ?? "";
  const initialService = services.find((s) => s.slug === initialServiceSlug);

  const [date, setDate] = useState(dates[0].iso);
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [visitMode, setVisitMode] = useState<"in-person" | "online">("in-person");
  const [selectedServiceSlug, setSelectedServiceSlug] = useState(initialServiceSlug);
  const [serviceOption, setServiceOption] = useState(initialService?.subServices?.[0] ?? "");
  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    gender: "",
    genderOther: "",
    email: "",
  });
  const [serviceOptionOther, setServiceOptionOther] = useState("");
  const [visitReason, setVisitReason] = useState<AppointmentReasonOption | "">("");
  const [visitReasonOther, setVisitReasonOther] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [doctorServiceSlugs, setDoctorServiceSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: profile?.fullName || user?.name || current.name,
      email: profile?.email || user?.email || current.email,
      phone: profile?.phone || current.phone,
      gender: profile?.gender
        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase()
        : current.gender,
    }));
  }, [user, profile]);

  useEffect(() => {
    if (!doctor?.id) {
      setDoctorServiceSlugs(null);
      return;
    }

    let cancelled = false;
    doctorService
      .getById(doctor.id)
      .then((detail) => {
        if (cancelled) return;
        const slugs = (detail.services ?? []).map((s) => s.slug).filter(Boolean);
        setDoctorServiceSlugs(slugs.length ? slugs : null);
        if (slugs.length && !slugs.includes(selectedServiceSlug)) {
          const first = slugs[0];
          setSelectedServiceSlug(first);
          const svc = services.find((s) => s.slug === first);
          setServiceOption(svc?.subServices?.[0] ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setDoctorServiceSlugs(null);
      });

    return () => {
      cancelled = true;
    };
  }, [doctor?.id]);

  const selectableServices = useMemo(() => {
    if (!doctorServiceSlugs?.length) return services;
    return services.filter((s) => doctorServiceSlugs.includes(s.slug));
  }, [doctorServiceSlugs]);

  const selectedService =
    selectableServices.find((s) => s.slug === selectedServiceSlug) ?? selectableServices[0] ?? services[0];
  const availableOptions = useMemo(() => {
    const base = selectedService?.subServices ?? [];
    return base.includes("Other") ? base : [...base, "Other"];
  }, [selectedService?.subServices]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === "serviceSlug") {
      const value = e.target.value;
      setSelectedServiceSlug(value);
      const nextService = services.find((service) => service.slug === value);
      setServiceOption(nextService?.subServices?.[0] ?? "");
      setServiceOptionOther("");
      return;
    }

    if (e.target.name === "serviceOption") {
      setServiceOption(e.target.value);
      if (e.target.value !== "Other") setServiceOptionOther("");
      return;
    }

    if (e.target.name === "gender") {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        gender: value,
        genderOther: value === "Other" ? f.genderOther : "",
      }));
      return;
    }

    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceOption) {
      toast.error("Please select a treatment program.");
      return;
    }

    if (serviceOption === "Other" && !serviceOptionOther.trim()) {
      toast.error("Please specify your treatment program.");
      return;
    }

    if (form.gender === "Other" && !form.genderOther.trim()) {
      toast.error("Please specify your gender.");
      return;
    }

    const reasonError = validateAppointmentReason(visitReason, visitReasonOther);
    if (reasonError) {
      toast.error(reasonError);
      return;
    }

    const resolvedTreatment =
      serviceOption === "Other" ? serviceOptionOther.trim() : serviceOption;
    const resolvedGender =
      form.gender === "Other" ? form.genderOther.trim() : form.gender;
    const resolvedReason = formatAppointmentReason(visitReason, visitReasonOther);

    if (!selectedServiceSlug) {
      toast.error("Please select a service category.");
      return;
    }

    if (!patientId) {
      toast.error("Please sign in as a patient to book and save this appointment to your dashboard.");
      return;
    }

    setSubmitting(true);
    try {
      const appointment = await appointmentService.create({
        patientId: patientId ?? "",
        patientName: form.name.trim() || profile?.fullName || user?.name || "Patient",
        doctorId: doctor?.id ?? "",
        doctorName: doctor?.name ?? "",
        serviceSlug: selectedServiceSlug,
        subService: resolvedTreatment,
        date,
        startTime: time,
        endTime: time,
        mode: visitMode === "online" ? "online" : "in-person",
        reason: resolvedReason,
        notes: `Visit type: ${visitMode === "online" ? "Telehealth" : "In-person"}. Treatment: ${resolvedTreatment}${serviceName ? ` (${serviceName})` : ""}.${resolvedGender ? ` Gender: ${resolvedGender}.` : ""} Booked via website.`,
        status: "scheduled",
      });

      setBooked(appointment);
      setConfirmed(true);
      refreshPatientDashboard();
      toast.success("Appointment booked successfully.");
      window.scrollTo({ top: document.getElementById("book")?.offsetTop ?? 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setConfirmed(false);
    setBooked(null);
  };

  if (confirmed && booked) {
    return (
      <section id="book" className="py-16 bg-section-alt">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-10 text-center shadow-card border border-border"
          >
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">
              Your appointment
              {booked.doctorName ? (
                <>
                  {" "}
                  with <strong className="text-foreground">{booked.doctorName}</strong>
                </>
              ) : null}{" "}
              for <strong className="text-foreground">{serviceOption}</strong> on{" "}
              <strong className="text-foreground">{booked.date}</strong> at{" "}
              <strong className="text-foreground">{booked.startTime}</strong> has been saved.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Reference: <span className="font-mono text-foreground">{booked.id.slice(0, 8)}…</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={resetBooking}
                className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Book another slot
              </button>
              <Link
                to="/patient/dashboard/appointments"
                state={{ refreshAppointments: true }}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                View my appointments
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <section id="book" className="py-20 bg-section-alt scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Schedule</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Book Your Appointment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your booking will appear in your patient dashboard, your doctor&apos;s schedule, and the admin panel.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <form onSubmit={submit} className="lg:col-span-2 bg-card rounded-2xl p-8 shadow-card border border-border space-y-7">
            {doctor && doctorServiceSlugs && doctorServiceSlugs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This doctor is not yet linked to a rehabilitation service in the system. Please contact
                the clinic or choose another doctor.
              </div>
            ) : null}

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <CalendarDays className="w-4 h-4 text-primary" /> Select Date
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {dates.map((d) => (
                  <button
                    type="button"
                    key={d.iso}
                    onClick={() => setDate(d.iso)}
                    className={`py-3 rounded-lg border text-center text-xs transition-all ${
                      date === d.iso
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold opacity-80">{d.weekday}</div>
                    <div className="text-base font-bold">{d.day}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Clock className="w-4 h-4 text-primary" /> Available Time Slots
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      time === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3">Service Type</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-muted-foreground">Service Category</span>
                  <select
                    name="serviceSlug"
                    value={selectedServiceSlug}
                    onChange={onChange}
                    disabled={Boolean(serviceSlug) || selectableServices.length <= 1}
                    className={inputClass}
                  >
                    {selectableServices.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-muted-foreground">Program / Treatment</span>
                  <select
                    name="serviceOption"
                    value={serviceOption}
                    onChange={onChange}
                    required
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a treatment
                    </option>
                    {availableOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {serviceOption === "Other" && (
                    <input
                      name="serviceOptionOther"
                      required
                      placeholder="Please specify your treatment"
                      value={serviceOptionOther}
                      onChange={(e) => setServiceOptionOther(e.target.value)}
                      className={`${inputClass} mt-2`}
                    />
                  )}
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3">Patient Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  name="name"
                  required
                  placeholder="Full Name"
                  value={form.name}
                  onChange={onChange}
                  className={inputClass}
                />
                <input
                  name="age"
                  type="number"
                  min="1"
                  placeholder="Age (optional)"
                  value={form.age}
                  onChange={onChange}
                  className={inputClass}
                />
                <input
                  name="phone"
                  required
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={onChange}
                  className={inputClass}
                />
                <div className="space-y-2">
                  <select name="gender" value={form.gender} onChange={onChange} className={inputClass}>
                    <option value="">Gender (optional)</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  {form.gender === "Other" && (
                    <input
                      name="genderOther"
                      required
                      placeholder="Please specify your gender"
                      value={form.genderOther}
                      onChange={onChange}
                      className={inputClass}
                    />
                  )}
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email"
                  value={form.email}
                  onChange={onChange}
                  className={`${inputClass} sm:col-span-2`}
                />
              </div>
            </div>

            <AppointmentReasonField
              id="public-book-reason"
              value={visitReason}
              otherValue={visitReasonOther}
              onValueChange={setVisitReason}
              onOtherValueChange={setVisitReasonOther}
            />

            <div>
              <h3 className="text-base font-semibold mb-3">Visit Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "in-person" as const, label: "In-person" },
                  { value: "online" as const, label: "Telehealth" },
                ]).map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setVisitMode(option.value)}
                    className={`py-3 rounded-lg border text-sm font-semibold transition-all ${
                      visitMode === option.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-base disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking…
                </>
              ) : (
                "Confirm Booking"
              )}
            </button>
          </form>

          <aside className="bg-card rounded-2xl p-6 shadow-card border border-border lg:sticky lg:top-24">
            <h3 className="font-heading text-lg font-bold mb-4">Booking Summary</h3>
            <div className="space-y-3 text-sm">
              {doctor && (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Doctor</span>
                    <span className="font-medium text-right">{doctor.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Speciality</span>
                    <span className="font-medium text-right">{doctor.specialty}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium text-right">{selectedService.title}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Program</span>
                <span className="font-medium text-right">{serviceOption || "Not chosen"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{date}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{time}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Visit type</span>
                <span className="font-medium">{visitMode === "online" ? "Telehealth" : "In-person"}</span>
              </div>
              <hr className="border-border my-3" />
              <div className="flex justify-between text-base font-bold">
                <span>Consultation Fee</span>
                <span className="text-primary">
                  {doctor ? `PKR ${doctor.consultationFee.toLocaleString()}` : "TBD"}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default BookingForm;
