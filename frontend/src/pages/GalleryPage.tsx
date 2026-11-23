import { Link } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { galleryImages as fallbackGalleryImages, type GalleryImage } from "@/data/gallery";

const categories = ["All", "Environment", "Therapy", "Facilities", "Activities"] as const;

const GalleryPage = () => {
  const [filter, setFilter] = useState<(typeof categories)[number]>("All");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: remoteGallery } = useQuery({
    queryKey: ["public-gallery"],
    queryFn: async () => {
      const { data } = await api.get<{ items: GalleryImage[] }>("/gallery");
      return data.items;
    },
  });
  const galleryImages = remoteGallery?.length ? remoteGallery : fallbackGalleryImages;
  const visible = filter === "All" ? galleryImages : galleryImages.filter((i) => i.category === filter);

  return (
    <div className="py-12 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our Gallery</span>
          <h1 className="mt-2 mb-4 text-3xl font-heading font-bold sm:text-4xl md:text-5xl">A Glimpse Inside Life Ways</h1>
          <p className="text-muted-foreground">
            Step into our calm, supportive environment — where healing, therapy, and community come together.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`min-h-11 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
                filter === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((img, i) => (
            <motion.button
              key={img.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setLightbox(img.src)}
              className="group relative overflow-hidden rounded-xl shadow-card aspect-[4/3] bg-muted w-full"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-heading/80 via-heading/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <div className="text-left">
                  <span className="text-xs uppercase tracking-wider text-accent font-semibold">{img.category}</span>
                  <p className="text-primary-foreground text-sm font-medium">{img.alt}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-16 bg-card border border-border rounded-2xl p-8 md:p-10 text-center shadow-card">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3">Ready to Begin Your Recovery?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Book an appointment with our specialists or explore the full range of services we offer.
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

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-card/20 text-primary-foreground hover:bg-card/40"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Preview"
              decoding="async"
              className="max-h-[90dvh] max-w-full rounded-lg object-contain shadow-card-hover"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryPage;
