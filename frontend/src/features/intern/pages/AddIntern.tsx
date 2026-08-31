import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InternForm from "../components/InternForm";
import { internAdminRoutes } from "../intern.routes";
import { internService } from "../services/internService";

export default function AddIntern() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Intern"
        subtitle="Register a new rehabilitation centre intern. A secure password will be generated and emailed."
      />
      <Card className="p-6">
        <InternForm
          submitLabel="Create Intern"
          loading={loading}
          apiError={apiError}
          requireCnic
          onSubmit={async (payload) => {
            setLoading(true);
            setApiError("");
            try {
              const created = await internService.create(payload);
              toast.success("Intern created successfully. Login credentials have been emailed.");
              navigate(internAdminRoutes.detail(created.id));
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to create intern.";
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
