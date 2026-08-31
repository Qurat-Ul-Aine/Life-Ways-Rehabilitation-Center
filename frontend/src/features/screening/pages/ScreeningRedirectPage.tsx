import { Navigate } from "react-router-dom";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";

export default function ScreeningRedirectPage() {
  return <Navigate to={SCREENING_ROUTES.intro} replace />;
}
