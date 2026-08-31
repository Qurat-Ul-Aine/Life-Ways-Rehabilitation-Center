import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { authService } from "../services/authService";
import SecurityQuestionsFields, { createEmptySecurityAnswers } from "../components/SecurityQuestionsFields";
import type { SecurityQuestionAnswer } from "../securityQuestions.types";
import type { RegisterRole } from "../auth.types";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "../utils/passwordPolicy";
import { buildLoginPath, sanitizeReturnTo } from "@/lib/authRedirect";
import { useAuth } from "@/context/AuthContext";

type RegisterFormValues = {
  role: RegisterRole;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

const Register = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [securityCatalog, setSecurityCatalog] = useState<{ key: string; label: string }[]>([]);
  const [securityAnswers, setSecurityAnswers] = useState<SecurityQuestionAnswer[]>(
    createEmptySecurityAnswers(),
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const loginPath = buildLoginPath("/login/patient", returnTo);

  const buildPostRegisterLoginPath = () => {
    const params = new URLSearchParams({ registered: "1" });
    if (returnTo) params.set("returnTo", returnTo);
    return `/login/patient?${params.toString()}`;
  };

  useEffect(() => {
    void authService.getSecurityQuestionCatalog().then((res) => setSecurityCatalog(res.questions));
  }, []);

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      role: "patient",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      gender: "",
      dateOfBirth: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    },
  });

  const selectedRole = form.watch("role");
  const isFamilyRegistration = selectedRole === "family";

  const handleRegister = async (values: RegisterFormValues) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (values.name.trim().length < 2) { toast.error("Name must be at least 2 characters."); return; }
    if (!emailRegex.test(values.email.trim())) { toast.error("Please enter a valid email."); return; }
    if (!values.phone.trim()) { toast.error("Phone number is required."); return; }
    if (!isValidPassword(values.password)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (values.password !== values.confirmPassword) { toast.error("Passwords do not match."); return; }

    setIsSubmitting(true);
    try {
      const hasSecuritySetup = securityAnswers.every((a) => a.questionKey && a.answer.trim());
      await authService.register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
        role: values.role,
        ...(values.role === "patient"
          ? {
              gender: values.gender || undefined,
              dateOfBirth: values.dateOfBirth || undefined,
              address: values.address.trim() || undefined,
              emergencyContactName: values.emergencyContactName.trim() || undefined,
              emergencyContactPhone: values.emergencyContactPhone.trim() || undefined,
            }
          : {}),
        ...(hasSecuritySetup ? { securityQuestions: securityAnswers } : {}),
      });

      logout();
      navigate(buildPostRegisterLoginPath(), { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-lg shadow-xl border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Register as a patient or family member at Life Ways Rehab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="family">Family Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {isFamilyRegistration ? (
                <p className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Family members use the same patient portal login after registration.
                </p>
              ) : null}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="Enter your email address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl><Input placeholder="Enter your phone number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {!isFamilyRegistration ? (
                  <>
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="Enter your address" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl><Input placeholder="Enter emergency contact name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Phone</FormLabel>
                        <FormControl><Input placeholder="Enter emergency contact phone number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                ) : null}

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repeat password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Collapsible open={isSecurityOpen} onOpenChange={setIsSecurityOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        Add security questions
                        <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isSecurityOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 rounded-xl border border-border/80 bg-muted/10 p-4">
                  <p className="mb-4 text-xs text-muted-foreground">
                    Set two questions so you can reset your password without email access.
                  </p>
                  <SecurityQuestionsFields
                    catalog={securityCatalog}
                    value={securityAnswers}
                    onChange={setSecurityAnswers}
                  />
                </CollapsibleContent>
              </Collapsible>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to={loginPath} className="text-primary font-medium hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
