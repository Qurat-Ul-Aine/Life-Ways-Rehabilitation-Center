import { motion } from "framer-motion";
import { HospitalContactDisplay } from "@/features/admin/components/HospitalContactDisplay";

const Contact = () => (
  <section id="contact" className="py-24">
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-16">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Get In Touch</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">Contact Us</h2>
          <p className="text-muted-foreground mb-10">
            Ready to start your recovery journey? Reach out to us for appointments, inquiries, or support.
          </p>
          <HospitalContactDisplay layout="stack" showHours />
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-xl p-8 shadow-card space-y-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <h3 className="text-xl font-bold mb-2">Send a Message</h3>
          <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          <input type="tel" placeholder="Phone" className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          <textarea placeholder="Message" rows={4} className="w-full px-4 py-3 rounded-lg border border-border bg-background" />
          <button type="submit" className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            Send Message
          </button>
        </motion.form>
      </div>
    </div>
  </section>
);

export default Contact;
