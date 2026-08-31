import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

/** Role-aware entry point for /reports */
export default function ReportsRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login/patient" replace />;
  }

  switch (user.role) {
    case "admin":
      return <Navigate to="/admin/reports" replace />;
    case "doctor":
      return <Navigate to="/doctor/reports" replace />;
    case "patient":
      return <Navigate to="/patient/dashboard/reports" replace />;
    case "family":
      return <Navigate to="/patient/dashboard/reports" replace />;
    case "staff":
      return <Navigate to="/unauthorized" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}
