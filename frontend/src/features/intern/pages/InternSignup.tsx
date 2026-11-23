import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import InternForm from "../components/InternForm";
import { internService } from "../services/internService";
import { INTERN_AUTH, INTERNSHIPS_PUBLIC } from "../intern.routes";
import {
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  validateDateOfBirth,
  validateEmail,
  validatePersonName,
  validatePhone,
} from "@/lib/validation";

export default function InternSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Intern Registration</CardTitle>
          <CardDescription>
            Submit your internship application. An administrator will review and approve your account
            before you can log in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InternForm
            submitLabel="Create Account"
            loading={loading}
            apiError={apiError}
            onSubmit={async (payload) => {
              const validationError =
                validatePersonName(payload.name) ??
                validateEmail(payload.email) ??
                validatePhone(payload.phone) ??
                validateDateOfBirth(payload.dateOfBirth);
              if (validationError) {
                setApiError(validationError);
                return;
              }

              setLoading(true);
              setApiError("");
              try {
                await internService.signup({
                  ...payload,
                  name: normalizePersonName(payload.name),
                  email: normalizeEmail(payload.email),
                  phone: normalizePhone(payload.phone),
                });
                toast.success("Application submitted! You will be notified once approved.");
                navigate(INTERN_AUTH.login);
              } catch (err) {
                const message = err instanceof Error ? err.message : "Signup failed.";
                if (
                  message.toLowerCase().includes("email") ||
                  message.toLowerCase().includes("phone") ||
                  message.toLowerCase().includes("already")
                ) {
                  setApiError(message);
                } else {
                  toast.error(message);
                }
              } finally {
                setLoading(false);
              }
            }}
          />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to={INTERN_AUTH.login} className="font-medium text-primary hover:underline">
              Intern login
            </Link>
            {" · "}
            <Link to={INTERNSHIPS_PUBLIC} className="hover:underline">
              Program info
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
