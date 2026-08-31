import axios from "axios";
import api from "@/lib/api";
import { normalizeAppRole, type AppRole } from "@/lib/rbac";
import type {
  ApiResponse,
  AuthResponse,
  ForgotPasswordResult,
  LoginPayload,
  RegisterPayload,
  RegisterResponse,
  ValidateResetTokenResult,
} from "../auth.types";
import type {
  MySecurityQuestionsStatus,
  ResetSecurityQuestionsResponse,
  SecurityQuestionAnswer,
  SecurityQuestionsCatalog,
  VerifySecurityAnswersResult,
} from "../securityQuestions.types";

const toErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    if (error.code === "ERR_NETWORK" || !error.response) {
      return "Cannot reach the server. Make sure the backend is running and CORS allows this site URL.";
    }
  }
  return "Request failed. Please try again.";
};

const unwrap = async <T>(request: Promise<{ data: T }>): Promise<T> => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
};

const ok = <T,>(data: T, message = "OK"): ApiResponse<T> => ({
  success: true,
  message,
  data,
});

export const authService = {
  // ✅ FIX: unwrap returns ApiResponse<AuthResponse>
  // .data se AuthResponse { token, user } milta hai
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await unwrap(api.post<ApiResponse<AuthResponse>>("/auth/login", payload));
    return res.data as AuthResponse;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const res = await unwrap<ApiResponse<RegisterResponse>>(
      api.post<ApiResponse<RegisterResponse>>("/auth/register", payload),
    );
    if (!res.data?.user) {
      throw new Error(res.message || "Registration failed.");
    }
    return res.data;
  },

  async forgotPassword(email: string): Promise<ApiResponse<ForgotPasswordResult>> {
    const body = await unwrap<ApiResponse<ForgotPasswordResult>>(
      api.post<ApiResponse<ForgotPasswordResult>>("/auth/forgot-password", { email }),
    );
    return body;
  },

  async getSecurityQuestionCatalog(): Promise<SecurityQuestionsCatalog> {
    const res = await unwrap<ApiResponse<SecurityQuestionsCatalog>>(
      api.get<ApiResponse<SecurityQuestionsCatalog>>("/auth/security-questions/catalog"),
    );
    return res.data ?? { questions: [] };
  },

  async getResetSecurityQuestions(email: string): Promise<ResetSecurityQuestionsResponse> {
    const res = await unwrap<ApiResponse<ResetSecurityQuestionsResponse>>(
      api.post<ApiResponse<ResetSecurityQuestionsResponse>>(
        "/auth/forgot-password/security-questions",
        { email },
      ),
    );
    return res.data ?? { questions: [] };
  },

  async verifySecurityAnswers(
    email: string,
    answers: SecurityQuestionAnswer[],
  ): Promise<VerifySecurityAnswersResult> {
    const res = await unwrap<ApiResponse<VerifySecurityAnswersResult>>(
      api.post<ApiResponse<VerifySecurityAnswersResult>>("/auth/verify-security-answers", {
        email,
        answers,
      }),
    );
    if (!res.data?.resetToken) {
      throw new Error("Verification succeeded but reset token was not issued.");
    }
    return res.data;
  },

  async getMySecurityQuestions(): Promise<MySecurityQuestionsStatus> {
    const res = await unwrap<ApiResponse<MySecurityQuestionsStatus>>(
      api.get<ApiResponse<MySecurityQuestionsStatus>>("/auth/security-questions/me"),
    );
    return (
      res.data ?? {
        configured: false,
        questions: [],
        catalog: [],
        requiredCount: 2,
      }
    );
  },

  setMySecurityQuestions(answers: SecurityQuestionAnswer[]): Promise<ApiResponse> {
    return unwrap(api.put<ApiResponse>("/auth/security-questions/me", { answers }));
  },

  async validateResetToken(token: string): Promise<ValidateResetTokenResult> {
    const encoded = encodeURIComponent(token.trim());
    const body = await unwrap<ApiResponse<ValidateResetTokenResult>>(
      api.get<ApiResponse<ValidateResetTokenResult>>(`/auth/validate-reset-token/${encoded}`),
    );
    return body.data ?? { valid: false, expired: false, used: false };
  },

  resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return unwrap(
      api.post<ApiResponse>("/auth/reset-password", {
        token: token.trim(),
        newPassword,
      }),
    );
  },

  changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
    return unwrap(api.put<ApiResponse>("/auth/change-password", { oldPassword, newPassword }));
  },

  logout(): Promise<ApiResponse> {
    return Promise.resolve(ok(undefined, "Logged out successfully."));
  },

  suspendAccount(userId: string): Promise<ApiResponse> {
    return unwrap(api.patch<ApiResponse>(`/auth/admin/users/${userId}/disable`));
  },

  reactivateAccount(userId: string): Promise<ApiResponse> {
    return unwrap(api.patch<ApiResponse>(`/auth/admin/users/${userId}/enable`));
  },

  async listUsers(params?: { search?: string; role?: string }): Promise<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      role: AppRole;
      isActive: boolean;
      createdAt?: string | null;
    }>;
  }> {
    const res = await unwrap(
      api.get<ApiResponse<{ items: Array<Record<string, unknown>> }>>("/auth/admin/users", {
        params,
      }),
    );
    const items = (res.data?.items ?? []) as Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt?: string | null;
    }>;
    return {
      items: items.map((item) => ({
        ...item,
        role: normalizeAppRole(item.role),
      })),
    };
  },
};