import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { testimonials } from "@/data/testimonials";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? "fill-accent text-accent" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

const TestimonialsPage = () => {
  const [active, setActive] = useState(0);
  const featured = testimonials[active];

  const next = () => setActive((a) => (a + 1) % testimonials.length);
  const prev = () => setActive((a) => (a - 1 + testimonials.length) % testimonials.length);

  return (
    <div className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Testimonials</span>
          <h1 className="mt-2 mb-4 text-3xl font-heading font-bold sm:text-4xl md:text-5xl">Stories of Hope & Healing</h1>
          <p className="text-muted-foreground">
            Hear from the patients and families whose lives have been transformed through compassionate care at Life Ways.
          </p>
        </div>

        {/* Featured carousel */}
        <div className="relative max-w-3xl mx-auto mb-16">
          <div className="bg-card border border-border rounded-2xl shadow-card p-5 sm:p-8 md:p-12 text-center relative overflow-hidden">
            <Quote className="absolute top-4 left-4 h-8 w-8 text-primary/10 sm:left-6 sm:top-6 sm:h-12 sm:w-12" />
            <AnimatePresence mode="wait">
              <motion.div
                key={featured.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex justify-center mb-4"><Stars rating={featured.rating} /></div>
                <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6 italic">
                  “{featured.text}”
                </p>
                <div className="font-heading font-semibold text-heading">{featured.name}</div>
                <div className="text-sm text-muted-foreground">{featured.relation}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute -left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-card transition-colors hover:bg-primary hover:text-primary-foreground md:-left-6"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute -right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-card transition-colors hover:bg-primary hover:text-primary-foreground md:-right-6"
          >
            <ChevronRight size={20} />
          </button>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-2 bg-border"}`}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <Stars rating={t.rating} />
              <p className="text-foreground/90 leading-relaxed mt-4 mb-6">“{t.text}”</p>
              <div className="border-t border-border pt-4">
                <div className="font-semibold text-heading">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.relation}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 bg-card border border-border rounded-2xl p-8 md:p-10 text-center shadow-card">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">Start Your Journey With Us</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join the many who have found healing at Life Ways. Book your appointment or explore our care services.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/find-my-doctor" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              Find My Doctor
            </Link>
            <Link to="/doctors" className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
              View Doctors
            </Link>
            <Link to="/#services" className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">
              Our Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsPage;
