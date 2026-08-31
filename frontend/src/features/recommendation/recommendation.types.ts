import {
  ALLERGY_OPTIONS,
  MEDICAL_HISTORY_OPTIONS,
  MEDICATION_OPTIONS,
  OTHER_OPTION,
  PRIMARY_CONDITIONS,
  SYMPTOM_OPTIONS,
  formatPrimaryCondition,
  formatSelections,
} from "./data/assessmentOptions";

export interface RecoveryJourneyMilestone {
  timeframe: string;
  title: string;
  description: string;
}

export interface RehabilitationService {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
}

export type DoctorAvailability = "AVAILABLE" | "UNAVAILABLE" | string;

export interface RecommendedDoctor {
  id: string;
  name: string;
  email: string;
  specialization: string;
  qualification: string;
  experience: number;
  successRate: number;
  patientsTreated: number;
  rating: number | null;
  availability: DoctorAvailability;
  imageUrl?: string | null;
  gender?: string | null;
  services: Array<{ id: string; slug: string; title: string }>;
}

export interface DoctorRecommendation {
  id: string | null;
  patientId: string | null;
  doctorId: string;
  score: number;
  reason: string;
  createdAt?: string | null;
  doctor: RecommendedDoctor | null;
  rankingFactors?: string[];
}

export interface AIAnalysisRecord {
  id: string;
  patientId: string;
  symptoms: string;
  symptomsDisplay?: string | null;
  medicalHistoryDisplay?: string | null;
  detectedIssue: string;
  medicalHistorySummary?: string | null;
  confidenceScore: number;
  selectedDoctorId?: string | null;
  selectedDoctor?: RecommendedDoctor | null;
  createdAt: string;
}

export type RecommendationJourneyStatus =
  | "Assessment Complete"
  | "Doctor Selected"
  | "Appointment Booked"
  | "Treatment Started"
  | "Progress Updated";

export interface RecommendationTimelineStep {
  step: string;
  key: string;
  completed: boolean;
}

export interface RecommendationJourney {
  status: RecommendationJourneyStatus | string;
  selectedDoctorId: string | null;
  selectedDoctor: RecommendedDoctor | null;
  appointmentStatus: string;
  appointmentDate?: string | null;
  hasActiveTreatment: boolean;
  hasProgress: boolean;
}

export interface CurrentRecommendationBundle {
  analysis: AIAnalysisRecord;
  recommendations: DoctorRecommendation[];
  recommendedDoctorsCount: number;
  journey: RecommendationJourney;
  timeline: RecommendationTimelineStep[];
  recoveryJourney?: RecoveryJourneyMilestone[];
  estimatedDuration?: string | null;
}

export interface RecommendationHistoryRow {
  id: string;
  date: string;
  condition: string;
  recommendedDoctorsCount: number;
  selectedDoctor: RecommendedDoctor | null;
  status: string;
  appointmentStatus: string;
}

export interface PatientRecommendationsDashboard {
  current: CurrentRecommendationBundle | null;
  history: RecommendationHistoryRow[];
  totalAssessments: number;
}

export interface ClinicalAnalysis {
  conditionType: string;
  severityLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  reasoning: string;
  source: "dss" | "fallback";
  confidenceScore?: number;
  persisted?: AIAnalysisRecord | null;
}

export interface RecommendationListResult {
  items: DoctorRecommendation[];
  analysis: AIAnalysisRecord | null;
  total: number;
}

export interface GenerateRecommendationsResult {
  patientId: string | null;
  patientName: string | null;
  service: RehabilitationService | null;
  analysis: ClinicalAnalysis;
  recommendations: DoctorRecommendation[];
  total: number;
  recoveryJourney?: RecoveryJourneyMilestone[];
  estimatedDuration?: string | null;
}

export type ConsultationMode = "online" | "in-person" | "both";
export type PreferredDoctorGender = "no_preference" | "male" | "female";

export interface AssessmentFormData {
  age: string;
  gender: string;
  location: string;
  primaryCondition: string;
  primaryConditionOther: string;
  symptoms: string[];
  symptomsOther: string;
  medicalHistory: string[];
  medicalHistoryOther: string;
  currentMedications: string[];
  currentMedicationsOther: string;
  allergies: string[];
  allergiesOther: string;
  consultationMode: ConsultationMode;
  preferredDoctorGender: PreferredDoctorGender;
  preferredLanguage: string;
  genderOther: string;
  preferredLanguageOther: string;
}

export const EMPTY_ASSESSMENT_FORM: AssessmentFormData = {
  age: "",
  gender: "",
  location: "",
  primaryCondition: "",
  primaryConditionOther: "",
  symptoms: [],
  symptomsOther: "",
  medicalHistory: [],
  medicalHistoryOther: "",
  currentMedications: [],
  currentMedicationsOther: "",
  allergies: [],
  allergiesOther: "",
  consultationMode: "both",
  preferredDoctorGender: "no_preference",
  preferredLanguage: "English",
  genderOther: "",
  preferredLanguageOther: "",
};

export interface AssessmentPayload {
  age?: number;
  gender?: string;
  location?: string;
  primaryCondition?: string;
  symptoms?: string;
  medicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
  consultationMode?: ConsultationMode;
  preferredDoctorGender?: PreferredDoctorGender;
  preferredLanguage?: string;
  serviceSlug?: string;
  limit?: number;
  persist?: boolean;
}

export interface GenerateRecommendationsPayload extends AssessmentPayload {
  patientId?: string;
  serviceId?: string;
  condition?: string;
}

export interface AdminAiOverviewStats {
  totalRecommendations: number;
  recommendationsThisMonth: number;
  activePatients: number;
  aiUsageRate: number;
}

export interface AdminTopRecommendedDoctor {
  doctorId: string;
  name: string;
  specialization: string;
  recommendationCount: number;
  averageMatchScore: number;
}

export interface AdminCommonCondition {
  condition: string;
  assessmentCount: number;
  recommendationCount: number;
}

export interface AdminRecommendationLogRow {
  id: string;
  patientId: string;
  patientName: string;
  condition: string;
  recommendedDoctorsCount: number;
  selectedDoctor: string | null;
  matchScore: number | null;
  date: string;
  status: string;
}

export interface AdminRecommendationAnalytics {
  recommendationSuccessRate: number;
  appointmentConversionRate: number;
  successfulCategories: Array<{ category: string; count: number }>;
}

export interface AdminRecommendationManagement {
  overview: AdminAiOverviewStats;
  topDoctors: AdminTopRecommendedDoctor[];
  commonConditions: AdminCommonCondition[];
  analytics: AdminRecommendationAnalytics;
  logs: {
    items: AdminRecommendationLogRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filters: {
    conditions: string[];
  };
}

export type AdminRecommendationLogStatus =
  | "all"
  | "doctor_selected"
  | "appointment_booked"
  | "pending";

export interface AdminRecommendationQuery {
  search?: string;
  condition?: string;
  status?: AdminRecommendationLogStatus;
  page?: number;
  pageSize?: number;
}

export function buildAssessmentPayload(
  form: AssessmentFormData,
  extras: Partial<AssessmentPayload> = {},
): AssessmentPayload {
  const age = form.age.trim() ? Number(form.age) : undefined;

  return {
    age: age != null && !Number.isNaN(age) ? age : undefined,
    gender:
      form.gender === "other" && form.genderOther.trim()
        ? `other (${form.genderOther.trim()})`
        : form.gender || undefined,
    location: form.location.trim() || undefined,
    primaryCondition:
      formatPrimaryCondition(
        form.primaryCondition,
        form.primaryConditionOther,
        PRIMARY_CONDITIONS,
      ) || undefined,
    symptoms:
      formatSelections(form.symptoms, SYMPTOM_OPTIONS, form.symptomsOther) || undefined,
    medicalHistory:
      formatSelections(
        form.medicalHistory,
        MEDICAL_HISTORY_OPTIONS,
        form.medicalHistoryOther,
      ) || undefined,
    currentMedications:
      formatSelections(
        form.currentMedications,
        MEDICATION_OPTIONS,
        form.currentMedicationsOther,
      ) || undefined,
    allergies:
      formatSelections(form.allergies, ALLERGY_OPTIONS, form.allergiesOther) || undefined,
    consultationMode: form.consultationMode,
    preferredDoctorGender: form.preferredDoctorGender,
    preferredLanguage:
      form.preferredLanguage === "Other" && form.preferredLanguageOther.trim()
        ? form.preferredLanguageOther.trim()
        : form.preferredLanguage || undefined,
    ...extras,
  };
}

export function hasOtherWithoutText(selected: string[], otherText: string): boolean {
  return selected.includes(OTHER_OPTION) && !otherText.trim();
}
