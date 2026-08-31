import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Eye, Pencil, Trash2, Star, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useStaffList } from "../hooks/useStaff";
import { staffService } from "../services/staffService";
import type { StaffRole, StaffStatus } from "../staff.types";
import { ROLE_LABELS, STAFF_ROLES, staffRoleLabel } from "../staff.types";

const PAGE_SIZE = 10;

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  "on-leave": "secondary",
  inactive: "outline",
};

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  receptionist: "outline",
  ward_attendant: "secondary",
  pharmacist: "default",
  lab_technician: "default",
  cleaner: "outline",
  security_guard: "secondary",
};

export default function StaffList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [role, setRole] = useState<StaffRole | "all">("all");
  const [status, setStatus] = useState<StaffStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{
    id: string;
    name: string;
    isActive: boolean;
  } | null>(null);

  const query = useMemo(
    () => ({ search, role, status, page, pageSize: PAGE_SIZE }),
    [search, role, status, page]
  );
  const { items, total, loading, error, refetch } = useStaffList(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await staffService.remove(confirmId);
      toast.success("Staff member removed.");
      setConfirmId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const handleToggleAccount = async () => {
    if (!toggleTarget) return;
    try {
      const result = await staffService.toggleAccountActive(toggleTarget.id);
      toast.success(result.message);
      setToggleTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status.");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Staff"
        subtitle="Manage clinical and operational team members."
        action={
          <Button asChild>
            <Link to="/admin/staff/new">
              <Plus className="h-4 w-4" /> Add staff
            </Link>
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Search by name, email, department, or position"
              className="pl-9"
            />
          </div>
          <Select
            value={role}
            onValueChange={(v) => { setPage(1); setRole(v as typeof role); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => { setPage(1); setStatus(v as typeof status); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-leave">On leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.fullName ?? s.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleVariant[s.role] ?? "outline"}>
                          {staffRoleLabel(s.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.department || s.specialty || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.position || s.qualifications || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.joinedAt || s.joinedOn || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[s.status ?? "active"] ?? "outline"}>
                          {s.status ?? "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_active === false ? "destructive" : "outline"}>
                          {s.is_active === false ? "Suspended" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/admin/staff/${s.id}`)}
                            aria-label="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/admin/staff/${s.id}/edit`)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setToggleTarget({
                                id: s.id,
                                name: s.fullName ?? s.name ?? "Staff member",
                                isActive: s.is_active !== false,
                              })
                            }
                            aria-label={s.is_active === false ? "Reactivate account" : "Suspend account"}
                          >
                            {s.is_active === false ? (
                              <UserCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <UserX className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmId(s.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {!loading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No staff found.</p>
        ) : null}
        {error ? <p className="pt-3 text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {items.length} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="self-center text-sm">{page} / {totalPages}</span>
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

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove staff member?"
        description="This will remove the staff record from the system."
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? "Suspend staff account?" : "Reactivate staff account?"}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget.name} will not be able to log in until you reactivate their account.`
            : `${toggleTarget?.name ?? "This staff member"} will be able to log in again.`
        }
        confirmLabel={toggleTarget?.isActive ? "Suspend account" : "Reactivate account"}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => void handleToggleAccount()}
      />
    </>
  );
}