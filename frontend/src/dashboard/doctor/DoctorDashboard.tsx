import { Navigate, useLocation } from "react-router-dom";
import { DoctorDashboardProvider } from "@/dashboard/doctor/hooks/DoctorDashboardContext";
import DoctorLayout from "./DoctorLayout";

/** Doctor portal shell — provider + layout; child routes mount from App.tsx. */
export default function DoctorDashboard() {
  const location = useLocation();

  if (location.pathname === "/doctor" || location.pathname === "/doctor/") {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  return (
    <DoctorDashboardProvider>
      <DoctorLayout />
    </DoctorDashboardProvider>
  );
}
