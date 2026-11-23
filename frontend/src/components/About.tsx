import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

const highlights = [
  "Experienced doctors & therapists",
  "Serving patients locally & internationally",
  "Personalized recovery programs",
  "24/7 dedicated nursing care",
  "Compassionate & confidential environment",
  "Evidence-based therapy methods",
];

const About = () => {
  const { hospitalName } = useHospitalContact();

  return (
  <section id="about" className="py-24">
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">About Us</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">Empowering Recovery, <br /> Restoring Lives</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {hospitalName} is a leading healthcare facility in Islamabad dedicated to helping individuals overcome addiction, manage neurodiversity, and achieve mental and physical wellness.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            We combine traditional therapeutic methods with cutting-edge technology — including AI-powered diagnostics and telehealth — to deliver accessible, effective, and organized care for everyone.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{h}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { num: "500+", label: "Patients Treated" },
            { num: "15+", label: "Expert Therapists" },
            { num: "10+", label: "Therapy Programs" },
            { num: "24/7", label: "Support Available" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-8 text-center shadow-card">
              <div className="text-3xl font-bold text-primary mb-1">{stat.num}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
  );
};

export default About;
