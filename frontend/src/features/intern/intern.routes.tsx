import { lazy } from "react";
import { Navigate, Route, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import ProtectedRoute from "@/routes/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

const InternList = lazy(() => import("@/features/intern/pages/InternList"));
const AddIntern = lazy(() => import("@/features/intern/pages/AddIntern"));
const EditIntern = lazy(() => import("@/features/intern/pages/EditIntern"));
const InternProfile = lazy(() => import("@/features/intern/pages/InternProfile"));
const InternSignup = lazy(() => import("@/features/intern/pages/InternSignup"));
const InternLogin = lazy(() => import("@/features/intern/pages/InternLogin"));
const InternshipsPage = lazy(() => import("@/features/intern/pages/InternshipsPage"));

function InternProfileRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/interns/${id ?? ""}`} replace />;
}

const adminOnly = (element: ReactNode) => (
  <ProtectedRoute allowedRoles={["admin"]} loginPath="/login/admin">
    <DashboardLayout>{element}</DashboardLayout>
  </ProtectedRoute>
);

/** Public intern routes — no auth required. */
export const internPublicRoutes = (
  <>
    <Route path="/intern/login" element={<InternLogin />} />
    <Route path="/intern/signup" element={<InternSignup />} />
    <Route path="/internships" element={<InternshipsPage />} />
  </>
);

/** Admin intern CRUD routes — mounted inside admin route tree. */
export const internAdminRoutes = (
  <>
    <Route path="/admin/interns" element={adminOnly(<InternList />)} />
    <Route path="/admin/interns/create" element={adminOnly(<AddIntern />)} />
    <Route path="/admin/interns/:id" element={adminOnly(<InternProfile />)} />
    <Route path="/admin/interns/:id/edit" element={adminOnly(<EditIntern />)} />
    <Route path="/admin/interns/add" element={<Navigate to="/admin/interns/create" replace />} />
    <Route path="/admin/interns/:id/profile" element={<InternProfileRedirect />} />
  </>
);

/** Legacy intern self-service redirects → dashboard panels. */
export const internLegacyRedirects = (
  <>
    <Route path="/intern/my-profile" element={<Navigate to="/intern/dashboard/profile" replace />} />
    <Route path="/intern/my-logs" element={<Navigate to="/intern/dashboard/training-logs" replace />} />
    <Route path="/intern/logs/add" element={<Navigate to="/intern/dashboard/training-logs" replace />} />
    <Route path="/intern/dashboard/summary" element={<Navigate to="/intern/dashboard/overview" replace />} />
  </>
);
