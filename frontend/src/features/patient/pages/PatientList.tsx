import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import PortalAccountTypeBadge from "@/components/common/PortalAccountTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { usePatients } from "@/hooks/usePatients";
import { patientService } from "../services/patientService";
import FamilyPortalAccountsTable from "../components/FamilyPortalAccountsTable";
import type { PatientStatus } from "../patient.types";

const PAGE_SIZE = 10;

const statusVariant: Record<PatientStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  "on-hold": "secondary",
  discharged: "outline",
};

export default function PatientList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const initialTab = searchParams.get("family") === "1" ? "family" : "patients";
  const [activeTab, setActiveTab] = useState<"patients" | "family">(initialTab);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<PatientStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);

  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    setActiveTab(searchParams.get("family") === "1" ? "family" : "patients");
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    const next = value === "family" ? "family" : "patients";
    setActiveTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "family") {
      params.set("family", "1");
    } else {
      params.delete("family");
    }
    setSearchParams(params, { replace: true });
  };

  const query = useMemo(
    () => ({
      search,
      status,
      page,
      pageSize: PAGE_SIZE,
      ...(isDoctor && { doctorId: user?.id }),
    }),
    [search, status, page, isDoctor, user?.id]
  );
  const { items, total, loading, error, refetch } = usePatients(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await patientService.remove(confirmId, { name: user?.name ?? "User", role: user?.role ?? "admin" });
      toast.success("Patient deleted.");
      setConfirmId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const handleToggleAccount = async () => {
    if (!toggleTarget) return;
    try {
      const result = await patientService.toggleAccountActive(toggleTarget.id);
      toast.success(result.message);
      setToggleTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status.");
    }
  };

  const renderPatientsTable = () => (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name, email, phone, or ID"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v as typeof status);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On hold</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Portal account</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login</TableHead>
              <TableHead className="text-right">Recovery</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>
                      <PortalAccountTypeBadge type={p.portalAccountType ?? "patient"} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{p.email}</div>
                      <div className="text-xs">{p.phone}</div>
                    </TableCell>
                    <TableCell>
                      {p.assignedDoctorName ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive === false ? "destructive" : "outline"}>
                        {p.isActive === false ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.recoveryProgress}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            navigate(isDoctor ? `/doctor/patients/${p.id}` : `/admin/patients/${p.id}`)
                          }
                          aria-label="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/admin/patients/${p.id}/edit`)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setToggleTarget({
                                  id: p.id,
                                  name: p.fullName,
                                  isActive: p.isActive !== false,
                                })
                              }
                              aria-label={
                                p.isActive === false ? "Reactivate account" : "Suspend account"
                              }
                            >
                              {p.isActive === false ? (
                                <UserCheck className="h-4 w-4 text-primary" />
                              ) : (
                                <UserX className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setConfirmId(p.id)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {!loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No patients found.</p>
      ) : null}
      {error ? <p className="pt-3 text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          Showing {items.length} of {total}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="self-center text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="bg-muted/30 min-h-screen p-4">
      <PageHeader
        eyebrow="Patient records"
        title={isDoctor ? "Assigned Patients" : "Patients & portal accounts"}
        subtitle={
          isDoctor
            ? "View and manage your assigned patients."
            : "Patient records and family member portal accounts from registration."
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            {isAdmin && activeTab === "patients" ? (
              <Button asChild>
                <Link to="/admin/patients/new">
                  <Plus className="h-4 w-4" /> Add patient
                </Link>
              </Button>
            ) : undefined}
          </div>
        }
      />

      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="family">Family portal accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="family">
            <Card className="p-4">
              <FamilyPortalAccountsTable />
            </Card>
          </TabsContent>

          <TabsContent value="patients">{renderPatientsTable()}</TabsContent>
        </Tabs>
      ) : (
        renderPatientsTable()
      )}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete patient?"
        description="This will remove the patient record. This action is logged."
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? "Suspend patient account?" : "Reactivate patient account?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget.name} will not be able to log in until you reactivate their account.`
            : `${toggleTarget?.name ?? "This patient"} will be able to log in again.`
        }
        confirmLabel={toggleTarget?.isActive ? "Suspend account" : "Reactivate account"}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => void handleToggleAccount()}
      />
    </div>
  );
}
