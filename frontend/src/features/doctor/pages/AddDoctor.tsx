import DoctorForm from "../components/DoctorForm";
import PageHeader from "@/components/common/PageHeader";

const AddDoctor = () => (
  <div className="mx-auto max-w-4xl space-y-6">
    <PageHeader
      eyebrow="Care team"
      title="Add new doctor"
      subtitle="Create a specialist profile. The doctor will receive an email with their login email and temporary password."
    />
    <DoctorForm mode="add" />
  </div>
);

export default AddDoctor;
