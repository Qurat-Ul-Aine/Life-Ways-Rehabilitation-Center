import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { buildLoginPath } from "@/lib/authRedirect";
import { roleAllows } from "@/lib/rbac";

export type UserRole = "admin" | "doctor" | "patient" | "staff" | "family" | "intern";

type ProtectedRouteProps = {
  allowedRoles: string[];
  loginPath?: string;
  children: ReactNode;
};

export default function ProtectedRoute({ allowedRoles, loginPath, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

 

  if (isLoading) {
    return (
      <div
        className="container mx-auto max-w-2xl space-y-4 px-4 py-16"
        aria-busy="true"
        aria-live="polite"
      >
        <Skeleton className="h-10 w-[75%] max-w-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const target = loginPath
      ? buildLoginPath(loginPath, `${location.pathname}${location.search}${location.hash}`)
      : "/login";
    return <Navigate to={target} replace />;
  }

  if (!user) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ FIXED: role comparison case-insensitive karo
  // DB se "ADMIN"/"DOCTOR"/"PATIENT" aata hai, allowedRoles mein "admin"/"doctor"/"patient" hote hain
  const userRoleNorm = user.role.toLowerCase();
  if (!roleAllows(userRoleNorm, allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}