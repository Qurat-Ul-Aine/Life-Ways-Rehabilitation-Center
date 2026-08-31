import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { internService } from "../services/internService";
import { downloadBlob, reportFilename } from "../utils/export";

type ExportButtonsProps = {
  internId?: string;
  types?: Array<{
    type: string;
    label: string;
  }>;
  className?: string;
};

const DEFAULT_TYPES = [
  { type: "intern-attendance", label: "Attendance" },
  { type: "intern-training-logs", label: "Training Logs" },
  { type: "intern-progress", label: "Progress" },
];

export default function ExportButtons({
  internId,
  types = DEFAULT_TYPES,
  className,
}: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: string, format: "csv" | "excel" | "json") => {
    const key = `${type}-${format}`;
    setLoading(key);
    try {
      const data = await internService.exportReport({
        type,
        internId,
        format,
      });
      if (data instanceof Blob) {
        downloadBlob(data, reportFilename(type, format, internId));
        toast.success("Report downloaded.");
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, reportFilename(type, "json", internId));
        toast.success("Report downloaded.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {types.map((item) => (
        <Button
          key={item.type}
          variant="outline"
          size="sm"
          disabled={Boolean(loading)}
          onClick={() => void handleExport(item.type, "csv")}
        >
          {loading === `${item.type}-csv` ? (
            "Exporting..."
          ) : (
            <>
              <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
              {item.label} CSV
            </>
          )}
        </Button>
      ))}
      {internId ? (
        <Button
          variant="outline"
          size="sm"
          disabled={Boolean(loading)}
          onClick={() => void handleExport("intern-progress", "json")}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Progress JSON
        </Button>
      ) : null}
    </div>
  );
}
