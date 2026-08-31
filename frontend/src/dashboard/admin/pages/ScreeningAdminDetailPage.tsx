import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import { doctorService } from "@/features/doctor/services/doctorService";
import type { Doctor } from "@/features/doctor/doctor.types";
import { screeningService } from "@/features/screening/services/screeningService";
import { ADMIN_SCREENING_ROUTES } from "@/dashboard/admin/utils/screeningRoutes";
import type { AdminScreeningDetail } from "@/features/screening/types/screening.types";

type ScreeningAdminDetailPageProps = {
  backTo?: string;
  readOnlyAssignment?: boolean;
};

/** Admin dashboard page — screening detail. */
export default function ScreeningAdminDetailPage({
  backTo = ADMIN_SCREENING_ROUTES.list,
  readOnlyAssignment = false,
}: ScreeningAdminDetailPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminScreeningDetail | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [flagPatient, setFlagPatient] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    screeningService
      .getAdminDetail(id)
      .then((d) => {
        setDetail(d);
        setFlagPatient(Boolean(d.flagged));
        setDoctorId(d.assignedDoctor?.id ?? "");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load screening."))
      .finally(() => setLoading(false));

    if (!readOnlyAssignment) {
      doctorService.getAll({ approved: true, limit: 100 }).then((r) => setDoctors(r.items));
    }
  }, [id, readOnlyAssignment]);

  const handleAssign = async () => {
    if (!id || !doctorId) {
      toast.error("Select a doctor to assign.");
      return;
    }
    setAssigning(true);
    try {
      await screeningService.assignDoctor({
        screeningId: id,
        doctorId,
        flagPatient,
        followUpDate: followUpDate || undefined,
        status: "follow_up_scheduled",
      });
      toast.success("Doctor assigned and case updated.");
      setDetail(await screeningService.getAdminDetail(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground">Screening record not found.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Detail"
        subtitle={`${detail.patient.name} · ${detail.condition?.name ?? ""}`}
        action={
          <Button variant="outline" onClick={() => navigate(backTo)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Score</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detail.score ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={detail.riskLevel === "high" ? "destructive" : "secondary"} className="capitalize">
              {detail.riskLevel ?? "—"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Assessment</CardTitle>
          </CardHeader>
          <CardContent className="capitalize">{detail.assessmentType ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Demographics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Age {detail.age ?? detail.patient.age ?? "—"} · {detail.gender ?? detail.patient.gender ?? "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{detail.title}</p>
            <p className="text-muted-foreground">{detail.description}</p>
            <p className="text-muted-foreground">{detail.explanation}</p>
            <ul className="list-disc space-y-1 pl-5">
              {detail.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {readOnlyAssignment ? "Assigned Doctor" : "Doctor Assignment"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readOnlyAssignment ? (
              <p className="text-sm text-muted-foreground">
                {detail.assignedDoctor?.name ?? "Not assigned"}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Assign Doctor</Label>
                  <Select value={doctorId} onValueChange={setDoctorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUp">Follow-up Date</Label>
                  <Input
                    id="followUp"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant={flagPatient ? "destructive" : "outline"}
                  onClick={() => setFlagPatient((v) => !v)}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  {flagPatient ? "Patient Flagged" : "Flag Patient"}
                </Button>
                <Button className="w-full" onClick={handleAssign} disabled={assigning}>
                  {assigning ? "Saving..." : "Assign & Schedule Follow-up"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scoring Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.scoringBreakdown.map((row) => (
                <TableRow key={row.questionId}>
                  <TableCell>{row.sectionTitle ?? "—"}</TableCell>
                  <TableCell>{row.questionText}</TableCell>
                  <TableCell>{row.answerValue}</TableCell>
                  <TableCell className="text-right">{row.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
