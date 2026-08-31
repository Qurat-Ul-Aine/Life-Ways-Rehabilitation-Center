export type AssessmentType = "self" | "other";
export type RiskLevel = "low" | "moderate" | "high";

export interface ScreeningIntroConfig {
  title: string;
  subtitle: string;
  purpose: string;
  confidentialityNote: string;
  instructions: string[];
  scoringExplanation: string;
  disclaimer: string;
  estimatedMinutes: string;
  stats: { value: string; label: string }[];
  bulletPoints: string[];
}

export interface ScreeningCondition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface QuestionOption {
  label: string;
  score: number;
}

export interface ScreeningQuestion {
  id: string;
  conditionId: string;
  sectionTitle: string | null;
  text: string;
  type: string;
  options: QuestionOption[];
  sortOrder: number;
  isRequired: boolean;
  scoringWeight: number;
  skipLogic?: unknown;
}

export interface ScreeningSession {
  age?: string;
  gender?: string;
  conditionId?: string;
  conditionSlug?: string;
  assessmentType?: AssessmentType;
}

export interface ScreeningAnswerInput {
  questionId: string;
  value: string;
}

export interface ScreeningResult {
  id: string;
  patientId: string | null;
  condition: { id?: string; slug?: string; name?: string } | null;
  assessmentType: string | null;
  age: number | null;
  gender: string | null;
  score: number | null;
  riskLevel: RiskLevel | null;
  risk_level: string | null;
  status: string | null;
  explanation: string | null;
  title: string | null;
  description: string | null;
  recommendations: string[];
  answers: {
    questionId: string;
    questionText: string | null;
    sectionTitle: string | null;
    answerValue: string;
    score: number | null;
  }[];
  testDate: string | null;
}

export interface AdminScreeningItem {
  id: string;
  patientId: string | null;
  patientName: string;
  patientEmail: string | null;
  condition: string;
  conditionSlug: string;
  score: number | null;
  riskLevel: RiskLevel | null;
  assessmentType: string | null;
  age: number | null;
  gender: string | null;
  status: string | null;
  flagged: boolean;
  testDate: string | null;
  assignedDoctor: string | null;
}

export interface AdminScreeningStats {
  totalScreenings: number;
  completedScreenings: number;
  pendingScreenings: number;
  highRiskCount: number;
  conditionDistribution: { condition: string; count: number }[];
  riskDistribution: { riskLevel: string; count: number }[];
}

export interface AdminScreeningAnalytics {
  trends: { date: string; count: number; highRisk: number }[];
  averageScoreByCondition: { condition: string; averageScore: number; count: number }[];
  riskTrend: Record<string, number>;
}

export interface AdminScreeningDetail extends ScreeningResult {
  flagged?: boolean;
  patient: {
    id: string | null;
    name: string;
    email: string | null;
    age: number | null;
    gender: string | null;
  };
  assignedDoctor: { id: string; name: string; email: string } | null;
  scoringBreakdown: {
    questionId: string;
    questionText: string;
    sectionTitle: string | null;
    answerValue: string;
    score: number;
    weight: number;
  }[];
}

export interface PatientScreeningHistoryItem {
  id: string;
  condition: string;
  score: number | null;
  riskLevel: RiskLevel | string | null;
  assessmentType: string | null;
  testDate: string | null;
  status: string | null;
  flagged?: boolean;
  followUpDate?: string | null;
}
