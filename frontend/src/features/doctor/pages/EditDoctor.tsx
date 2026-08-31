import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DoctorForm from "../components/DoctorForm";
import PageHeader from "@/components/common/PageHeader";
import { doctorService } from "../services/doctorService";
import type { Doctor } from "../doctor.types";

const EditDoctor = () => {
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    doctorService
      .getById(id)
      .then(setDoctor)
      .catch(() => setError("Doctor not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Loading doctor…</div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">{error ?? "Doctor not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Care team"
        title={`Edit ${doctor.name}`}
        subtitle="Update specialist credentials, services, and profile information."
      />
      <DoctorForm mode="edit" initial={doctor} />
    </div>
  );
};

export default EditDoctor;
