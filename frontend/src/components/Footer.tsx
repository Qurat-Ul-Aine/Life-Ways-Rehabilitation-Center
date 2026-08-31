import { Link } from "react-router-dom";
import { HospitalContactDisplay } from "@/features/admin/components/HospitalContactDisplay";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

const Footer = () => {
  const { hospitalName, logoUrl } = useHospitalContact();
  const brandLabel = hospitalName.split(" ").slice(0, 2).join(" ") || hospitalName;

  return (
    <footer className="mt-auto border-t border-border bg-card py-14 text-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logoUrl} alt={hospitalName} width={36} height={36} className="rounded-md object-contain" />
              <span className="font-heading text-lg font-bold text-heading">{brandLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Comprehensive rehabilitation, mental health, and wellness care in Islamabad and beyond.
            </p>
          </div>

          <div>
            <h4 className="font-heading text-base font-semibold mb-4 text-heading">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/doctors" className="hover:text-primary transition-colors">Doctors</Link></li>
              <li><Link to="/gallery" className="hover:text-primary transition-colors">Gallery</Link></li>
              <li><Link to="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-base font-semibold mb-4 text-heading">Contact</h4>
            <HospitalContactDisplay layout="footer" />
          </div>
        </div>
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {hospitalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
