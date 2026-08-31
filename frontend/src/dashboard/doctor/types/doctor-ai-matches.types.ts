export interface DoctorAiMatchSummary {
  totalRecommendations: number;
  averageMatchScore: number;
  acceptedRecommendations: number;
  upcomingAppointments: number;
}

export interface DoctorAiMatchListItem {
  recommendationId: string;
  patientId: string;
  analysisId: string | null;
  patientName: string;
  age: number | null;
  gender: string | null;
  condition: string;
  matchScore: number;
  recommendationDate: string;
  reason: string;
  appointmentStatus: string;
  appointmentId: string | null;
  appointmentDate: string | null;
  accepted: boolean;
  severityLevel: string | null;
  urgentFlag: boolean;
  analysisSource: string | null;
}

export interface DoctorAiMatchAssessment {
  condition: string | null;
  symptoms: string | null;
  medicalHistory: string | null;
  currentMedications: string | null;
  allergies: string | null;
  consultationPreference: string | null;
  severityLevel: string | null;
  urgentFlag: boolean;
  analysisSource: string | null;
  location: string | null;
  preferredLanguage: string | null;
  preferredDoctorGender: string | null;
  estimatedDuration: string | null;
  symptomCount: number | null;
  confidenceScore: number | null;
  recoveryJourney:
    | Array<{
        timeframe?: string;
        title?: string;
        description?: string;
      }>
    | {
        title?: string;
        summary?: string;
        phases?: Array<{ name?: string; duration?: string; focus?: string }>;
      }
    | null;
}

export interface DoctorAiMatchNotes {
  assessmentNotes: string;
  treatmentNotes: string;
  progressNotes: string;
  updatedAt: string | null;
}

export interface DoctorAiMatchesResponse {
  summary: DoctorAiMatchSummary;
  items: DoctorAiMatchListItem[];
}

export interface DoctorAiMatchDetail {
  recommendationId: string;
  patientId: string;
  analysisId: string | null;
  patientName: string;
  patientEmail: string | null;
  age: number | null;
  gender: string | null;
  matchScore: number;
  recommendationDate: string;
  reason: string;
  accepted: boolean;
  appointmentStatus: string;
  appointmentId: string | null;
  appointmentDate: string | null;
  assessment: DoctorAiMatchAssessment;
  notes: DoctorAiMatchNotes;
}

export interface DoctorAiMatchNotesPayload {
  assessmentNotes?: string;
  treatmentNotes?: string;
  progressNotes?: string;
}
