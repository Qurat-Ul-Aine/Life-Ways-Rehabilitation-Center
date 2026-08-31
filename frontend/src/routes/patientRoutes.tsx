import { Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PatientDashboard from "../dashboard/patient/PatientDashboard";

// Panels
import HomePanel          from "../dashboard/patient/panels/HomePanel";
import AppointmentsPanel  from "../dashboard/patient/panels/AppointmentsPanel";
import RecoveryPanel      from "../dashboard/patient/panels/RecoveryPanel";
import TherapyPanel       from "../dashboard/patient/panels/TherapyPanel";
import ScreeningPanel     from "../dashboard/patient/panels/ScreeningPanel";
import MedicationsPanel   from "../dashboard/patient/panels/MedicationsPanel";
import MessagesPanel      from "../dashboard/patient/panels/MessagesPanel";
import NotificationsPanel from "../dashboard/patient/panels/NotificationsPanel";
import ReportsPanel            from "../dashboard/patient/panels/ReportsPanel";
import AIRecommendationsPanel  from "../dashboard/patient/panels/AIRecommendationsPanel";
import ProfilePanel            from "../dashboard/patient/panels/ProfilePanel";
import SettingsPanel           from "../dashboard/patient/panels/SettingsPanel";

// Pages
import WaitingRoomPage from "../features/appointment/pages/WaitingRoomPage";

const patientRoutes = (
  <Route
    path="/patient/dashboard"
    element={
      <ProtectedRoute allowedRoles={["patient", "family"]} loginPath="/login/patient">
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <PatientDashboard />
        </div>
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="home" replace />} />
    <Route path="home"          element={<HomePanel />} />
    <Route path="appointments"  element={<AppointmentsPanel />} />
    <Route path="recovery"      element={<RecoveryPanel />} />
    <Route path="therapy"       element={<TherapyPanel />} />
    <Route path="screening"     element={<ScreeningPanel />} />
    <Route path="medications"   element={<MedicationsPanel />} />
    <Route path="messages"      element={<MessagesPanel />} />
    <Route path="notifications" element={<NotificationsPanel />} />
    <Route path="profile"       element={<ProfilePanel />} />
    <Route path="settings"      element={<SettingsPanel />} />
    <Route path="reports"              element={<ReportsPanel />} />
    <Route path="ai-recommendations"  element={<AIRecommendationsPanel />} />
  </Route>
);

// Waiting room route (outside dashboard layout)
const waitingRoomRoute = (
  <Route
    path="/patient/waiting-room/:appointmentId"
    element={
      <ProtectedRoute allowedRoles={["patient", "family"]} loginPath="/login/patient">
        <WaitingRoomPage />
      </ProtectedRoute>
    }
  />
);

export { patientRoutes, waitingRoomRoute };
export default patientRoutes;