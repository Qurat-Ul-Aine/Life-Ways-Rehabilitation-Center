import { motion } from "framer-motion";
import { User } from "lucide-react";

const teamMembers = [
  { name: "Qazi Qammar Nisar", role: "CEO" },
  { name: "Dr. M Usman Ghani", role: "MBBS, FCPS Psychiatry" },
  { name: "Dr. Muhammad Riaz", role: "Director" },
  { name: "Sardar Muhammad Tariq Gogani", role: "Advocate Supreme Court" },
  { name: "Dr. Nageeb ur Rehman", role: "MBBS, MO" },
  { name: "Dr. Zalan Mansoor", role: "MBBS, MO" },
  { name: "Dr. Ali Hassan", role: "MBBS, MO" },
  { name: "Maryam Kabeer", role: "Behavior Therapist, CBT" },
  { name: "Noor-ul-Ain", role: "Clinical Psychologist" },
  { name: "Faiza Maqsood", role: "Clinical Psychologist" },
  { name: "Taqadas Shakeel", role: "Manager" },
  { name: "Toufeek Mumtaz", role: "Accountant" },
  { name: "Mr Shahzaib Ali", role: "Dispenser" },
];

const TeamPage = () => {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our People</span>
            <h1 className="text-4xl md:text-5xl font-bold font-heading mt-3 mb-6">Meet Our Team</h1>
            <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
              Dedicated professionals committed to your recovery and well-being.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-6 shadow-card border border-border text-center group hover:shadow-lg transition-shadow"
              >
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{member.role}</p>
                <button className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-default">
                  View Profile →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center shadow-card max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">Ready to Consult with Our Experts?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Our team of dedicated professionals is here to guide you on your journey to recovery and wellness.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/find-my-doctor" className="px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                Find My Doctor
              </a>
              <a href="/doctors" className="px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
                View Doctors
              </a>
              <a href="/#services" className="px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
                Our Services
              </a>
              <a href="/#contact" className="px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
