import { Route } from "react-router-dom";
import type { ReactNode } from "react";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

import AdminOverview from "@/dashboard/admin/AdminOverview";
import PatientList from "@/features/patient/pages/PatientList";
import AddPatient from "@/features/patient/pages/AddPatient";
import EditPatient from "@/features/patient/pages/EditPatient";
import PatientProfile from "@/features/patient/pages/PatientProfile";
import StaffList from "@/features/staff/pages/StaffList";
import AddStaff from "@/features/staff/pages/AddStaff";
import EditStaff from "@/features/staff/pages/EditStaff";
import StaffProfile from "@/features/staff/pages/StaffProfile";
import DoctorList from "@/features/doctor/pages/DoctorList";
import AddDoctor from "@/features/doctor/pages/AddDoctor";
import EditDoctor from "@/features/doctor/pages/EditDoctor";
import DoctorProfile from "@/features/doctor/pages/DoctorProfile";
import AppointmentList from "@/features/appointment/pages/AppointmentList";
import BookAppointment from "@/features/appointment/pages/BookAppointment";
import CalendarView from "@/features/appointment/pages/CalendarView";
import AdminAiRecommendationsPage from "@/features/recommendation/pages/AdminAiRecommendationsPage";
import TherapyPlanList from "@/features/therapy/pages/TherapyPlanList";
import AddTherapyPlan from "@/features/therapy/pages/AddTherapyPlan";
import EditTherapyPlan from "@/features/therapy/pages/EditTherapyPlan";
import TherapyDetails from "@/features/therapy/pages/TherapyDetails";
import TherapyReports from "@/features/therapy/pages/TherapyReports";
import AdminMedicationsPage from "@/features/admin/pages/AdminMedicationsPage";
import InternshipPanel from "@/dashboard/admin/panels/InternshipPanel";
import AdminSettingsPage from "@/features/admin/pages/AdminSettingsPage";
import AdminGalleryPage from "@/features/admin/pages/AdminGalleryPage";
import AdminProfilePage from "@/features/admin/pages/AdminProfilePage";
import ScreeningPanel from "@/dashboard/admin/panels/ScreeningPanel";
import HighRiskPatientsPanel from "@/dashboard/admin/panels/HighRiskPatientsPanel";
import ScreeningAnalyticsPanel from "@/dashboard/admin/panels/ScreeningAnalyticsPanel";
import ScreeningDetailPanel from "@/dashboard/admin/panels/ScreeningDetailPanel";
import ReportsPanel from "@/dashboard/admin/panels/ReportsPanel";
import NotificationsPanel from "@/dashboard/admin/panels/NotificationsPanel";

const adminOnly = (element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
    {element}
  </ProtectedRoute>
);

const adminOrDoctor = (element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={["admin", "doctor"]} loginPath="/login/admin">
    {element}
  </ProtectedRoute>
);

/** Wraps every admin page with sidebar + top bar (same as before). */
const withAdminLayout = (page: ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

const adminPage = (page: ReactNode, roles: "admin" | "adminOrDoctor" = "admin") =>
  roles === "adminOrDoctor"
    ? adminOrDoctor(withAdminLayout(page))
    : adminOnly(withAdminLayout(page));

/** All /admin/* routes — each page gets DashboardLayout (sidebar + top bar). */
const adminRoutes = (
  <>
    <Route path="/admin/dashboard" element={adminPage(<AdminOverview />)} />
    <Route path="/admin/dashboard/profile" element={adminPage(<AdminProfilePage />)} />
    <Route path="/admin/dashboard/settings" element={adminPage(<AdminSettingsPage />)} />
    <Route path="/admin/gallery" element={adminPage(<AdminGalleryPage />)} />
    <Route path="/admin/patients" element={adminPage(<PatientList />)} />
    <Route path="/admin/patients/new" element={adminPage(<AddPatient />)} />
    <Route path="/admin/patients/:id" element={adminPage(<PatientProfile />)} />
    <Route path="/admin/patients/:id/edit" element={adminPage(<EditPatient />)} />
    <Route path="/admin/staff" element={adminPage(<StaffList />)} />
    <Route path="/admin/staff/new" element={adminPage(<AddStaff />)} />
    <Route path="/admin/staff/:id" element={adminPage(<StaffProfile />)} />
    <Route path="/admin/staff/:id/edit" element={adminPage(<EditStaff />)} />
    <Route path="/admin/doctors" element={adminPage(<DoctorList />)} />
    <Route path="/admin/doctors/new" element={adminPage(<AddDoctor />)} />
    <Route path="/admin/doctors/add" element={adminPage(<AddDoctor />)} />
    <Route path="/admin/doctors/edit/:id" element={adminPage(<EditDoctor />)} />
    <Route path="/admin/doctors/:id" element={adminPage(<DoctorProfile />)} />
    <Route path="/admin/doctors/:id/edit" element={adminPage(<EditDoctor />)} />
    <Route path="/admin/appointments" element={adminPage(<AppointmentList />)} />
    <Route path="/admin/appointments/new" element={adminPage(<BookAppointment />)} />
    <Route path="/admin/appointments/calendar" element={adminPage(<CalendarView />)} />
    <Route path="/admin/ai-recommendations" element={adminPage(<AdminAiRecommendationsPage />)} />
    <Route path="/admin/medications" element={adminPage(<AdminMedicationsPage />)} />
    <Route path="/admin/screening/high-risk" element={adminPage(<HighRiskPatientsPanel />)} />
    <Route path="/admin/screening/analytics" element={adminPage(<ScreeningAnalyticsPanel />)} />
    <Route path="/admin/screening/:id" element={adminPage(<ScreeningDetailPanel />)} />
    <Route path="/admin/screening" element={adminPage(<ScreeningPanel />)} />
    <Route path="/admin/reports" element={adminPage(<ReportsPanel />)} />
    <Route path="/admin/internship" element={adminPage(<InternshipPanel />)} />
    <Route path="/admin/notifications" element={adminPage(<NotificationsPanel />)} />
    <Route path="/admin/therapy" element={adminPage(<TherapyPlanList />, "adminOrDoctor")} />
    <Route path="/admin/therapy/new" element={adminPage(<AddTherapyPlan />, "adminOrDoctor")} />
    <Route path="/admin/therapy/:id/edit" element={adminPage(<EditTherapyPlan />, "adminOrDoctor")} />
    <Route path="/admin/therapy/:id/report" element={adminPage(<TherapyReports />, "adminOrDoctor")} />
    <Route path="/admin/therapy/:id" element={adminPage(<TherapyDetails />, "adminOrDoctor")} />
  </>
);

export default adminRoutes;
