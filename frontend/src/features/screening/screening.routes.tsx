import { Route } from "react-router-dom";
import AssessmentTypePage from "@/features/screening/pages/AssessmentTypePage";
import BasicInfoPage from "@/features/screening/pages/BasicInfoPage";
import ConditionSelectionPage from "@/features/screening/pages/ConditionSelectionPage";
import QuestionnairePage from "@/features/screening/pages/QuestionnairePage";
import ScreeningIntroPage from "@/features/screening/pages/ScreeningIntroPage";
import ScreeningRedirectPage from "@/features/screening/pages/ScreeningRedirectPage";
import ScreeningResultPage from "@/features/screening/pages/ScreeningResultPage";

/**
 * Public screening flow — no login required (SRS-152).
 * Logged-in patients are linked automatically via optional JWT on submit.
 */
export const screeningPublicRoutes = (
  <>
    <Route path="/screening/intro" element={<ScreeningIntroPage />} />
    <Route path="/screening/assessment-type" element={<AssessmentTypePage />} />
    <Route path="/screening/basic-info" element={<BasicInfoPage />} />
    <Route path="/screening/conditions" element={<ConditionSelectionPage />} />
    <Route path="/screening/questions" element={<QuestionnairePage />} />
    <Route path="/screening/result/:id" element={<ScreeningResultPage />} />
    <Route path="/screening" element={<ScreeningRedirectPage />} />
  </>
);
