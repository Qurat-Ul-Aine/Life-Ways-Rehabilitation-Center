import { motion } from "framer-motion";
import { HeartPulse, Users, ClipboardList, HandHeart, ShieldCheck, CalendarCheck } from "lucide-react";

const features = [
  {
    icon: HeartPulse,
    title: "Comprehensive Care Services",
    desc: "Specialized treatments including addiction recovery, psychotic support, neurodiversity care, physiotherapy, and psychological training — all under one roof.",
  },
  {
    icon: Users,
    title: "Qualified & Experienced Team",
    desc: "Certified doctors, clinical psychologists, therapists, and specialists dedicated to delivering professional and compassionate care.",
  },
  {
    icon: ClipboardList,
    title: "Personalized Treatment Plans",
    desc: "Every patient receives a customized care plan based on their condition, ensuring effective and long-term recovery.",
  },
  {
    icon: HandHeart,
    title: "Family Support & Counseling",
    desc: "We actively involve families in the recovery process through counseling, guidance, and psychoeducation.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Supportive Environment",
    desc: "A structured, secure, and healing environment designed to support both mental and physical recovery.",
  },
  {
    icon: CalendarCheck,
    title: "Easy Appointment Booking",
    desc: "Book appointments with specialists easily and access the right care without delays.",
  },
];

const Features = () => (
  <section id="features" className="py-24 bg-section-alt">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our Care Approach</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-2">Why Choose Our Rehabilitation Center</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Compassionate, evidence-based care built around every patient — combining clinical expertise, family involvement, and a safe healing environment.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <f.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
