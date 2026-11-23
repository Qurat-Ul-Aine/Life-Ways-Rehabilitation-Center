import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Award, Users, TrendingUp, BadgeCheck, Wallet, ArrowLeft, UserRound } from "lucide-react";
import { fetchDoctorByIdFromAPI } from "@/data/doctors";
import type { Doctor } from "@/data/doctors";
import BookingForm from "@/components/BookingForm";
import DoctorAvailabilityPreview from "@/components/DoctorAvailabilityPreview";
import AuthGatedButton from "@/components/auth/AuthGatedButton";
import { buildLoginPath } from "@/lib/authRedirect";
import { useLoginGate } from "@/hooks/useLoginGate";
import { formatDoctorGender } from "@/features/doctor/utils/doctorGender";

const DoctorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [doctor, setDoctor] = useState<Doctor | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const { canAccessPatientFeatures } = useLoginGate();

  useEffect(() => {
    if (!id) return;
    fetchDoctorByIdFromAPI(id)
      .then(setDoctor)
      .finally(() => setLoading(false));
  }, [id]);

  const scrollToBooking = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (loading || !doctor || location.hash !== "#book") return undefined;
    const timer = window.setTimeout(scrollToBooking, 200);
    return () => window.clearTimeout(timer);
  }, [loading, doctor, location.hash]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <h1 className="text-3xl font-bold mb-3">Doctor not found</h1>
        <Link to="/doctors" className="text-primary font-semibold">← Back to Doctors</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <section className="bg-section-alt py-12">
        <div className="container mx-auto px-4">
          <Link to="/doctors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Doctors
          </Link>

          <div className="grid lg:grid-cols-[360px_1fr] gap-10 items-start">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl overflow-hidden shadow-card border border-border">
              <img src={doctor.image} alt={doctor.name} className="w-full aspect-square object-cover" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
                {doctor.specialty}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{doctor.name}</h1>
              <p className="text-muted-foreground mb-2">{doctor.qualifications}</p>
              {doctor.gender ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
                  <UserRound className="w-4 h-4" />
                  {formatDoctorGender(doctor.gender)}
                </p>
              ) : (
                <div className="mb-4" />
              )}

              <div className="grid grid-cols-1 gap-3 mb-7 max-w-xl sm:grid-cols-2">
                {[
                  { icon: Award, label: "Experience", value: `${doctor.experienceYears}+ years` },
                  { icon: Users, label: "Patients Treated", value: `${doctor.patientsTreated}+` },
                  { icon: TrendingUp, label: "Success Rate", value: `${doctor.successRate}%` },
                  { icon: Wallet, label: "Consultation Fee", value: `PKR ${doctor.consultationFee.toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="min-w-0 bg-card rounded-xl p-4 border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="break-words font-semibold text-sm">{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${doctor.available ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {doctor.available ? "Available Today" : "Currently Unavailable"}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5 break-words text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {doctor.location}
                </span>
              </div>

              <h2 className="font-heading text-xl font-bold mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{doctor.about}</p>

              <div className="flex flex-wrap gap-3">
                <AuthGatedButton
                  unstyled
                  onAllowedClick={scrollToBooking}
                  className="inline-block px-7 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                >
                  Book Appointment
                </AuthGatedButton>
                <a
                  href="#availability"
                  className="inline-block px-7 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
                >
                  Check Availability
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {canAccessPatientFeatures ? (
        <BookingForm doctor={doctor} />
      ) : (
        <div id="book" className="scroll-mt-24">
          <section className="bg-section-alt py-16">
            <div className="container mx-auto max-w-2xl px-4 text-center">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Schedule
              </span>
              <h2 className="mt-2 text-3xl font-bold md:text-4xl">Book Your Appointment</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to book a confirmed appointment with {doctor.name}.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  to={buildLoginPath("/login/patient", `${location.pathname}#book`)}
                  className="inline-block rounded-lg bg-primary px-7 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign in to Book
                </Link>
                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="inline-block rounded-lg border border-border px-7 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  View availability
                </button>
              </div>
            </div>
          </section>
          <DoctorAvailabilityPreview doctor={doctor} title="Available slots preview" />
        </div>
      )}
    </div>
  );
};

export default DoctorProfilePage;
