import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useStaffMember } from "../hooks/useStaff";
import StaffForm from "../components/StaffForm";
import { staffService } from "../services/staffService";

export default function EditStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member, loading, error } = useStaffMember(id);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <PageHeader title="Edit staff" subtitle={member?.fullName ?? "Loading..."} />
      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error || !member ? (
          <p className="text-sm text-destructive">{error ?? "Not found."}</p>
        ) : (
          <StaffForm
            initial={member}
            submitLabel="Save changes"
            loading={saving}
            onSubmit={async (payload) => {
              setSaving(true);
              try {
                await staffService.update(member.id, payload);
                toast.success("Staff updated.");
                navigate(`/admin/staff/${member.id}`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update.");
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
