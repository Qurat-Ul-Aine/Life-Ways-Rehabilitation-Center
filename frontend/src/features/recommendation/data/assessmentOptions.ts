export const OTHER_OPTION = "__other__";

export type AssessmentOption = {
  value: string;
  label: string;
};

export const PRIMARY_CONDITIONS: AssessmentOption[] = [
  { value: "anxiety", label: "Anxiety Disorder" },
  { value: "depression", label: "Depression" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "ptsd_trauma", label: "PTSD / Trauma" },
  { value: "addiction_substance", label: "Addiction / Substance Use" },
  { value: "alcohol_dependency", label: "Alcohol Dependency" },
  { value: "opioid_dependency", label: "Opioid Dependency" },
  { value: "psychotic_disorder", label: "Schizophrenia / Psychotic Disorder" },
  { value: "adhd", label: "ADHD" },
  { value: "autism_neurodiversity", label: "Autism / Neurodiversity" },
  { value: "eating_disorder", label: "Eating Disorder" },
  { value: "sleep_disorder", label: "Insomnia / Sleep Disorder" },
  { value: "chronic_pain", label: "Chronic Pain" },
  { value: "mobility_rehab", label: "Mobility / Physical Rehabilitation" },
  { value: "stroke_recovery", label: "Stroke Recovery" },
  { value: "speech_communication", label: "Speech / Communication Disorder" },
  { value: "child_behavioral", label: "Child Behavioral Concerns" },
  { value: "grief_loss", label: "Grief & Loss" },
  { value: "stress_burnout", label: "Stress & Burnout" },
  { value: OTHER_OPTION, label: "Other" },
];

export const SYMPTOM_OPTIONS: AssessmentOption[] = [
  { value: "low_mood", label: "Low mood / sadness" },
  { value: "anxiety_worry", label: "Anxiety / worry" },
  { value: "panic_attacks", label: "Panic attacks" },
  { value: "sleep_problems", label: "Sleep problems" },
  { value: "fatigue", label: "Fatigue" },
  { value: "appetite_changes", label: "Loss of appetite / overeating" },
  { value: "mood_swings", label: "Mood swings" },
  { value: "irritability", label: "Irritability" },
  { value: "concentration", label: "Difficulty concentrating" },
  { value: "social_withdrawal", label: "Social withdrawal" },
  { value: "cravings", label: "Cravings / urges" },
  { value: "hallucinations", label: "Hallucinations" },
  { value: "paranoia", label: "Paranoia" },
  { value: "physical_pain", label: "Physical pain" },
  { value: "reduced_mobility", label: "Reduced mobility" },
  { value: "memory_problems", label: "Memory problems" },
  { value: "aggression", label: "Aggression / anger" },
  { value: "self_harm_thoughts", label: "Self-harm thoughts" },
  { value: "suicidal_thoughts", label: "Suicidal thoughts" },
  { value: OTHER_OPTION, label: "Other" },
];

export const MEDICAL_HISTORY_OPTIONS: AssessmentOption[] = [
  { value: "psychiatric_hospitalization", label: "Previous psychiatric hospitalization" },
  { value: "addiction_treatment", label: "Previous addiction treatment" },
  { value: "chronic_illness", label: "Chronic illness (diabetes, hypertension, etc.)" },
  { value: "heart_disease", label: "Heart disease" },
  { value: "liver_disease", label: "Liver disease" },
  { value: "kidney_disease", label: "Kidney disease" },
  { value: "epilepsy", label: "Epilepsy / seizures" },
  { value: "thyroid", label: "Thyroid disorder" },
  { value: "previous_surgery", label: "Previous surgery" },
  { value: "pregnancy_postpartum", label: "Pregnancy / postpartum" },
  { value: "family_mental_illness", label: "Family history of mental illness" },
  { value: "family_addiction", label: "Family history of addiction" },
  { value: "none_significant", label: "No significant medical history" },
  { value: OTHER_OPTION, label: "Other" },
];

export const MEDICATION_OPTIONS: AssessmentOption[] = [
  { value: "antidepressants", label: "Antidepressants (SSRIs / SNRIs)" },
  { value: "antipsychotics", label: "Antipsychotics" },
  { value: "mood_stabilizers", label: "Mood stabilizers" },
  { value: "anti_anxiety", label: "Anti-anxiety medications" },
  { value: "sleep_aids", label: "Sleep aids" },
  { value: "adhd_meds", label: "ADHD medications" },
  { value: "opioid_replacement", label: "Opioid replacement therapy" },
  { value: "pain_medications", label: "Pain medications" },
  { value: "blood_pressure", label: "Blood pressure medications" },
  { value: "diabetes_meds", label: "Diabetes medications" },
  { value: "vitamins_supplements", label: "Vitamins / supplements" },
  { value: "none", label: "Not currently on medication" },
  { value: OTHER_OPTION, label: "Other" },
];

export const ALLERGY_OPTIONS: AssessmentOption[] = [
  { value: "penicillin", label: "Penicillin" },
  { value: "sulfa", label: "Sulfa drugs" },
  { value: "nsaids", label: "NSAIDs (aspirin, ibuprofen)" },
  { value: "opioids", label: "Opioids" },
  { value: "latex", label: "Latex" },
  { value: "food", label: "Food allergies" },
  { value: "environmental", label: "Environmental allergies" },
  { value: "none_known", label: "No known allergies" },
  { value: OTHER_OPTION, label: "Other" },
];

export function getOptionLabel(options: AssessmentOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatSelections(
  selected: string[],
  options: AssessmentOption[],
  otherText?: string,
): string {
  const labels = selected
    .filter((value) => value !== OTHER_OPTION)
    .map((value) => getOptionLabel(options, value));

  if (selected.includes(OTHER_OPTION) && otherText?.trim()) {
    labels.push(otherText.trim());
  }

  return labels.join("; ");
}

export function formatPrimaryCondition(
  value: string,
  otherText: string | undefined,
  options: AssessmentOption[],
): string {
  if (!value) return "";
  if (value === OTHER_OPTION) return otherText?.trim() ?? "";
  return getOptionLabel(options, value);
}

export function resolveConditionFromProfile(
  condition: string,
  options: AssessmentOption[] = PRIMARY_CONDITIONS,
): { value: string; other: string } {
  const trimmed = condition.trim();
  if (!trimmed) return { value: "", other: "" };

  const exact = options.find(
    (o) =>
      o.value !== OTHER_OPTION
      && (o.label.toLowerCase() === trimmed.toLowerCase() || o.value === trimmed),
  );
  if (exact) return { value: exact.value, other: "" };

  const fuzzy = options.find(
    (o) =>
      o.value !== OTHER_OPTION
      && (trimmed.toLowerCase().includes(o.label.toLowerCase())
        || o.label.toLowerCase().includes(trimmed.toLowerCase())),
  );
  if (fuzzy) return { value: fuzzy.value, other: "" };

  return { value: OTHER_OPTION, other: trimmed };
}
