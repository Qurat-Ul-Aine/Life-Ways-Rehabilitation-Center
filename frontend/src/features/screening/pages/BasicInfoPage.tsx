import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import ScreeningLayout, { ScreeningNav } from "@/features/screening/components/ScreeningLayout";
import { GENDER_OPTIONS } from "@/features/screening/data/genders";
import { SCREENING_FLOW_STEPS } from "@/features/screening/data/flowSteps";
import { SCREENING_ROUTES } from "@/features/screening/data/routes";
import { getScreeningSession, setScreeningSession } from "@/features/screening/utils/screeningSession";
import { validateBasicInfo } from "@/features/screening/validation/basicInfo.validation";

export default function BasicInfoPage() {
  const navigate = useNavigate();
  const session = getScreeningSession();
  const [age, setAge] = useState(session.age ?? "");
  const [gender, setGender] = useState(session.gender ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session.assessmentType) {
      navigate(SCREENING_ROUTES.assessmentType, { replace: true });
    }
  }, [navigate, session.assessmentType]);

  const forOther = session.assessmentType === "other";

  const handleContinue = () => {
    const validationError = validateBasicInfo({ age, gender });
    if (validationError) {
      setError(validationError);
      return;
    }
    setScreeningSession({ age: String(Number(age)), gender });
    navigate(SCREENING_ROUTES.conditions);
  };

  return (
    <ScreeningLayout
      step={SCREENING_FLOW_STEPS.basicInfo}
      totalSteps={SCREENING_FLOW_STEPS.total}
      title={forOther ? "About the Person Being Assessed" : "About You"}
    >
      <p className="text-sm text-slate-400">
        {forOther
          ? "Provide basic demographic information for the person you are screening."
          : "Provide basic demographic information to help contextualize your screening results."}
      </p>

      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="age">{forOther ? "Their age *" : "Your age *"}</Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter age"
              className="border-slate-700 bg-slate-950"
            />
          </div>
          <div className="space-y-2">
            <Label>{forOther ? "Their gender *" : "Your gender *"}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="border-slate-700 bg-slate-950">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
      <ScreeningNav
        onBack={() => navigate(SCREENING_ROUTES.assessmentType)}
        onNext={handleContinue}
      />
    </ScreeningLayout>
  );
}
