import { Route } from "react-router-dom";
import OverviewPanel from "./panels/OverviewPanel";
import ProfilePanel from "./panels/ProfilePanel";
import ProgressPanel from "./panels/ProgressPanel";
import AttendancePanel from "./panels/AttendancePanel";
import TrainingLogsPanel from "./panels/TrainingLogsPanel";
import MentorPanel from "./panels/MentorPanel";
import NotificationsPanel from "./panels/NotificationsPanel";
import EvaluationsPanel from "./panels/EvaluationsPanel";

/** Nested intern dashboard routes — mount under `/intern/dashboard` in App.tsx. */
export const internDashboardRoutes = (
  <>
    <Route path="overview" element={<OverviewPanel />} />
    <Route path="profile" element={<ProfilePanel />} />
    <Route path="progress" element={<ProgressPanel />} />
    <Route path="attendance" element={<AttendancePanel />} />
    <Route path="training-logs" element={<TrainingLogsPanel />} />
    <Route path="mentor" element={<MentorPanel />} />
    <Route path="evaluations" element={<EvaluationsPanel />} />
    <Route path="notifications" element={<NotificationsPanel />} />
  </>
);

export default internDashboardRoutes;
