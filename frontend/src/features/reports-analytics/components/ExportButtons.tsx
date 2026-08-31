import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { reportsService } from "../services/reports.service";
import type { ExportReportType, ReportFilters } from "../types/reports.types";
import { useState } from "react";

interface ExportButtonsProps {
  reportType: ExportReportType;
  filters: ReportFilters;
  disabled?: boolean;
  label?: string;
}

export default function ExportButtons({ reportType, filters, disabled, label }: ExportButtonsProps) {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  const handleExport = async (format: "pdf" | "excel") => {
    setLoading(format);
    try {
      await reportsService.downloadExport(format, reportType, filters);
      toast.success(`${format.toUpperCase()} export downloaded.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => void handleExport("pdf")}
      >
        {loading === "pdf" ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="mr-1 h-3.5 w-3.5" />
        )}
        {label ? `${label} PDF` : "Export PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loading !== null}
        onClick={() => void handleExport("excel")}
      >
        {loading === "excel" ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
        )}
        {label ? `${label} Excel` : "Export Excel"}
      </Button>
    </div>
  );
}
