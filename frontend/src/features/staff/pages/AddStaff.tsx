import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import StaffForm from "../components/StaffForm";
import { staffService } from "../services/staffService";

export default function AddStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  return (
    <>
      <PageHeader title="Add Staff" subtitle="Register a new doctor, therapist, nurse, or admin." />
      <Card className="p-6">
        <StaffForm
          submitLabel="Create Staff"
          loading={loading}
          apiError={apiError}
          onSubmit={async (payload) => {
            setLoading(true);
            setApiError(""); // clear previous error on every new attempt
            try {
              const created = await staffService.create(payload);
              toast.success("Staff member created successfully.");
              navigate(`/admin/staff/${created.id}`);
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to create staff.";
              // duplicate email/phone → show inside the form, not as a toast
              if (
                message.toLowerCase().includes("email") ||
                message.toLowerCase().includes("phone") ||
                message.toLowerCase().includes("already exists") ||
                message.toLowerCase().includes("duplicate")
              ) {
                setApiError(message);
              } else {
                // unexpected server error → toast is fine
                toast.error(message);
              }
            } finally {
              setLoading(false);
            }
          }}
        />
      </Card>
    </>
  );
}