import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { usePatientContext } from "@/dashboard/patient/hooks/usePatientContext";
import { cn } from "@/lib/utils";
import SearchableCombobox from "../components/SearchableCombobox";
import SearchableMultiSelect from "../components/SearchableMultiSelect";
import {
  ALLERGY_OPTIONS,
  MEDICAL_HISTORY_OPTIONS,
  MEDICATION_OPTIONS,
  OTHER_OPTION,
  PRIMARY_CONDITIONS,
  SYMPTOM_OPTIONS,
  resolveConditionFromProfile,
} from "../data/assessmentOptions";
import RecommendationDashboard from "./RecommendationDashboard";
import { recommendationService } from "../services/recommendationService";
import {
  EMPTY_ASSESSMENT_FORM,
  buildAssessmentPayload,
  hasOtherWithoutText,
  type AssessmentFormData,
  type GenerateRecommendationsResult,
} from "../recommendation.types";

const STEPS = [
  { id: 1, title: "About you", subtitle: "Basic details" },
  { id: 2, title: "Clinical details", subtitle: "Health & preferences" },
] as const;

function validateStep(step: number, form: AssessmentFormData): string | null {
  if (step === 1) {
    if (!form.age.trim()) return "Please enter your age.";
    if (Number.isNaN(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120) {
      return "Please enter a valid age.";
    }
    if (!form.gender) return "Please select your gender.";
    if (form.gender === "other" && !form.genderOther.trim()) {
      return "Please specify your gender.";
    }
    if (!form.location.trim()) return "Please enter your location.";
    return null;
  }

  if (!form.primaryCondition) return "Please select your primary condition.";
  if (
    form.primaryCondition === OTHER_OPTION
    && !form.primaryConditionOther.trim()
  ) {
    return "Please specify your primary condition.";
  }

  if (form.symptoms.length === 0) return "Please select at least one symptom.";
  if (hasOtherWithoutText(form.symptoms, form.symptomsOther)) {
    return "Please specify your other symptom(s).";
  }

  if (hasOtherWithoutText(form.medicalHistory, form.medicalHistoryOther)) {
    return "Please specify your other medical history.";
  }
  if (hasOtherWithoutText(form.currentMedications, form.currentMedicationsOther)) {
    return "Please specify your other medication(s).";
  }
  if (hasOtherWithoutText(form.allergies, form.allergiesOther)) {
    return "Please specify your other allergy/allergies.";
  }

  if (form.preferredLanguage === "Other" && !form.preferredLanguageOther.trim()) {
    return "Please specify your preferred language.";
  }

  return null;
}

export default function RecommendationForm() {
  const { isAuthenticated, user } = useAuth();
  const { profile } = usePatientContext();
  const isPatient = isAuthenticated && user?.role === "patient";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AssessmentFormData>(EMPTY_ASSESSMENT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [result, setResult] = useState<GenerateRecommendationsResult | null>(null);

  useEffect(() => {
    if (!profile) return;

    const resolved = profile.condition
      ? resolveConditionFromProfile(profile.condition)
      : { value: "", other: "" };

    setForm((prev) => ({
      ...prev,
      age: profile.age != null ? String(profile.age) : prev.age,
      gender: profile.gender || prev.gender,
      primaryCondition: resolved.value || prev.primaryCondition,
      primaryConditionOther: resolved.other || prev.primaryConditionOther,
    }));
  }, [profile]);

  const patch = (patchValues: Partial<AssessmentFormData>) => {
    setForm((prev) => ({ ...prev, ...patchValues }));
  };

  const goNext = () => {
    const error = validateStep(step, form);
    if (error) {
      toast.error(error);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    const error = validateStep(2, form);
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    setResultsOpen(true);
    setResult(null);

    try {
      const payload = buildAssessmentPayload(form, { limit: 5, persist: true });
      const response = isPatient
        ? await recommendationService.generate(payload)
        : await recommendationService.assess(payload);

      setResult(response);
    } catch (err) {
      setResultsOpen(false);
      toast.error(err instanceof Error ? err.message : "Could not generate recommendations.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <section className="bg-section-alt py-14 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            AI-Powered Matching
          </span>
          <h1 className="mt-3 mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">Find My Doctor</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Complete a short two-step assessment so we can match you with the right rehabilitation
            specialist at Life Ways.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <ol className="mb-8 grid grid-cols-2 gap-3">
            {STEPS.map((item) => {
              const isActive = step === item.id;
              const isDone = step > item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : isDone
                        ? "border-primary/30 bg-card"
                        : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                        isActive || isDone
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : item.id}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="assess-age">Age</Label>
                  <Input
                    id="assess-age"
                    type="number"
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={(e) => patch({ age: e.target.value })}
                    placeholder="e.g. 34"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assess-gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      patch({
                        gender: v,
                        genderOther: v === "other" ? form.genderOther : "",
                      })
                    }
                  >
                    <SelectTrigger id="assess-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.gender === "other" && (
                    <Input
                      id="assess-gender-other"
                      value={form.genderOther}
                      onChange={(e) => patch({ genderOther: e.target.value })}
                      placeholder="Please specify your gender"
                      aria-label="Gender — other"
                    />
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assess-location">Location</Label>
                  <Input
                    id="assess-location"
                    value={form.location}
                    onChange={(e) => patch({ location: e.target.value })}
                    placeholder="City, area, or clinic preference"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SearchableCombobox
                    id="assess-condition"
                    label="Primary condition"
                    options={PRIMARY_CONDITIONS}
                    value={form.primaryCondition}
                    onValueChange={(value) => patch({ primaryCondition: value })}
                    otherValue={form.primaryConditionOther}
                    onOtherValueChange={(value) => patch({ primaryConditionOther: value })}
                    placeholder="Search conditions…"
                    otherPlaceholder="Describe your condition"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <SearchableMultiSelect
                    id="assess-symptoms"
                    label="Symptoms"
                    options={SYMPTOM_OPTIONS}
                    values={form.symptoms}
                    onValuesChange={(values) => patch({ symptoms: values })}
                    otherValue={form.symptomsOther}
                    onOtherValueChange={(value) => patch({ symptomsOther: value })}
                    placeholder="Search and select symptoms…"
                    otherPlaceholder="Describe other symptoms"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <SearchableMultiSelect
                    id="assess-history"
                    label="Medical history"
                    options={MEDICAL_HISTORY_OPTIONS}
                    values={form.medicalHistory}
                    onValuesChange={(values) => patch({ medicalHistory: values })}
                    otherValue={form.medicalHistoryOther}
                    onOtherValueChange={(value) => patch({ medicalHistoryOther: value })}
                    placeholder="Search medical history…"
                    otherPlaceholder="Describe other medical history"
                  />
                </div>

                <div>
                  <SearchableMultiSelect
                    id="assess-meds"
                    label="Current medications"
                    options={MEDICATION_OPTIONS}
                    values={form.currentMedications}
                    onValuesChange={(values) => patch({ currentMedications: values })}
                    otherValue={form.currentMedicationsOther}
                    onOtherValueChange={(value) => patch({ currentMedicationsOther: value })}
                    placeholder="Search medication categories…"
                    otherPlaceholder="List other medications"
                  />
                </div>

                <div>
                  <SearchableMultiSelect
                    id="assess-allergies"
                    label="Allergies"
                    options={ALLERGY_OPTIONS}
                    values={form.allergies}
                    onValuesChange={(values) => patch({ allergies: values })}
                    otherValue={form.allergiesOther}
                    onOtherValueChange={(value) => patch({ allergiesOther: value })}
                    placeholder="Search allergy types…"
                    otherPlaceholder="Describe other allergies"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assess-mode">Preferred consultation mode</Label>
                  <Select
                    value={form.consultationMode}
                    onValueChange={(v) =>
                      patch({ consultationMode: v as AssessmentFormData["consultationMode"] })
                    }
                  >
                    <SelectTrigger id="assess-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online / Telehealth</SelectItem>
                      <SelectItem value="in-person">In person</SelectItem>
                      <SelectItem value="both">No preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assess-doc-gender">Preferred doctor gender</Label>
                  <Select
                    value={form.preferredDoctorGender}
                    onValueChange={(v) =>
                      patch({
                        preferredDoctorGender: v as AssessmentFormData["preferredDoctorGender"],
                      })
                    }
                  >
                    <SelectTrigger id="assess-doc-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_preference">No preference</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assess-language">Preferred language</Label>
                  <Select
                    value={form.preferredLanguage}
                    onValueChange={(v) =>
                      patch({
                        preferredLanguage: v,
                        preferredLanguageOther: v === "Other" ? form.preferredLanguageOther : "",
                      })
                    }
                  >
                    <SelectTrigger id="assess-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Urdu">Urdu</SelectItem>
                      <SelectItem value="Punjabi">Punjabi</SelectItem>
                      <SelectItem value="Pashto">Pashto</SelectItem>
                      <SelectItem value="Arabic">Arabic</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.preferredLanguage === "Other" && (
                    <Input
                      id="assess-language-other"
                      value={form.preferredLanguageOther}
                      onChange={(e) => patch({ preferredLanguageOther: e.target.value })}
                      placeholder="Please specify your language"
                      aria-label="Preferred language — other"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
              {step === 2 ? (
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step === 1 ? (
                <Button type="button" onClick={goNext} className="gap-1.5">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="gap-1.5"
                >
                  <Sparkles className={`h-4 w-4 ${submitting ? "animate-pulse" : ""}`} />
                  {submitting ? "Analyzing…" : "Get my recommendations"}
                </Button>
              )}
            </div>

            {!isPatient && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Log in as a patient to save recommendations to your health record.
              </p>
            )}
          </div>
        </div>
      </section>

      <RecommendationDashboard
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        result={result}
        loading={submitting}
      />
    </div>
  );
}
