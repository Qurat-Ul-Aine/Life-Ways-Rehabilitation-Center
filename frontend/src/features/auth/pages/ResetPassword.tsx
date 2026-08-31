import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { authService } from "../services/authService";
import { readResetTokenFromLocation } from "../utils/resetToken";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";

type TokenState = "loading" | "valid" | "invalid" | "expired" | "used";

function ResetLinkError({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardContent className="px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <Button asChild className="mt-6 w-full">
            <Link to="/forgot-password">Request a new reset link</Link>
          </Button>
          <Link
            to="/login/patient"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token: pathToken } = useParams<{ token?: string }>();

  const token = readResetTokenFromLocation(pathToken, searchParams);

  const [tokenState, setTokenState] = useState<TokenState>(token ? "loading" : "invalid");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountRole, setAccountRole] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }

    let cancelled = false;

    const validate = async () => {
      setTokenState("loading");
      try {
        const result = await authService.validateResetToken(token);
        if (cancelled) return;

        if (result.valid) {
          setTokenState("valid");
          setAccountRole(result.role ?? null);
        } else if (result.used) {
          setTokenState("used");
        } else if (result.expired) {
          setTokenState("expired");
        } else {
          setTokenState("invalid");
        }
      } catch {
        if (!cancelled) setTokenState("invalid");
      }
    };

    void validate();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || tokenState !== "valid") {
      toast.error("This reset link is no longer valid.");
      return;
    }

    if (!isValidPassword(newPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, newPassword);
      const loginPath =
        accountRole === "doctor"
          ? "/login/doctor"
          : accountRole === "admin"
            ? "/login/admin"
            : "/login/patient";
      navigate("/reset-password/success", { replace: true, state: { loginPath } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || tokenState === "invalid") {
    return (
      <ResetLinkError
        title="Invalid reset link"
        description="This password reset link is missing, invalid, or has already been used. Please request a new link."
      />
    );
  }

  if (tokenState === "expired") {
    return (
      <ResetLinkError
        title="Reset link expired"
        description="This password reset link has expired after 1 hour. Please request a new reset link to continue."
      />
    );
  }

  if (tokenState === "used") {
    return (
      <ResetLinkError
        title="Reset link already used"
        description="This password reset link has already been used. If you requested a newer link, use the most recent email. Otherwise, request a new reset link."
      />
    );
  }

  if (tokenState === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <Card className="w-full max-w-md border-border/60 shadow-xl">
          <CardContent className="space-y-4 px-8 py-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
            </div>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardContent className="px-8 pb-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Create a strong new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 pr-10 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 pr-10 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword ? (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>

            <Button type="submit" className="h-12 w-full text-base font-semibold touch-manipulation" disabled={isSubmitting}>
              {isSubmitting ? "Updating password..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
