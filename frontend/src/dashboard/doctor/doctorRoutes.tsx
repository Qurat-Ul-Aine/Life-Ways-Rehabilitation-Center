import { Navigate, Route } from "react-router-dom";

import HomePanel from "./panels/HomePanel";
import PatientsPanel from "./panels/PatientsPanel";
import TherapyPanel from "./panels/TherapyPanel";
import NotesPanel from "./panels/NotesPanel";
import ReportsPanel from "./panels/ReportsPanel";
import NotificationsPanel from "./panels/NotificationsPanel";

import InternshipPanel from "./panels/InternshipPanel";
import MentorInternsListPage from "./pages/MentorInternsListPage";
import MentorInternDetailPage from "./pages/MentorInternDetailPage";
import PrescriptionsPanel from "./panels/PrescriptionsPanel";
import MessagesPanel from "./panels/MessagesPanel";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import AiMatchesPage from "./pages/AiMatchesPage";
import ScreeningDoctorDetailPanel from "./panels/ScreeningDoctorDetailPanel";
import PatientProfile from "@/features/patient/pages/PatientProfile";
import AddTherapyPlan from "@/features/therapy/pages/AddTherapyPlan";
import EditTherapyPlan from "@/features/therapy/pages/EditTherapyPlan";
import TherapyDetails from "@/features/therapy/pages/TherapyDetails";
import TherapyReports from "@/features/therapy/pages/TherapyReports";

/** Nested doctor portal routes — mount as children of `/doctor` in App.tsx. */
export const doctorDashboardRoutes = (
  <>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<HomePanel />} />
    <Route path="patients" element={<PatientsPanel />} />
    <Route path="patients/:id" element={<PatientProfile />} />
    <Route path="therapy/new" element={<AddTherapyPlan />} />
    <Route path="therapy/:id/edit" element={<EditTherapyPlan />} />
    <Route path="therapy/:id/report" element={<TherapyReports />} />
    <Route path="therapy/:id" element={<TherapyDetails />} />
    <Route path="therapy" element={<TherapyPanel />} />
    <Route path="notes" element={<NotesPanel />} />
    <Route path="prescriptions" element={<PrescriptionsPanel />} />
    <Route path="reports" element={<ReportsPanel />} />
    <Route path="interns" element={<InternshipPanel />}>
      <Route index element={<MentorInternsListPage />} />
      <Route path=":internId" element={<MentorInternDetailPage />} />
    </Route>
    <Route path="notifications" element={<NotificationsPanel />} />
    <Route path="messages" element={<MessagesPanel />} />
    <Route path="appointments" element={<AppointmentsPage />} />
    <Route path="ai-matches" element={<AiMatchesPage />} />
    <Route path="screening/:id" element={<ScreeningDoctorDetailPanel />} />
    <Route path="screening" element={<Navigate to="/doctor/patients" replace />} />
    <Route path="profile" element={<ProfilePage />} />
    <Route path="dashboard/settings" element={<SettingsPage />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="reports/detail" element={<Navigate to="/doctor/reports" replace />} />
    <Route path="*" element={<Navigate to="/doctor/dashboard" replace />} />
  </>
);

/** @deprecated Use doctorDashboardRoutes — kept for any legacy imports */
export const doctorRoutes = doctorDashboardRoutes;

export default doctorDashboardRoutes;
