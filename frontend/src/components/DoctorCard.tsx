import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Stethoscope } from "lucide-react";
import type { Doctor } from "@/data/doctors";
import AuthGatedButton from "@/components/auth/AuthGatedButton";

interface Props {
  doctor: Doctor;
  index?: number;
}

const DoctorCard = ({ doctor, index = 0 }: Props) => {
  const navigate = useNavigate();

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 8) * 0.05 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 border border-border flex flex-col"
    >
      <div className="aspect-[4/3] overflow-hidden bg-section-alt">
        <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold mb-1">{doctor.name}</h3>
        <div className="flex items-center gap-1.5 text-sm text-primary font-medium mb-3">
          <Stethoscope className="w-4 h-4" />
          <span>{doctor.specialty}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
          <Briefcase className="w-3.5 h-3.5" />
          <span>{doctor.experienceYears}+ years experience</span>
        </div>

        <div className="mt-auto flex gap-2">
          <Link
            to={`/doctors/${doctor.id}`}
            className="flex-1 text-center px-4 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
          >
            View Profile
          </Link>
          <AuthGatedButton
            unstyled
            onAllowedClick={() => navigate(`/doctors/${doctor.id}#book`)}
            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Book Now
          </AuthGatedButton>
        </div>
      </div>
    </motion.article>
  );
};

export default DoctorCard;
