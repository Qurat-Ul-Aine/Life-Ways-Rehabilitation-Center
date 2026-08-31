import { AlertTriangle, Stethoscope } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ScreeningRecordsTable from "@/features/screening/components/ScreeningRecordsTable";
import { DOCTOR_SCREENING_ROUTES } from "@/dashboard/doctor/utils/screeningRoutes";
import { useDoctorScreeningAssignments } from "@/dashboard/doctor/hooks/useDoctorScreeningAssignments";

/** Doctor dashboard — read-only assigned patient screening results. */
export default function DoctorPatientScreeningResults() {
  const {
    items,
    conditions,
    total,
    loading,
    search,
    conditionFilter,
    riskFilter,
    highRiskCount,
    setSearch,
    setConditionFilter,
    setRiskFilter,
  } = useDoctorScreeningAssignments();

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5 text-primary" />
              Patient Screening Results
            </CardTitle>
            <CardDescription>
              Review completed screenings for patients assigned to you. Doctors cannot start or
              complete screening assessments.
            </CardDescription>
          </div>
          {highRiskCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant={riskFilter === "high" ? "destructive" : "outline"}
              onClick={() => setRiskFilter(riskFilter === "high" ? "all" : "high")}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              High risk ({highRiskCount})
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {total} assigned screening result{total === 1 ? "" : "s"} for your patients.
        </div>
        <ScreeningRecordsTable
          items={items}
          total={total}
          loading={loading}
          search={search}
          riskFilter={riskFilter}
          conditionFilter={conditionFilter}
          conditions={conditions}
          onSearchChange={setSearch}
          onRiskFilterChange={setRiskFilter}
          onConditionFilterChange={setConditionFilter}
          detailPath={DOCTOR_SCREENING_ROUTES.detail}
        />
      </CardContent>
    </Card>
  );
}
