import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InternForm from "../components/InternForm";
import { useInternMember } from "../hooks/useIntern";
import { internAdminRoutes } from "../intern.routes";
import { internService } from "../services/internService";

export default function EditIntern() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading: fetching, error } = useInternMember(id);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  if (fetching) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-muted-foreground">Loading intern...</p>
      </DashboardLayout>
    );
  }

  if (error || !member) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-destructive">{error ?? "Intern not found."}</p>
        <Button variant="outline" className="ml-6" onClick={() => navigate(internAdminRoutes.list)}>
          Back to list
        </Button>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit — ${member.name}`}
        subtitle="Update intern profile and internship details."
      />
      <Card className="p-6">
        <InternForm
          initial={member}
          isEdit
          submitLabel="Save Changes"
          loading={loading}
          apiError={apiError}
          onSubmit={async (payload) => {
            if (!id) return;
            setLoading(true);
            setApiError("");
            try {
              await internService.update(id, payload);
              toast.success("Intern profile updated successfully.");
              navigate(internAdminRoutes.detail(id));
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to update intern.";
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
      </Card>
    </DashboardLayout>
  );
}
