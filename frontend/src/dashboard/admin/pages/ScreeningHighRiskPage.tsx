import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import ScreeningRecordsTable from "@/features/screening/components/ScreeningRecordsTable";
import { useAdminScreeningList } from "@/dashboard/admin/hooks/useAdminScreeningList";
import { ADMIN_SCREENING_ROUTES } from "@/dashboard/admin/utils/screeningRoutes";

/** Admin dashboard page — high-risk screenings. */
export default function ScreeningHighRiskPage() {
  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");

  const { items, total, loading, conditions } = useAdminScreeningList({
    search,
    riskLevel: "high",
    condition: conditionFilter,
    page: 1,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="High Risk Patients"
        subtitle="Screenings flagged as high risk requiring urgent clinical review."
      />

      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">
            {total} high-risk screening{total === 1 ? "" : "s"} need attention.
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <ScreeningRecordsTable
          items={items}
          total={total}
          loading={loading}
          search={search}
          riskFilter="high"
          conditionFilter={conditionFilter}
          conditions={conditions}
          onSearchChange={setSearch}
          onRiskFilterChange={() => {}}
          onConditionFilterChange={setConditionFilter}
          hideRiskFilter
          detailPath={ADMIN_SCREENING_ROUTES.detail}
        />
      </Card>
    </div>
  );
}
