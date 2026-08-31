import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExportButtons from "@/features/reports-analytics/components/ExportButtons";
import ProgressChart from "@/features/reports-analytics/components/ProgressChart";
import ReportCards from "@/features/reports-analytics/components/ReportCards";
import {
  InvoicesTable,
  PaymentHistoryTable,
} from "@/features/reports-analytics/components/PaymentHistoryTable";
import { reportsService } from "@/features/reports-analytics/services/reports.service";
import type { ReportFilters } from "@/features/reports-analytics/types/reports.types";

export default function FinancialReportsSection({
  filters = {},
}: {
  filters?: ReportFilters;
}) {
  const financialQuery = useQuery({
    queryKey: ["reports", "financial", filters],
    queryFn: () => reportsService.getFinancial(filters),
    staleTime: 0,
  });

  const loading = financialQuery.isLoading;
  const error = financialQuery.error;
  const data = financialQuery.data;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load financial reports. Please adjust filters and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end">
        <ExportButtons reportType="financial" filters={filters} disabled={loading} />
      </div>

      <ReportCards
        loading={loading}
        columns={4}
        items={[
          { label: "Revenue", value: data?.summary.revenue ?? 0, isCurrency: true },
          {
            label: "Outstanding",
            value: data?.summary.outstandingPayments ?? 0,
            isCurrency: true,
          },
          { label: "Total Invoiced", value: data?.summary.totalInvoiced ?? 0, isCurrency: true },
          { label: "Payments", value: data?.summary.paymentCount ?? 0 },
        ]}
      />

      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Monthly Earnings</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4 pt-4">
          <ProgressChart
            title="Monthly Revenue"
            data={data?.monthlyEarnings ?? []}
            dataKey="revenue"
            xKey="month"
            variant="bar"
          />
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <PaymentHistoryTable rows={data?.paymentHistory ?? []} />
        </TabsContent>

        <TabsContent value="invoices" className="pt-4">
          <InvoicesTable rows={data?.invoices ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
