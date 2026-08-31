export interface SecurityQuestionAnswer {
  questionKey: string;
  answer: string;
}

export interface SecurityQuestionOption {
  key: string;
  label: string;
}

export interface SecurityQuestionsCatalog {
  questions: SecurityQuestionOption[];
}

export interface ResetSecurityQuestionsResponse {
  questions: SecurityQuestionOption[];
}

export interface VerifySecurityAnswersResult {
  resetToken: string;
  devResetLink?: string;
}

export interface MySecurityQuestionsStatus {
  configured: boolean;
  questions: SecurityQuestionOption[];
  catalog: SecurityQuestionOption[];
  requiredCount: number;
}
