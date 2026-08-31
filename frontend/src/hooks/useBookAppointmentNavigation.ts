import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDoctorsFromAPI } from "@/data/doctors";
import { buildLoginPath } from "@/lib/authRedirect";
import { useLoginGate } from "@/hooks/useLoginGate";

type Options = {
  /** When true, unauthenticated users are sent to patient login with returnTo set to the booking page. */
  gatePatientLogin?: boolean;
};

/** Shared navigation for public "Book Appointment" actions (Home hero, screening result, etc.). */
export function useBookAppointmentNavigation(options: Options = {}) {
  const navigate = useNavigate();
  const { canAccessPatientFeatures } = useLoginGate();
  const [bookingDoctorId, setBookingDoctorId] = useState<string | null>(null);

  useEffect(() => {
    void fetchDoctorsFromAPI().then((doctors) => {
      const preferred = doctors.find((d) => d.available) ?? doctors[0];
      setBookingDoctorId(preferred?.id ?? null);
    });
  }, []);

  const bookAppointment = useCallback(() => {
    const target = bookingDoctorId
      ? `/appointments/book?doctorId=${encodeURIComponent(bookingDoctorId)}`
      : "/appointments/book";

    if (options.gatePatientLogin && !canAccessPatientFeatures) {
      navigate(buildLoginPath("/login/patient", target));
      return;
    }

    navigate(target);
  }, [bookingDoctorId, canAccessPatientFeatures, navigate, options.gatePatientLogin]);

  return { bookAppointment };
}
