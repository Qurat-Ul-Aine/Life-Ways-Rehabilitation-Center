import type { AuthRole } from "@/context/AuthContext";

export type TherapyPermissions = {
  canViewSessionNotes: boolean;
  canAddSessionNotes: boolean;
  canEditSessionNotes: boolean;
  canDeleteSessionNotes: boolean;
  canViewConfidentialNotes: boolean;
  canManageExercises: boolean;
  canEditTherapyPlan: boolean;
  canDeleteTherapyPlan: boolean;
  canCreateTherapyPlan: boolean;
};

/** Role-based therapy permissions — mirrors backend assert* checks. */
export function getTherapyPermissions(role: AuthRole | string): TherapyPermissions {
  const r = String(role).toLowerCase();
  const isAdmin = r === "admin";
  const isDoctor = r === "doctor";

  return {
    canViewSessionNotes: isAdmin || isDoctor,
    canAddSessionNotes: isDoctor,
    canEditSessionNotes: isDoctor,
    canDeleteSessionNotes: isDoctor,
    canViewConfidentialNotes: isAdmin || isDoctor,
    canManageExercises: isAdmin || isDoctor,
    canEditTherapyPlan: isAdmin || isDoctor,
    canDeleteTherapyPlan: isAdmin,
    canCreateTherapyPlan: isAdmin || isDoctor,
  };
}
