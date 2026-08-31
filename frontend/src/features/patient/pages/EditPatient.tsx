import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { usePatient } from "@/hooks/usePatients";
import PatientForm from "../components/PatientForm";
import api from "@/lib/api";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patient, loading: loadingPatient, error } = usePatient(id);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <PageHeader title="Edit Patient" subtitle={patient?.fullName ?? "Loading..."} />
      <Card className="p-6">
        {loadingPatient ? (
          <p className="text-sm text-muted-foreground">Loading patient...</p>
        ) : error || !patient ? (
          <p className="text-sm text-destructive">{error ?? "Patient not found."}</p>
        ) : (
          <PatientForm
            initial={patient}
            submitLabel="Save changes"
            loading={saving}
            onSubmit={async (payload) => {
              setSaving(true);
              try {
                // ✅ FIX: Backend ke sahi field names bhejo directly
                const backendPayload = {
                  name: payload.fullName,
                  email: payload.email,
                  phone: payload.phone,
                  gender: payload.gender,
                  dateOfBirth: payload.dateOfBirth,
                  address: payload.address,
                  emergencyContactName: payload.emergencyContactName,
                  emergencyContactPhone: payload.emergencyContactPhone,
                  status: payload.status,
                  admissionDate: payload.admissionDate,
                  condition: payload.primaryDiagnosis,
                };

                await api.patch(`/patients/${patient.id}`, backendPayload);
                toast.success("Patient updated successfully.");
                navigate(`/admin/patients/${patient.id}`);
              } catch (err: any) {
                const msg = err?.response?.data?.message ?? err?.message ?? "Failed to update.";
                toast.error(msg);
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </Card>
    </>
  );
}