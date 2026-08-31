import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth, type AuthRole } from "@/context/AuthContext";
import { authService } from "../services/authService";
import type { LoginPayload } from "../auth.types";
import { getPostLoginPath, sanitizeReturnTo } from "@/lib/authRedirect";

const getLoginMode = (mode?: string) => {
  if (mode === "admin") {
    return {
      label: "Admin Portal",
      allowedRoles: ["admin", "staff"],
      description: "Administrative staff access only.",
      path: "/login/admin",
      switchLabel: "Continue as a doctor",
      switchPath: "/login/doctor",
    };
  }

  if (mode === "doctor") {
    return {
      label: "Doctor Portal",
      allowedRoles: ["doctor"],
      description: "Clinical staff and doctor access.",
      path: "/login/doctor",
      switchLabel: "Continue as a patient",
      switchPath: "/login/patient",
    };
  }

  return {
    label: "Patient Login",
      allowedRoles: ["patient", "family"],
    description: "Secure patient and family member access.",
    path: "/login/patient",
    switchLabel: "Continue as a doctor",
    switchPath: "/login/doctor",
  };
};

const Login = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ✅ FIX: Password show/hide toggle
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useParams<{ mode: string }>();
  const loginMode = getLoginMode(mode);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  const form = useForm<LoginPayload>({
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("Account created successfully. Please sign in with your email and password.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("suspended") === "1") {
      toast.error("Your account has been suspended. Please contact the administrator.");
    }
  }, [searchParams]);

  const handleLogin = async (values: LoginPayload) => {
    const normalizedEmail = values.email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!values.password.trim()) {
      toast.error("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.login({
        email: normalizedEmail,
        password: values.password,
      });

      const role = result.user.role.toLowerCase() as AuthRole;
      const isAllowed = loginMode.allowedRoles.includes(role);

      if (!isAllowed) {
        if (role === "doctor") {
          toast.error("Please use the Doctor Portal to login.", {
            action: { label: "Doctor login", onClick: () => navigate("/login/doctor") },
          });
        } else if (role === "admin" || role === "staff") {
          toast.error("Please use the Admin Portal to login.", {
            action: { label: "Admin login", onClick: () => navigate("/login/admin") },
          });
        } else {
          toast.error("Please use Patient Login for patient accounts.", {
            action: { label: "Patient login", onClick: () => navigate("/login/patient") },
          });
        }
        setIsSubmitting(false);
        return;
      }

      login(result.token, {
        id: String(result.user.id),
        name: result.user.name,
        email: result.user.email,
        role,
      });

      toast.success("Login successful.");
      navigate(getPostLoginPath(role, returnTo), { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to login.";
      if (msg.toLowerCase().includes("pending")) {
        toast.error("Your account is pending admin approval. Please wait.");
      } else if (msg.toLowerCase().includes("suspended")) {
        toast.error("Your account has been suspended. Please contact the administrator.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(getPostLoginPath(user.role, returnTo), { replace: true });
  }, [isAuthenticated, user, navigate, returnTo]);

  if (isAuthenticated && user) {
    return <Navigate to={getPostLoginPath(user.role, returnTo)} replace />;
  }

  // ✅ FIX: Invalid mode → patient login pe redirect
  if (!loginMode) {
    return <Navigate to="/login/patient" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardContent className="px-8 pb-8">
          {loginMode.path === "/login/patient" ? (
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <HeartPulse className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your patient account</p>
            </div>
          ) : loginMode.path === "/login/admin" ? (
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to manage your clinic</p>
            </div>
          ) : (
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Doctor Portal</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to access your dashboard</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your email address"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      {/* ✅ FIX: Password show/hide toggle add kiya */}
                      <div className="relative">
                        <Input
                          placeholder="Enter your password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword
                            ? <EyeOff className="h-4 w-4" />
                            : <Eye className="h-4 w-4" />
                          }
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>

              <div className="mt-2 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  {loginMode.path === "/login/patient"
                    ? "Are you a doctor? "
                    : loginMode.path === "/login/doctor"
                      ? "Are you a patient? "
                      : "Not your portal? "}
                  <Link
                    to={loginMode.switchPath}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {loginMode.switchLabel}
                  </Link>
                </p>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;