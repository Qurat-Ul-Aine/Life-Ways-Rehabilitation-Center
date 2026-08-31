import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDoctors } from "@/features/doctor/hooks/useDoctors";
import { usePatients } from "@/hooks/usePatients";
import DateRangePicker from "./DateRangePicker";
import type { ReportFilters } from "../types/reports.types";

interface FiltersBarProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  onApply: () => void;
  showDoctor?: boolean;
  showPatient?: boolean;
  loading?: boolean;
}

export default function FiltersBar({
  filters,
  onChange,
  onApply,
  showDoctor = false,
  showPatient = false,
  loading,
}: FiltersBarProps) {
  const { doctors, fetchDoctors } = useDoctors();
  const { items: patients } = usePatients({ page: 1, pageSize: 100 });

  useEffect(() => {
    if (showDoctor) void fetchDoctors({ approved: true });
  }, [showDoctor, fetchDoctors]);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <DateRangePicker
          from={filters.from ?? ""}
          to={filters.to ?? ""}
          onFromChange={(from) => onChange({ ...filters, from })}
          onToChange={(to) => onChange({ ...filters, to })}
        />

        {showDoctor && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Doctor</p>
            <Select
              value={filters.doctorId ?? "all"}
              onValueChange={(v) =>
                onChange({ ...filters, doctorId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showPatient && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Patient</p>
            <Select
              value={filters.patientId ?? "all"}
              onValueChange={(v) =>
                onChange({ ...filters, patientId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="All patients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All patients</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button size="sm" onClick={onApply} disabled={loading}>
        Apply filters
      </Button>
    </div>
  );
}
