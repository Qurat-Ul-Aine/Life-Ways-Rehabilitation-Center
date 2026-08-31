import { useState } from "react";
import { Check, Eye, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import type { Doctor } from "../doctor.types";
import { doctorService } from "../services/doctorService";

interface Props {
  doctors: Doctor[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onToggleActive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const getInitials = (name?: string) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "DR";

const DoctorTable = ({
  doctors,
  loading = false,
  onRefresh,
  onToggleActive,
  onDelete,
  onView,
  onEdit,
}: Props) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<void>) => {
    setLoadingId(id);
    try {
      await fn();
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    await doctorService.approve(id);
    await onRefresh();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm font-medium text-foreground">No doctors found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjust filters or add a new specialist to your care team.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doctor</TableHead>
            <TableHead>Specialization</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doctors.map((d) => {
            const busy = loadingId === d.id;
            const imageUrl = resolveUploadUrl(d.image);

            return (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      {imageUrl ? <AvatarImage src={imageUrl} alt={d.name} /> : null}
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(d.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.email}</p>
                      {d.phone ? (
                        <p className="truncate text-xs text-muted-foreground">{d.phone}</p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.specialization || "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {d.license_no || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.experience ? `${d.experience} yrs` : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {d.is_approved ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" aria-hidden />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning/40 text-warning">
                        Pending
                      </Badge>
                    )}
                    <Badge variant={d.is_active ? "secondary" : "destructive"}>
                      {d.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onView(d.id)}
                      aria-label="View doctor"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(d.id)}
                      aria-label="Edit doctor"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {d.is_approved === false && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        disabled={busy}
                        onClick={() => run(d.id, () => handleApprove(d.id))}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {busy ? "…" : "Approve"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      disabled={busy}
                      onClick={() => run(d.id, () => onToggleActive(d.id))}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      {busy ? "…" : d.is_active ? "Suspend" : "Reactivate"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => run(d.id, () => onDelete(d.id))}
                      aria-label="Delete doctor"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DoctorTable;
