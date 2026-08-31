export interface LoginPayload {
  email: string;
  password: string;
}

export type RegisterRole = "patient" | "family";

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: RegisterRole;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  securityQuestions?: Array<{ questionKey: string; answer: string }>;
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ForgotPasswordResult {
  devResetLink?: string;
}

export interface ValidateResetTokenResult {
  valid: boolean;
  expired: boolean;
  used?: boolean;
  role?: string | null;
}
