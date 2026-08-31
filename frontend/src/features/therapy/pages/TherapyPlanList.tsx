import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { therapyService } from "../services/therapyService";
import type { TherapyPlan } from "../therapy.types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default", ACTIVE: "default",
  completed: "secondary", COMPLETED: "secondary",
  paused: "outline", ON_HOLD: "outline",
  cancelled: "outline",
};

export default function TherapyPlanList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "patient";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";
  const canCreate = role === "admin" || role === "doctor";

  const [items, setItems] = useState<TherapyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    therapyService.listPlans()
      .then(setItems)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((p) => {
    const type = (p.therapy_type ?? p.title ?? "").toLowerCase();
    const patient = p.patients?.users?.name?.toLowerCase() ?? p.patientName?.toLowerCase() ?? "";
    const doctor = p.doctors?.users?.name?.toLowerCase() ?? p.therapistName?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    const matchSearch = !q || type.includes(q) || patient.includes(q) || doctor.includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter ||
      (statusFilter === "active" && p.status === "ACTIVE") ||
      (statusFilter === "completed" && p.status === "COMPLETED") ||
      (statusFilter === "paused" && p.status === "ON_HOLD");
    return matchSearch && matchStatus;
  });

  return (
    <>
      <PageHeader
        title="Therapy Plans"
        subtitle="Create, assign and track therapy treatment plans."
        action={canCreate ? (
          <Button onClick={() => navigate(`${basePath}/therapy/new`)}>
            <Plus className="h-4 w-4" /> New Plan
          </Button>
        ) : undefined}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, therapist, or type..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No therapy plans found.</p>
          ) : (
            filtered.map((p) => {
              const patientName = p.patients?.users?.name ?? p.patientName ?? "—";
              const doctorName = p.doctors?.users?.name ?? p.therapistName ?? "—";
              const type = p.therapy_type ?? p.title ?? "—";
              const sessions = p.therapy_sessions?.length ?? 0;
              const status = p.status ?? "active";
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`${basePath}/therapy/${p.id}`)}
                  className="w-full rounded-md border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{type}</p>
                      <p className="text-xs text-muted-foreground">
                        {patientName} · {doctorName} · {sessions} session(s)
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}