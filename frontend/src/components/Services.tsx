import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { services } from "@/data/services";

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-24 bg-section-alt">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">What We Offer</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Our Services</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Comprehensive rehabilitation and mental health services designed to support every step of your recovery journey.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/services/${s.slug}`)}
              className="group bg-card rounded-[28px] p-8 shadow-card hover:shadow-card-hover transition-all cursor-pointer hover:-translate-y-1 flex flex-col min-h-[280px] border border-border"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5 transition-colors group-hover:bg-primary/20">
                <s.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3 leading-tight">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">{s.shortDesc}</p>
              <div className="mt-auto pt-4">
                <span className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tracking-wide transition-opacity group-hover:opacity-95">
                  <span>View Service</span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-4">Looking for something else?</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate("/find-my-doctor")} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              Find My Doctor
            </button>
            <button onClick={() => navigate("/doctors")} className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
              View Doctors
            </button>
            <a href="#contact" className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
