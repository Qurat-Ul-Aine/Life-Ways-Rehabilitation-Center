import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, HelpCircle, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { authService } from "../services/authService";
import SecurityQuestionsFields, {
  createEmptySecurityAnswers,
  SECURITY_QUESTIONS_REQUIRED,
} from "../components/SecurityQuestionsFields";
import type { SecurityQuestionAnswer, SecurityQuestionOption } from "../securityQuestions.types";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  RESEND_COOLDOWN_SECONDS,
  RESET_LINK_EXPIRY_LABEL,
} from "../constants/authMessages";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [storedEmail, setStoredEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [catalog, setCatalog] = useState<SecurityQuestionOption[]>([]);
  const [securityStep, setSecurityStep] = useState<"email" | "questions" | "done">("email");
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestionOption[]>([]);
  const [securityAnswers, setSecurityAnswers] = useState<SecurityQuestionAnswer[]>(
    createEmptySecurityAnswers(),
  );
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    void authService.getSecurityQuestionCatalog().then((res) => setCatalog(res.questions));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const submitEmailRequest = useCallback(async (targetEmail: string, isResend = false) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (isResend) setIsResending(true);
    else setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword(normalizedEmail);
      setStoredEmail(normalizedEmail);
      setDevResetLink(response.data?.devResetLink ?? null);
      setEmailSubmitted(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(FORGOT_PASSWORD_SUCCESS_MESSAGE);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit request.");
      return false;
    } finally {
      if (isResend) setIsResending(false);
      else setIsSubmitting(false);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEmailRequest(email, false);
  };

  const handleSecurityEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.getResetSecurityQuestions(normalizedEmail);
      if (!result.questions?.length) {
        toast.error("Security questions are not set up for this account. Use email verification.");
        return;
      }
      setStoredEmail(normalizedEmail);
      setSecurityQuestions(result.questions);
      setSecurityAnswers(
        result.questions.map((q) => ({ questionKey: q.key, answer: "" })),
      );
      setSecurityStep("questions");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load security questions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySecurityAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storedEmail) return;

    const incomplete = securityAnswers.some(
      (a) => !a.questionKey || !a.answer.trim(),
    );
    if (incomplete) {
      toast.error(`Please answer all ${SECURITY_QUESTIONS_REQUIRED} security questions.`);
      return;
    }

    setVerifying(true);
    try {
      const result = await authService.verifySecurityAnswers(storedEmail, securityAnswers);
      toast.success("Identity verified. Set your new password.");
      navigate(`/reset-password?token=${encodeURIComponent(result.resetToken)}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const copyDevLink = async () => {
    if (!devResetLink) return;
    try {
      await navigator.clipboard.writeText(devResetLink);
      toast.success("Reset link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Card className="w-full max-w-lg border-border/60 shadow-xl">
        <CardContent className="px-8 pb-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Verify your identity by email or security questions, then set a new password.
            </p>
          </div>

          <Tabs
            defaultValue="email"
            className="w-full"
            onValueChange={(value) => {
              // Keep the email the person already typed when switching tabs,
              // and reset the security-question flow back to its first step.
              if (value === "questions") {
                setSecurityStep("email");
              }
            }}
          >
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email link
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Security questions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              {!emailSubmitted ? (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                      Email address
                    </label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll email a secure reset link if an account exists with this address.
                  </p>
                  <Button type="submit" className="h-11 w-full font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5 text-center">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{FORGOT_PASSWORD_SUCCESS_MESSAGE}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    Link expires in <span className="font-semibold text-foreground">{RESET_LINK_EXPIRY_LABEL}</span>
                  </div>
                  {import.meta.env.DEV && devResetLink ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
                      <p className="font-semibold">Development only</p>
                      <p className="mt-2 break-all rounded-md bg-muted/80 p-2 font-mono text-xs">{devResetLink}</p>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void copyDevLink()}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button type="button" size="sm" asChild>
                          <a href={devResetLink}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open reset page
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={cooldown > 0 || isResending}
                    onClick={() => void submitEmailRequest(storedEmail, true)}
                  >
                    {isResending
                      ? "Resending..."
                      : cooldown > 0
                        ? `Resend (${cooldown}s)`
                        : "Resend reset link"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="questions">
              {securityStep === "email" ? (
                <form onSubmit={handleSecurityEmailContinue} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="sq-email" className="text-sm font-medium text-foreground">
                      Email address
                    </label>
                    <Input
                      id="sq-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll use this to look up the security questions you set up for your account.
                  </p>
                  <Button type="submit" className="h-11 w-full font-semibold" disabled={isSubmitting}>
                    {isSubmitting ? "Loading..." : "Continue"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifySecurityAnswers} className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Answer the security questions you set up for <strong>{storedEmail}</strong>.
                  </p>
                  <SecurityQuestionsFields
                    catalog={securityQuestions}
                    value={securityAnswers}
                    onChange={setSecurityAnswers}
                    readOnly
                  />
                  <Button type="submit" className="h-11 w-full font-semibold" disabled={verifying}>
                    {verifying ? "Verifying..." : "Verify and continue"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full"
                    onClick={() => setSecurityStep("email")}
                  >
                    Use a different email
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button type="button" variant="ghost" className="h-11" asChild>
              <Link to="/login/patient">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;