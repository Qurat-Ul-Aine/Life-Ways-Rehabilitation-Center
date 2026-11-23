import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemedSonner } from "@/components/theme/ThemedSonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeSync } from "@/components/theme/ThemeSync";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./context/AuthContext";
import { HospitalSettingsProvider } from "@/features/admin/context/HospitalSettingsContext";
import ProtectedRoute from "./routes/ProtectedRoute";

// ── Public pages ──────────────────────────────────────────────────────────────
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import AccessibilityStatement from "./pages/AccessibilityStatement";
import CookieConsent from "@/components/CookieConsent";
import FloatingContactButton from "@/components/FloatingContactButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceDetail from "./pages/ServiceDetail";
import AboutPage from "./pages/AboutPage";
import TeamPage from "./pages/TeamPage";
import DoctorsPage from "./pages/DoctorsPage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import PublicBookAppointmentPage from "./features/appointment/pages/PublicBookAppointmentPage";
import GalleryPage from "./pages/GalleryPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import RecommendationForm from "./features/recommendation/pages/RecommendationForm";

// ── Auth pages ────────────────────────────────────────────────────────────────
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ChangePassword from "./features/auth/pages/ChangePassword";
import DisableAccount from "./features/auth/pages/DisableAccount";
import ResetPassword from "./features/auth/pages/ResetPassword";
import ResetPasswordSuccess from "./features/auth/pages/ResetPasswordSuccess";

// ── Dashboards ────────────────────────────────────────────────────────────────
import AdminOverview from "./dashboard/admin/AdminOverview";
import DoctorDashboard from "./dashboard/doctor/DoctorDashboard";
import { doctorDashboardRoutes } from "./dashboard/doctor/doctorRoutes";
import InternDashboard from "./dashboard/intern/InternDashboard";
import { internDashboardRoutes } from "./dashboard/intern/internRoutes";
import DashboardLayout from "@/components/layout/DashboardLayout";

// ── Route files ───────────────────────────────────────────────────────────────
import patientRoutes, { waitingRoomRoute } from "./routes/patientRoutes";
import adminRoutes from "./routes/adminRoutes";

// ── Screening (feature module) ────────────────────────────────────────────────
import { screeningPublicRoutes } from "@/features/screening/screening.routes";

// ── Reports pages (dashboard-owned) ───────────────────────────────────────────
import TherapyReportsSection from "@/dashboard/admin/components/TherapyReportsSection";
import ReportsRedirect from "@/routes/ReportsRedirect";

// ── Intern pages ──────────────────────────────────────────────────────────────
import InternList from "./features/intern/pages/InternList";
import InternDetail from "./features/intern/pages/InternDetail";
import AddIntern from "./features/intern/pages/AddIntern";
import CreateIntern from "./features/intern/pages/CreateIntern";
import EditIntern from "./features/intern/pages/EditIntern";
import InternProfile from "./features/intern/pages/InternProfile";
import InternMyProfile from "./features/intern/pages/InternMyProfile";
import InternMyLogs from "./features/intern/pages/InternMyLogs";
import InternAddLog from "./features/intern/pages/InternAddLog";
import InternSignup from "./features/intern/pages/InternSignup";
import InternLogin from "./features/intern/pages/InternLogin";
import InternshipsPage from "./features/intern/pages/InternshipsPage";

// ── Telehealth pages ───────────────────────────────────────────────────────────
import TelehealthSessionPage from "./features/telehealth/pages/TelehealthSessionPage";
import TelehealthSessionRedirect from "./features/telehealth/pages/TelehealthSessionRedirect";

// ── Notifications context ─────────────────────────────────────────────────────
import { NotificationProvider } from "./context/NotificationContext";

// ─────────────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient();

const AppLayout = () => {
  const location = useLocation();

  const isPatientDashboard = location.pathname.startsWith("/patient/dashboard");

  const isTelehealthSession = location.pathname.startsWith("/session/");

  const isAuthShell =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname === "/change-password" ||
    location.pathname.startsWith("/intern/login") ||
    location.pathname.startsWith("/intern/signup");

  const isDashboard =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/doctor/") ||
    location.pathname.startsWith("/intern/dashboard") ||
    isPatientDashboard ||
    isTelehealthSession ||
    location.pathname.startsWith("/staff") ||
    location.pathname.startsWith("/login");

  const hidePublicChrome = isDashboard || isAuthShell;

  return (
    <div
      className={`flex flex-col ${
        isPatientDashboard || isTelehealthSession ? "h-dvh overflow-hidden" : "min-h-dvh"
      }`}
    >
      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="absolute left-4 top-0 z-[100] -translate-y-full rounded-b-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-transform focus-visible:translate-y-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>

      {!hidePublicChrome && <Navbar />}

      {isAuthShell ? (
        <div className="fixed top-4 right-4 z-[60]">
          <ThemeToggle />
        </div>
      ) : null}

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex w-full flex-1 flex-col outline-none ${
          isPatientDashboard || isTelehealthSession
            ? "h-full min-h-0 overflow-hidden"
            : hidePublicChrome
              ? ""
              : "min-h-[50vh] pt-[72px]"
        }`}
      >
        <Routes>

          {/* ── Public ─────────────────────────────────────────────────── */}
          <Route path="/" element={<Index />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/accessibility" element={<AccessibilityStatement />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorProfilePage />} />
          <Route path="/appointments/book" element={<PublicBookAppointmentPage />} />
          <Route path="/find-my-doctor" element={<RecommendationForm />} />

          {/* ── Intern public (no auth needed) ─────────────────────────── */}
          <Route path="/intern/login" element={<InternLogin />} />
          <Route path="/intern/signup" element={<InternSignup />} />
          <Route path="/internships" element={<InternshipsPage />} />

          {screeningPublicRoutes}

          {/* ── Auth ───────────────────────────────────────────────────── */}
          <Route path="/login" element={<Navigate to="/login/patient" replace />} />
          <Route path="/login/:mode" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/success" element={<ResetPasswordSuccess />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "patient", "staff", "family"]} loginPath="/login/patient">
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* ── Protected: misc ────────────────────────────────────────── */}
          <Route
            path="/disable-account"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <DisableAccount />
              </ProtectedRoute>
            }
          />

          {/* ── Admin portal (must come before legacy doctor /admin redirects) ── */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          {adminRoutes}

          {/* ── Admin: Reports sub-routes (summary is in adminRoutes) ──── */}
          <Route
            path="/admin/reports/therapy"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <TherapyReportsSection />
              </ProtectedRoute>
            }
          />

          {/* ── Admin: Interns ─────────────────────────────────────────── */}
          <Route
            path="/admin/interns"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <InternList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interns/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <AddIntern />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interns/create"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <CreateIntern />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interns/:id"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <InternDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interns/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <EditIntern />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interns/:id/profile"
            element={
              <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
                <InternProfile />
              </ProtectedRoute>
            }
          />

          {/* ── Doctor dashboard ──────────────────────────────────────── */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={["doctor"]} loginPath="/login/doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          >
            {doctorDashboardRoutes}
          </Route>

          {/* ── Staff dashboard ────────────────────────────────────────── */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={["staff"]} loginPath="/login/admin">
                <DashboardLayout>
                  <AdminOverview />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />

          {/* ── Intern dashboard ──────────────────────────────────────── */}
          <Route
            path="/intern/dashboard"
            element={
              <ProtectedRoute allowedRoles={["intern"]} loginPath="/intern/login">
                <InternDashboard />
              </ProtectedRoute>
            }
          >
            {internDashboardRoutes}
          </Route>
          <Route
            path="/intern/my-profile"
            element={
              <ProtectedRoute allowedRoles={["intern"]} loginPath="/intern/login">
                <InternMyProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intern/my-logs"
            element={
              <ProtectedRoute allowedRoles={["intern"]} loginPath="/intern/login">
                <InternMyLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intern/logs/add"
            element={
              <ProtectedRoute allowedRoles={["intern"]} loginPath="/intern/login">
                <InternAddLog />
              </ProtectedRoute>
            }
          />
          <Route path="/intern" element={<Navigate to="/intern/dashboard" replace />} />

          {/* ── Patient dashboard ─────────────────────────────────────── */}
          {patientRoutes}

          {/* ── Patient waiting room ─────────────────────────────────── */}
          {waitingRoomRoute}

          {/* ── Telehealth session (shared for doctor and patient) ─────── */}
          <Route
            path="/patient/telehealth-session/:appointmentId"
            element={
              <ProtectedRoute allowedRoles={["patient", "family"]} loginPath="/login/patient">
                <TelehealthSessionRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:appointmentId"
            element={
              <ProtectedRoute allowedRoles={["doctor", "patient"]} loginPath="/login/patient">
                <TelehealthSessionPage />
              </ProtectedRoute>
            }
          />

          {/* ── Shared: Reports redirect ───────────────────────────────── */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "doctor", "patient", "staff"]} loginPath="/login/patient">
                <ReportsRedirect />
              </ProtectedRoute>
            }
          />

          {/* ── 404 ────────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </main>

      {!hidePublicChrome && <Footer />}
      {!hidePublicChrome && !isAuthShell && <FloatingContactButton />}
      {!isTelehealthSession && <CookieConsent />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <HospitalSettingsProvider>
            <ThemeSync />
            <Toaster />
            <ThemedSonner />
            <NotificationProvider>
              <BrowserRouter>
                <AppLayout />
              </BrowserRouter>
            </NotificationProvider>
          </HospitalSettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;