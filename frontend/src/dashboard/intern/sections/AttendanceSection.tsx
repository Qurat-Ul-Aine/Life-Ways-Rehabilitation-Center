import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/common/PageHeader";
import AttendanceEditDialog from "@/features/intern/components/AttendanceEditDialog";
import AttendanceForm from "@/features/intern/components/AttendanceForm";
import AttendanceList from "@/features/intern/components/AttendanceList";
import { internService } from "@/features/intern/services/internService";
import type { AttendanceRecord } from "@/features/intern/intern.types";
import { useInternDashboardContext } from "../hooks/InternDashboardContext";
import { DashboardState } from "./DashboardState";

type ApiAttendance = {
  id: string;
  recordDate: string | null;
  hoursWorked: number;
  status: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function mapAttendanceItem(item: ApiAttendance): AttendanceRecord {
  return {
    id: item.id,
    date: item.recordDate ?? "",
    recordDate: item.recordDate ?? undefined,
    status: (item.status as AttendanceRecord["status"]) ?? "present",
    hours: item.hoursWorked,
    hoursWorked: item.hoursWorked,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    remarks: item.remarks,
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function AttendanceContent({ internId }: { internId: string }) {
  const { refetch } = useInternDashboardContext();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ attendancePercentage: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await internService.getAttendance(internId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })) as {
        items: ApiAttendance[];
        attendancePercentage: number;
        total: number;
      };
      setRecords((result.items ?? []).map(mapAttendanceItem));
      setStats({
        attendancePercentage: result.attendancePercentage ?? 0,
        total: result.total ?? 0,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [internId, fromDate, toDate]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const presentCount = useMemo(
    () => records.filter((r) => r.status === "present").length,
    [records],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Record and manage your daily internship attendance."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.attendancePercentage}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{presentCount} present days logged</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Attendance</CardTitle>
          <CardDescription>Record your daily attendance status and hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceForm
            loading={saving}
            onSubmit={async (payload) => {
              setSaving(true);
              try {
                await internService.addAttendance(internId, payload);
                toast.success("Attendance recorded.");
                await loadAttendance();
                await refetch();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add attendance.");
              } finally {
                setSaving(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="attFrom">From</Label>
              <Input
                id="attFrom"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attTo">To</Label>
              <Input
                id="attTo"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Badge variant="secondary">Present: {presentCount}</Badge>
          </div>
          <AttendanceList
            records={records}
            loading={loading}
            onEdit={(record) => setEditRecord(record)}
          />
        </CardContent>
      </Card>

      <AttendanceEditDialog
        open={Boolean(editRecord)}
        record={editRecord}
        loading={saving}
        onOpenChange={(open) => {
          if (!open) setEditRecord(null);
        }}
        onSave={async (attendanceId, payload) => {
          setSaving(true);
          try {
            await internService.updateAttendance(attendanceId, payload);
            toast.success("Attendance updated.");
            setEditRecord(null);
            await loadAttendance();
            await refetch();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update attendance.");
            throw err;
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

export default function AttendanceSection() {
  return (
    <DashboardState>
      {(data) => <AttendanceContent internId={data.intern.id} />}
    </DashboardState>
  );
}
