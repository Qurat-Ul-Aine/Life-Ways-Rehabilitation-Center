import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/features/auth/services/authService";
import type { LoginPayload } from "@/features/auth/auth.types";
import { INTERN_AUTH, INTERNSHIPS_PUBLIC } from "../intern.routes";

export default function InternLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginPayload>({
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated && user?.role === "intern") {
    return <Navigate to={INTERN_AUTH.dashboard} replace />;
  }

  if (isAuthenticated && user && user.role !== "intern") {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Wrong portal</CardTitle>
            <CardDescription>
              You are signed in as {user.role}. Please log out and use the intern login, or go to
              your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link to={INTERNSHIPS_PUBLIC}>Back to Internships</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (values: LoginPayload) => {
    setIsSubmitting(true);
    try {
      const { token, user: authUser } = await authService.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (authUser.role.toLowerCase() !== "intern") {
        toast.error("This portal is for interns only. Please use the correct login page.");
        return;
      }

      login(token, { ...authUser, role: "intern" });
      toast.success("Welcome back!");
      navigate(INTERN_AUTH.dashboard);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Intern Login</CardTitle>
          <CardDescription>Access your training dashboard and logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                rules={{ required: "Email is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@university.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                rules={{ required: "Password is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New intern?{" "}
            <Link to={INTERN_AUTH.signup} className="font-medium text-primary hover:underline">
              Apply here
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            <Link to={INTERNSHIPS_PUBLIC} className="hover:underline">
              ← Back to internship info
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
