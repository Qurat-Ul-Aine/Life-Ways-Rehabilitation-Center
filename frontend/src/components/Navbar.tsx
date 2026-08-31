import { useState } from "react";
import { Menu, X, ChevronDown, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { buildLoginPath } from "@/lib/authRedirect";
import { getUserHomeRoute } from "@/lib/roleHelpers";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

type NavLinkType = {
  label: string;
  href?: string;
  isDropdown?: boolean;
  icon?: React.ReactNode;
};

const navLinks: NavLinkType[] = [
  { label: "Home", href: "/" },
  { label: "Services", isDropdown: true },
  { label: "Doctors", href: "/doctors" },
  { label: "Find My Doctor", href: "/find-my-doctor" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
  { label: "Take a Screening Test", href: "/screening/intro", icon: <ClipboardCheck className="w-4 h-4" /> },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { hospitalName, logoUrl } = useHospitalContact();
  const brandLabel = hospitalName.split(" ").slice(0, 2).join(" ") || hospitalName;

  const isPatientFamily = user ? ["patient", "family", "user"].includes(user.role) : false;
  const dashboardPath = user ? getUserHomeRoute(user.role) : "/";

  const currentReturnPath = `${location.pathname}${location.hash}`;
  const patientLoginPath = buildLoginPath("/login/patient", currentReturnPath);
  const registerPath = buildLoginPath("/register", currentReturnPath);

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      const sectionId = href.slice(2);
      if (location.pathname === "/") {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    } else {
      navigate(href);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={logoUrl}
            alt={`${hospitalName} logo`}
            width={40}
            height={40}
            className="rounded-md object-contain"
          />
          <span className="text-xl font-bold font-heading text-heading hidden sm:inline">{brandLabel}</span>
          <span className="text-lg font-bold font-heading text-heading sm:hidden">{brandLabel.split(" ")[0]}</span>
        </Link>

        {/* Desktop Navigation - Hidden on mobile, scrollable on tablets */}
        <ul className="hidden md:flex lg:hidden items-center gap-4 overflow-x-auto scrollbar-hide px-2">
          {navLinks.map((l) => (
            <li key={l.label} className="shrink-0">
              {l.isDropdown ? (
                <button
                  onClick={() => handleNavClick("/#services")}
                  className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {l.label} <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => l.href && handleNavClick(l.href)}
                  className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {l.icon && <span className="text-primary">{l.icon}</span>}
                  {l.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Large Desktop Navigation - Full horizontal layout */}
        <ul className="hidden lg:flex items-center gap-6">
          {navLinks.map((l) => (
            <li key={l.label} className={l.isDropdown ? "relative group py-4" : "py-4"}>
              {l.isDropdown ? (
                <>
                  <button
                    onClick={() => handleNavClick("/#services")}
                    className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {l.label} <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[280px] bg-card border border-border rounded-xl shadow-card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 overflow-hidden">
                    <ul className="py-2">
                      {services.map((s) => (
                        <li key={s.slug}>
                          <Link
                            to={`/services/${s.slug}`}
                            className="block px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                          >
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => l.href && handleNavClick(l.href)}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {l.icon && <span className="text-primary">{l.icon}</span>}
                  {l.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
          <ThemeToggle />
          {!isAuthenticated ? (
            <>
              <Link
                to={patientLoginPath}
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors lg:px-4 lg:py-2.5 lg:text-sm"
              >
                Login
              </Link>
              <Link
                to={registerPath}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity lg:px-4 lg:py-2.5 lg:text-sm"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              {isPatientFamily && (
                <Link
                  to="/patient/dashboard/home"
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors lg:px-4 lg:py-2.5 lg:text-sm"
                >
                  My Dashboard
                </Link>
              )}
              {user && ["admin", "doctor", "staff"].includes(user.role) && (
                <Link
                  to={dashboardPath}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors lg:px-4 lg:py-2.5 lg:text-sm"
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors lg:px-4 lg:py-2.5 lg:text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden"
          >
            <ul className="py-4 space-y-1">
              {navLinks.map((l) => (
                <li key={l.label}>
                  {l.isDropdown ? (
                    <>
                      <button
                        onClick={() => handleNavClick("/#services")}
                        className="block w-full text-left px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        {l.label}
                      </button>
                      <ul className="pl-4 border-l border-border ml-4 mb-2">
                        {services.map((s) => (
                          <li key={s.slug}>
                            <Link
                              to={`/services/${s.slug}`}
                              onClick={() => setOpen(false)}
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              {s.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <button
                      onClick={() => l.href && handleNavClick(l.href)}
                      className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {l.icon && <span className="text-primary">{l.icon}</span>}
                      {l.label}
                    </button>
                  )}
                </li>
              ))}
              <li className="px-4 py-2">
                <ThemeToggle variant="compact" className="w-full justify-center" />
              </li>
              {!isAuthenticated ? (
                <>
                  <li>
                    <Link
                      to={patientLoginPath}
                      onClick={() => setOpen(false)}
                      className="block w-full mt-2 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-center hover:bg-muted transition-colors"
                    >
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={registerPath}
                      onClick={() => setOpen(false)}
                      className="block w-full px-4 py-3 mt-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold text-center hover:opacity-90 transition-opacity"
                    >
                      Sign up
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  {isPatientFamily && (
                    <li>
                      <Link
                        to="/patient/dashboard/home"
                        onClick={() => setOpen(false)}
                        className="block w-full mt-2 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-center hover:bg-muted transition-colors"
                      >
                        My Dashboard
                      </Link>
                    </li>
                  )}
                  {user && ["admin", "doctor", "staff"].includes(user.role) && (
                    <li>
                      <Link
                        to={dashboardPath}
                        onClick={() => setOpen(false)}
                        className="block w-full mt-2 px-4 py-3 rounded-lg border border-border text-sm font-semibold text-center hover:bg-muted transition-colors"
                      >
                        Dashboard
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => {
                        setOpen(false);
                        logout();
                      }}
                      className="block w-full mt-2 px-4 py-3 text-sm font-semibold text-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Logout
                    </button>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
