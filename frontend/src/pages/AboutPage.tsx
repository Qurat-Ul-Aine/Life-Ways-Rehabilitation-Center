import { motion } from "framer-motion";
import { CheckCircle2, Heart, Target, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HospitalContactDisplay } from "@/features/admin/components/HospitalContactDisplay";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

const AboutPage = () => {
  const navigate = useNavigate();
  const { hospitalName } = useHospitalContact();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">About Us</span>
            <h1 className="text-4xl md:text-5xl font-bold font-heading mt-3 mb-6">
              {hospitalName}
            </h1>
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
              A leading healthcare facility in Islamabad dedicated to helping individuals overcome addiction,
              manage neurodiversity, and achieve mental and physical wellness.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-heading">Our Mission</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To provide comprehensive, compassionate, and evidence-based rehabilitation services that empower
                individuals to reclaim their lives. We combine traditional therapeutic methods with cutting-edge
                technology — including AI-powered diagnostics and telehealth — to deliver accessible, effective,
                and organized care for everyone.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold font-heading">Our Vision</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                To become the most trusted rehabilitation center in Pakistan by setting new standards of care,
                innovation, and patient outcomes. We envision a world where every individual has access to
                quality mental health and rehabilitation services, free from stigma.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our Approach</span>
            <h2 className="text-3xl md:text-4xl font-bold font-heading mt-2">
              Comprehensive Care & Support
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Addiction Therapy", desc: "Structured programs for substance abuse and behavioral addiction recovery." },
              { title: "Neurodiversity Support", desc: "Specialized care for ADHD, Autism, and related neurodevelopmental conditions." },
              { title: "Psychological Training", desc: "CBT, DBT, and behavioral therapy programs led by certified psychologists." },
              { title: "Psychotic Support", desc: "Comprehensive management of psychotic disorders with medication and therapy." },
              { title: "Physiotherapy", desc: "Physical rehabilitation and therapeutic exercises for recovery and wellness." },
              { title: "24/7 Care", desc: "Round-the-clock monitoring, emergency support, and family communication." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card border border-border"
              >
                <CheckCircle2 className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: "500+", label: "Patients Treated" },
              { num: "15+", label: "Expert Therapists" },
              { num: "10+", label: "Therapy Programs" },
              { num: "24/7", label: "Support Available" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-8 text-center shadow-card border border-border"
              >
                <div className="text-3xl font-bold text-primary mb-1">{stat.num}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Get In Touch</span>
            <h2 className="text-3xl md:text-4xl font-bold font-heading mt-2">Center Information</h2>
          </motion.div>

          <HospitalContactDisplay layout="cards" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary rounded-2xl p-12 md:p-16 text-center"
          >
            <Heart className="w-12 h-12 text-primary-foreground mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-primary-foreground mb-4">
              Start Your Healing Journey Today
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
              Take the first step towards recovery. Our compassionate team is here to support you every step of the way.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/find-my-doctor")}
                className="px-8 py-3.5 bg-primary-foreground text-primary rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Find My Doctor
              </button>
              <button
                onClick={() => navigate("/doctors")}
                className="px-8 py-3.5 border-2 border-primary-foreground text-primary-foreground rounded-lg font-semibold hover:bg-primary-foreground/10 transition-colors"
              >
                View Doctors
              </button>
              <button
                onClick={() => navigate("/#contact")}
                className="px-8 py-3.5 border-2 border-primary-foreground text-primary-foreground rounded-lg font-semibold hover:bg-primary-foreground/10 transition-colors"
              >
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
