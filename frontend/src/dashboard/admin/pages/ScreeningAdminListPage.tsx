import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import ScreeningRecordsTable from "@/features/screening/components/ScreeningRecordsTable";
import { useAdminScreeningList } from "@/dashboard/admin/hooks/useAdminScreeningList";
import { screeningService } from "@/features/screening/services/screeningService";
import { ADMIN_SCREENING_ROUTES } from "@/dashboard/admin/utils/screeningRoutes";
import type { AdminScreeningStats } from "@/features/screening/types/screening.types";

/** Admin dashboard page — screening management list. */
export default function ScreeningAdminListPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [stats, setStats] = useState<AdminScreeningStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const { items, total, loading, conditions } = useAdminScreeningList({
    search,
    riskLevel: riskFilter,
    condition: conditionFilter,
    page: 1,
    pageSize: 20,
  });

  useEffect(() => {
    screeningService
      .getAdminStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Management"
        subtitle="Review patient screening tests and risk assessments across the center"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={ADMIN_SCREENING_ROUTES.highRisk}>High risk</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={ADMIN_SCREENING_ROUTES.analytics}>Analytics</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total screenings</p>
            <p className="text-3xl font-bold">
              {statsLoading ? "—" : (stats?.totalScreenings ?? total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">High risk flagged</p>
            <p className="text-3xl font-bold text-destructive">
              {statsLoading ? "—" : (stats?.highRiskCount ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold">
              {statsLoading ? "—" : (stats?.completedScreenings ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>All screening results</CardTitle>
              <CardDescription>Clinical screening records from the database</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            detailPath={ADMIN_SCREENING_ROUTES.detail}
          />
        </CardContent>
      </Card>
    </div>
  );
}
