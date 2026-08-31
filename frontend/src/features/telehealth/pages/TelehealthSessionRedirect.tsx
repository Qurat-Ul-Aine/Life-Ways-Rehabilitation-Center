import { Navigate, useParams } from "react-router-dom";

/** Legacy route: /patient/telehealth-session/:id → /session/:id */
export default function TelehealthSessionRedirect() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  if (!appointmentId) {
    return <Navigate to="/patient/dashboard/appointments" replace />;
  }
  return <Navigate to={`/session/${appointmentId}`} replace />;
}
