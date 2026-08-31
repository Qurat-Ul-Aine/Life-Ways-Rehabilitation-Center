import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchDoctorByIdFromAPI, fetchDoctorsFromAPI } from "@/data/doctors";
import type { Doctor } from "@/data/doctors";
import BookingForm from "@/components/BookingForm";

/** Public appointment booking — no login required (screening CTAs, marketing pages). */
export default function PublicBookAppointmentPage() {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId");
  const [doctor, setDoctor] = useState<Doctor | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (doctorId) {
          const row = await fetchDoctorByIdFromAPI(doctorId);
          if (!cancelled) setDoctor(row);
          return;
        }
        const doctors = await fetchDoctorsFromAPI();
        const preferred = doctors.find((d) => d.available) ?? doctors[0];
        if (!cancelled) setDoctor(preferred);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="mb-8">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Schedule</span>
          <h1 className="mt-2 text-3xl font-bold">Book Your Appointment</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a date and time to schedule your visit. No account required.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading booking form...</p>
        ) : doctor ? (
          <div id="book" className="scroll-mt-24">
            <BookingForm doctor={doctor} />
          </div>
        ) : (
          <p className="text-sm text-destructive">
            No doctors available for booking.{" "}
            <Link to="/doctors" className="underline">
              Browse doctors
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
