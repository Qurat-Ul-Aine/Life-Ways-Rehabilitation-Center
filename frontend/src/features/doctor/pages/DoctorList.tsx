import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Stethoscope, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useDoctors } from "../hooks/useDoctors";
import DoctorTable from "../components/DoctorTable";

const SPECIALIZATIONS = [
  "All",
  "Psychiatry",
  "Clinical Psychology",
  "Cognitive Behavioral Therapy",
  "General Medicine",
  "Addiction Recovery",
  "Neurodiversity Care",
  "Physiotherapy",
];

const DoctorList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { doctors, total, loading, error, fetchDoctors, toggleActive, remove } = useDoctors();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [specialization, setSpecialization] = useState("All");
  const [approvedFilter, setApprovedFilter] = useState<"all" | "approved" | "pending">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const query = useMemo(
    () => ({
      search: search || undefined,
      specialization: specialization !== "All" ? specialization : undefined,
      approved:
        approvedFilter === "approved"
          ? true
          : approvedFilter === "pending"
            ? false
            : undefined,
    }),
    [search, specialization, approvedFilter],
  );

  useEffect(() => {
    void fetchDoctors(query);
  }, [search, specialization, approvedFilter]);

  const refreshDoctors = () => fetchDoctors(query);

  const approvedCount = useMemo(
    () => doctors.filter((d) => d.is_approved).length,
    [doctors],
  );
  const pendingCount = useMemo(
    () => doctors.filter((d) => !d.is_approved).length,
    [doctors],
  );
  const activeCount = useMemo(
    () => doctors.filter((d) => d.is_active).length,
    [doctors],
  );

  const handleToggleActive = async (id: string) => {
    setActionError(null);
    try {
      await toggleActive(id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setActionError(err?.response?.data?.message ?? "Status update failed.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setActionError(null);
    try {
      await remove(confirmDeleteId);
      setConfirmDeleteId(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setActionError(err?.response?.data?.message ?? "Delete failed.");
      setConfirmDeleteId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Care team"
        title="Doctors"
        subtitle="Manage specialist profiles, approvals, and clinical access for your rehabilitation center."
        action={
          <Button asChild>
            <Link to="/admin/doctors/add">
              <Plus className="h-4 w-4" />
              Add doctor
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total doctors", value: total, icon: Stethoscope },
          { label: "Approved", value: approvedCount, icon: UserCheck },
          { label: "Pending approval", value: pendingCount, icon: UserX },
          { label: "Active accounts", value: activeCount, icon: UserCheck },
        ].map((item) => (
          <Card
            key={item.label}
            className="flex items-center gap-3 border-border/80 p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {loading ? "—" : item.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or license..."
              className="pl-9"
            />
          </div>
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALIZATIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All specializations" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={approvedFilter}
            onValueChange={(v) => setApprovedFilter(v as typeof approvedFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Approval status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending approval</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(error || actionError) && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error || actionError}
          </p>
        )}

        <DoctorTable
          doctors={doctors}
          loading={loading}
          onRefresh={refreshDoctors}
          onToggleActive={handleToggleActive}
          onDelete={async (id) => setConfirmDeleteId(id)}
          onView={(id) => navigate(`/admin/doctors/${id}`)}
          onEdit={(id) => navigate(`/admin/doctors/edit/${id}`)}
        />
      </Card>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete doctor?"
        description="This permanently removes the doctor and their user account. This cannot be undone."
        confirmLabel="Delete doctor"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};

export default DoctorList;
