import { motion } from "framer-motion";
import { Link } from "react-router-dom";import heroBg from "@/assets/hero-bg.jpg";
import { useBookAppointmentNavigation } from "@/hooks/useBookAppointmentNavigation";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

const Hero = () => {
  const { hospitalName } = useHospitalContact();  const { bookAppointment } = useBookAppointmentNavigation({ gatePatientLogin: true });
  const titleParts = hospitalName.includes(" ")
    ? [hospitalName.split(" ").slice(0, 2).join(" "), hospitalName.split(" ").slice(2).join(" ")]
    : [hospitalName, ""];

  return (
    <section id="home" className="relative min-h-[88dvh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="Rehabilitation center" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-overlay" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-32">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl">
          <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/25 text-primary-foreground text-sm font-medium backdrop-blur-sm">
            Healing Starts Here
          </span>
          <h1 className="mb-6 text-3xl font-bold leading-tight text-primary-foreground sm:text-5xl md:text-6xl">
            {titleParts[1] ? (
              <>
                {titleParts[0]} <br /> {titleParts[1]}
              </>
            ) : (
              hospitalName
            )}
          </h1>
          <p className="text-lg md:text-xl mb-8 text-primary-foreground/85 max-w-lg">
            Comprehensive care for addiction therapy, neurodiversity support, psychological training, and physiotherapy — locally and internationally.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <button
              type="button"
              onClick={bookAppointment}
              className="min-h-11 w-full rounded-lg bg-primary px-7 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Book Appointment
            </button>
            <Link to="/find-my-doctor" className="min-h-11 w-full rounded-lg bg-primary px-7 py-3 text-center font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto">
              Find My Doctor
            </Link>
            <Link to="/doctors" className="min-h-11 w-full rounded-lg border border-primary-foreground/40 px-7 py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:w-auto">
              View Doctors
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
