import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getResult } from "@/features/screening/services/screeningService";
import type { ScreeningResult } from "@/features/screening/types/screening.types";

/** Doctor dashboard page — read-only screening detail for assigned patients. */
export default function ScreeningDoctorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getResult(id)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load screening."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground">Screening record not found.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Screening Result"
        subtitle={detail.condition?.name ?? "Assigned patient screening"}
        action={
          <Button variant="outline" onClick={() => navigate("/doctor/patients")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to patients
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
            <CardTitle className="text-sm text-muted-foreground">Date</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {detail.testDate ? String(detail.testDate).slice(0, 10) : "—"}
          </CardContent>
        </Card>
      </div>

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
          <CardTitle className="text-base">Answers</CardTitle>
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
              {detail.answers.map((row) => (
                <TableRow key={row.questionId}>
                  <TableCell>{row.sectionTitle ?? "—"}</TableCell>
                  <TableCell>{row.questionText}</TableCell>
                  <TableCell>{row.answerValue}</TableCell>
                  <TableCell className="text-right">{row.score ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
