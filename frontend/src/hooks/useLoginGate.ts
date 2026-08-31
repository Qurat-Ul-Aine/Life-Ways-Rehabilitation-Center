import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const PATIENT_ROLES = new Set(["patient", "family", "user"]);

export function useLoginGate() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);

  const canAccessPatientFeatures = Boolean(
    isAuthenticated && user && PATIENT_ROLES.has(user.role.toLowerCase()),
  );

  const requirePatientAuth = useCallback(
    (onAllowed?: () => void) => {
      if (canAccessPatientFeatures) {
        onAllowed?.();
        return true;
      }
      setOpen(true);
      return false;
    },
    [canAccessPatientFeatures],
  );

  return {
    canAccessPatientFeatures,
    requirePatientAuth,
    loginDialogOpen: open,
    setLoginDialogOpen: setOpen,
  };
}
