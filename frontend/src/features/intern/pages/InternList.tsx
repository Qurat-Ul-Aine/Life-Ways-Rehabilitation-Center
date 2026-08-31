import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useInternList } from "../hooks/useIntern";
import { internAdminRoutes } from "../intern.routes";
import { internService } from "../services/internService";
import { INTERN_DEPARTMENTS } from "../intern.types";

const PAGE_SIZE = 10;

export default function InternList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      search,
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
      department: departmentFilter === "all" ? undefined : departmentFilter,
      includeInactive: statusFilter !== "ACTIVE",
    }),
    [search, page, statusFilter, departmentFilter],
  );
  const { items, total, loading, error, refetch } = useInternList(query);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleApprove = async (id: string) => {
    try {
      await internService.approve(id);
      toast.success("Intern application approved.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve.");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await internService.reject(id);
      toast.success("Intern application rejected.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject.");
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await internService.remove(confirmId);
      toast.success("Intern deactivated successfully.");
      setConfirmId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate intern.");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Internship & Training"
        subtitle="Manage rehabilitation centre interns and training records."
        action={
          <Button asChild>
            <Link to={internAdminRoutes.create}>
              <Plus className="h-4 w-4" /> Add Intern
            </Link>
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by name, email, department, or phone"
              className="border-input bg-background pl-9 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={departmentFilter}
            onValueChange={(v) => {
              setPage(1);
              setDepartmentFilter(v);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {INTERN_DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No interns found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((intern) => (
                  <TableRow key={intern.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intern.name}</p>
                        <p className="text-xs text-muted-foreground">{intern.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{intern.department || "—"}</TableCell>
                    <TableCell>{intern.mentor?.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-sm">
                      {intern.internshipStart ?? "—"} → {intern.internshipEnd ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={intern.isActive ? "default" : "outline"}>
                        {intern.applicationStatus ?? (intern.isActive ? "Active" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(intern.applicationStatus === "PENDING" || !intern.isActive) &&
                        intern.applicationStatus !== "REJECTED" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Approve"
                              onClick={() => void handleApprove(intern.id)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reject"
                              onClick={() => void handleReject(intern.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(internAdminRoutes.detail(intern.id))}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(internAdminRoutes.edit(intern.id))}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmId(intern.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmId}
        onCancel={() => setConfirmId(null)}
        title="Deactivate Intern"
        description="This will soft-delete the intern account. They will no longer be able to log in."
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
