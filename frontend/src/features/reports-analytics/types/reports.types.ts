export interface ReportFilters {
  from?: string;
  to?: string;
  doctorId?: string;
  patientId?: string;
}

export interface SessionSummary {
  total: number;
  completed: number;
  missed: number;
  cancelled: number;
  scheduled?: number;
  attendanceRate: number;
  progressPercent?: number;
}

export interface TherapyDailyReport {
  summary: SessionSummary;
  daily: Array<SessionSummary & { date: string }>;
  patientBreakdown: Array<
    SessionSummary & {
      patientId: string;
      patientName: string;
      doctorName: string | null;
      progressPercent: number;
    }
  >;
  filters: ReportFilters;
}

export interface TherapyMonthlyReport {
  summary: SessionSummary;
  monthly: Array<SessionSummary & { month: string; progressPercent: number }>;
  patientBreakdown: Array<
    SessionSummary & {
      patientId: string;
      patientName: string;
      progressPercent: number;
    }
  >;
  filters: ReportFilters;
}

export interface DoctorPerformanceItem {
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  totalAssignedSessions: number;
  completedSessions: number;
  missedSessions: number;
  cancelledSessions?: number;
  attendanceRate: number;
  averageFeedbackRating: number;
  feedbackCount: number;
  rank?: number;
}

export interface DoctorPerformanceReport {
  summary: {
    totalAssignedSessions: number;
    completedSessions: number;
    missedSessions: number;
    attendanceRate: number;
    averageFeedbackRating: number;
  };
  doctors: DoctorPerformanceItem[];
  filters: ReportFilters;
}

export interface PatientPerformanceItem {
  patientId: string;
  patientName: string;
  progressPercent: number;
  milestones: { total: number; achieved: number; items: string[] };
  therapyResultsSummary: Array<{
    date: string | null;
    outcome: string | null;
    painLevel: number | null;
    notes: string | null;
  }>;
  sessionHistory: Array<{
    id: string;
    date: string | null;
    status: string | null;
    attendance: string | null;
    duration: number | null;
    outcome: string | null;
    painLevel: number | null;
  }>;
  attendanceRate: number;
  totalSessions: number;
  completedSessions: number;
  missedSessions: number;
  assignedDoctor: {
    doctorId: string;
    name: string | null;
    email: string | null;
    specialization: string | null;
  } | null;
}

export interface PatientPerformanceReport {
  summary: {
    patientCount: number;
    progressPercent: number;
    attendanceRate: number;
    totalSessions: number;
    completedSessions: number;
  };
  patients: PatientPerformanceItem[];
  filters: ReportFilters;
}

export type ExportReportType =
  | "therapy-daily"
  | "therapy-monthly"
  | "doctor"
  | "patient"
  | "financial";

export interface FinancialPaymentItem {
  id: string;
  patientId: string;
  patientName: string;
  amount: number;
  status: string;
  referenceNumber: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialInvoiceItem {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  amount: number;
  status: string;
  dueDate: string | null;
  issuedAt: string;
}

export interface FinancialMonthlyEarnings {
  month: string;
  revenue: number;
  outstanding: number;
  total: number;
  paymentCount: number;
}

export interface FinancialReport {
  summary: {
    revenue: number;
    outstandingPayments: number;
    totalInvoiced: number;
    paymentCount: number;
    overdueCount: number;
    pendingCount: number;
    successCount: number;
  };
  monthlyEarnings: FinancialMonthlyEarnings[];
  paymentHistory: FinancialPaymentItem[];
  invoices: FinancialInvoiceItem[];
  filters: ReportFilters;
}
