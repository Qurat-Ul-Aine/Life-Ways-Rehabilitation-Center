import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getServiceBySlug } from "@/data/services";
import BookingForm from "@/components/BookingForm";
import DoctorAvailabilityPreview from "@/components/DoctorAvailabilityPreview";
import AuthGatedButton from "@/components/auth/AuthGatedButton";
import { useLoginGate } from "@/hooks/useLoginGate";

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const service = getServiceBySlug(slug || "");
  const { canAccessPatientFeatures } = useLoginGate();

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-3xl font-bold mb-4">Service Not Found</h1>
        <p className="text-muted-foreground mb-6">The service you're looking for doesn't exist.</p>
        <Link to="/" className="text-primary font-semibold hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const Icon = service.icon;

  return (
    <div className="min-h-dvh">
      {/* Hero Banner */}
      <section className="bg-hero-gradient py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/#services"
              className="inline-flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Services
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold !text-primary-foreground">{service.title}</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl text-lg">{service.shortDesc}</p>
          </motion.div>
        </div>
      </section>

      {/* Full Description */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6">About This Service</h2>
            <p className="text-muted-foreground leading-relaxed text-base">{service.fullDescription}</p>
          </motion.div>
        </div>
      </section>

      {/* Sub-Services */}
      <section className="py-16 bg-section-alt">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Treatments & Programs</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.subServices.map((sub, i) => (
                <motion.div
                  key={sub}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 bg-card rounded-lg p-4 shadow-card"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium text-sm">{sub}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {canAccessPatientFeatures ? (
        <BookingForm serviceName={service.title} serviceSlug={service.slug} />
      ) : (
        <>
          <DoctorAvailabilityPreview title={`${service.title} — Availability`} />
          <section className="pb-20 bg-section-alt">
            <div className="container mx-auto px-4 text-center">
              <AuthGatedButton
                className="px-8 py-3.5 h-auto text-base font-semibold"
                onAllowedClick={() => {
                  document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Book Appointment
              </AuthGatedButton>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ServiceDetail;
