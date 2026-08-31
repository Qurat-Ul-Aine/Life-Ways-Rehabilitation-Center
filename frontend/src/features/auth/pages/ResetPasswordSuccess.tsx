import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ResetPasswordSuccess() {
  const location = useLocation();
  const loginPath =
    (location.state as { loginPath?: string } | null)?.loginPath ?? "/login/patient";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardContent className="px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Password updated successfully
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
          <Button asChild className="mt-8 h-12 w-full text-base font-semibold touch-manipulation">
            <Link to={loginPath}>Go to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
