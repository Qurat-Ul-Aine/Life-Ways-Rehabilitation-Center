import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { buildLoginPath } from "@/lib/authRedirect";
import { getUserHomeRoute } from "@/lib/roleHelpers";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

type DropdownKey = "services" | "care-support";

type NavLinkType = {
  label: string;
  href?: string;
  dropdown?: DropdownKey;
};

type DropdownLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const navLinks: NavLinkType[] = [
  { label: "Home", href: "/" },
  { label: "Services", dropdown: "services" },
  { label: "Care & Support", dropdown: "care-support" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

const careSupportLinks: DropdownLink[] = [
  { label: "Find My Doctor", href: "/find-my-doctor" },
  { label: "Take a Screening Test", href: "/screening/intro", icon: <ClipboardCheck className="w-4 h-4" /> },
  { label: "Our Doctors", href: "/doctors" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Gallery", href: "/gallery" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<DropdownKey | null>(null);
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

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
    setMobileSection(null);
  }, [location.pathname, location.hash]);

  // Lock page scroll while the mobile drawer is open, restoring prior styles on close.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

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

  const renderDropdownPanel = (
    type: DropdownKey,
    onItemClick?: () => void,
    mobile = false,
  ) => {
    if (type === "services") {
      return services.map((s) => (
        <li key={s.slug}>
          <Link
            to={`/services/${s.slug}`}
            onClick={onItemClick}
            className={`block px-4 ${mobile ? "py-3" : "py-2.5"} text-sm hover:bg-muted transition-colors`}
          >
            {s.title}
          </Link>
        </li>
      ));
    }

    return careSupportLinks.map((item) => (
      <li key={item.href}>
        <Link
          to={item.href}
          onClick={onItemClick}
          className={`flex items-center gap-2 px-4 ${mobile ? "py-3" : "py-2.5"} text-sm hover:bg-muted transition-colors`}
        >
          {item.icon && <span className="text-primary">{item.icon}</span>}
          {item.label}
        </Link>
      </li>
    ));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between gap-2 py-3 px-4">
        {/* Logo + full brand name (never shortened) */}
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img
            src={logoUrl}
            alt={`${hospitalName} logo`}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-md object-contain"
          />
          <span className="whitespace-nowrap text-base font-bold font-heading text-heading sm:text-xl">
            {brandLabel}
          </span>
        </Link>

        {/* Desktop Navigation (lg and up) */}
        <ul className="hidden lg:flex items-center gap-4 xl:gap-6">
          {navLinks.map((l) => (
            <li key={l.label} className={l.dropdown ? "relative group py-4" : "py-4"}>
              {l.dropdown ? (
                <>
                  <button
                    onClick={() => l.dropdown === "services" && handleNavClick("/#services")}
                    className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {l.label} <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-[280px] bg-card border border-border rounded-xl shadow-card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 overflow-hidden">
                    <ul className="py-2">{renderDropdownPanel(l.dropdown)}</ul>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => l.href && handleNavClick(l.href)}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          <ThemeToggle />
          <Link
            to="/appointments/book"
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity xl:px-4 xl:py-2.5 xl:text-sm whitespace-nowrap"
          >
            Book Appointment
          </Link>
          {!isAuthenticated ? (
            <>
              <Link
                to={patientLoginPath}
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors xl:px-4 xl:py-2.5 xl:text-sm"
              >
                Login
              </Link>
              <Link
                to={registerPath}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity xl:px-4 xl:py-2.5 xl:text-sm whitespace-nowrap"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              {isPatientFamily && (
                <Link
                  to="/patient/dashboard/home"
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors xl:px-4 xl:py-2.5 xl:text-sm whitespace-nowrap"
                >
                  My Dashboard
                </Link>
              )}
              {user && ["admin", "doctor", "staff"].includes(user.role) && (
                <Link
                  to={dashboardPath}
                  className="px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors xl:px-4 xl:py-2.5 xl:text-sm"
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors xl:px-4 xl:py-2.5 xl:text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile / tablet: theme + hamburger */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <ThemeToggle className="h-11 w-11" />
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 right-0 top-full flex h-[calc(100dvh-65px)] max-h-[calc(100dvh-65px)] flex-col border-t border-border bg-card lg:hidden"
          >
            {/* Scrollable links */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
              <ul className="space-y-1">
                {navLinks.map((l) => (
                  <li key={l.label}>
                    {l.dropdown ? (
                      <>
                        <button
                          onClick={() =>
                            setMobileSection((current) =>
                              current === l.dropdown ? null : l.dropdown ?? null,
                            )
                          }
                          aria-expanded={mobileSection === l.dropdown}
                          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-medium hover:bg-muted"
                        >
                          {l.label}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              mobileSection === l.dropdown ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {mobileSection === l.dropdown && (
                          <ul className="mb-2 ml-4 mt-1 border-l border-border pl-2">
                            {renderDropdownPanel(l.dropdown, () => setOpen(false), true)}
                          </ul>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => l.href && handleNavClick(l.href)}
                        className="block w-full rounded-lg px-4 py-3 text-left text-base font-medium hover:bg-muted"
                      >
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sticky actions (always visible) */}
            <div className="space-y-2 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link
                to="/appointments/book"
                onClick={() => setOpen(false)}
                className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
              >
                Book Appointment
              </Link>

              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={patientLoginPath}
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold hover:bg-muted"
                  >
                    Login
                  </Link>
                  <Link
                    to={registerPath}
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {isPatientFamily && (
                    <Link
                      to="/patient/dashboard/home"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold hover:bg-muted"
                    >
                      My Dashboard
                    </Link>
                  )}
                  {user && ["admin", "doctor", "staff"].includes(user.role) && (
                    <Link
                      to={dashboardPath}
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold hover:bg-muted"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="rounded-lg px-4 py-3 text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;