import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { authService } from "../services/authService";

const DisableAccount = () => {
  const [userId, setUserId] = useState("");
  const [confirmAction, setConfirmAction] = useState<"suspend" | "reactivate" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleConfirm = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response =
        confirmAction === "reactivate"
          ? await authService.reactivateAccount(userId.trim())
          : await authService.suspendAccount(userId.trim());
      toast.success(response.message || "Account updated.");
      setUserId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Suspend / Reactivate User</CardTitle>
          <CardDescription>
            Suspend a user to block login, or reactivate a suspended account (SRS-26, SRS-28).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              type="text"
              placeholder="Paste user UUID from patient, doctor, or staff profile"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => setConfirmAction("suspend")}
            >
              Suspend account
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => setConfirmAction("reactivate")}
            >
              Reactivate account
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: You can also suspend or reactivate from Patients, Doctors, and Staff list pages.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirm()}
        title={confirmAction === "reactivate" ? "Reactivate this account?" : "Suspend this account?"}
        description={
          confirmAction === "reactivate"
            ? "This user will be able to log in again."
            : "This user will not be able to log in until you reactivate the account."
        }
        confirmLabel={
          isSubmitting
            ? "Saving..."
            : confirmAction === "reactivate"
              ? "Reactivate"
              : "Suspend"
        }
      />
    </div>
  );
};

export default DisableAccount;
