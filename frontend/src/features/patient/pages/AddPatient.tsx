import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import PatientForm from "../components/PatientForm";
import { patientService } from "../services/patientService";

export default function AddPatient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <PageHeader title="Add patient" subtitle="Register a new patient into the system." />
      <Card className="p-6">
        <PatientForm
          submitLabel="Create patient"
          loading={loading}
          onSubmit={async (payload) => {
            setLoading(true);
            try {
              const created = await patientService.create(payload, {
                name: user?.name ?? "User",
                role: user?.role ?? "admin",
              });
              toast.success("Patient created.");
              navigate(`/admin/patients/${created.id}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to create patient.");
            } finally {
              setLoading(false);
            }
          }}
        />
      </Card>
    </>
  );
}
