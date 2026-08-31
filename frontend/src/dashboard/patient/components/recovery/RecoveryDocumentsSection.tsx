import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { patientService } from "@/features/patient/services/patientService";
import type {
  PatientDocument,
  PatientDocumentCategory,
  PatientDocumentViewData,
} from "@/features/patient/patient.types";
import { usePatientDocuments } from "@/features/patient/hooks/usePatientDocuments";
import RecoveryEmptyState from "./RecoveryEmptyState";
import RecoveryPanelCard from "./RecoveryPanelCard";

const CATEGORY_LABELS: Record<PatientDocumentCategory, string> = {
  therapy_assessment: "Therapy assessment",
  medical_report:     "Medical report",
  prescription:       "Prescription",
  lab_result:         "Lab result",
};

function isReportDocument(doc: PatientDocument): boolean {
  if (doc.source === "screening") return false;
  if (doc.category === "prescription" || doc.category === "lab_result") return false;
  if (doc.category === "therapy_assessment") return false;
  return doc.source === "report" || doc.category === "medical_report";
}

const formatUploadDate = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
};

const fileTypeBadgeClass = (fileType: string) => {
  const t = fileType.toUpperCase();
  if (t === "PDF")                   return "bg-red-50 text-red-700 border-red-200";
  if (t === "ASSESSMENT")            return "bg-primary/10 text-primary border-primary/20";
  if (t === "EXCEL" || t === "XLSX") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-muted text-muted-foreground border-border";
};

// FIX: derive extension from blob MIME type — NEVER hardcode "json"
const extFromBlob = (blob: Blob, declared: string): string => {
  const mime = blob.type.toLowerCase();
  if (mime.includes("pdf"))                                    return "pdf";
  if (mime.includes("png"))                                    return "png";
  if (mime.includes("jpeg") || mime.includes("jpg"))          return "jpg";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "xlsx";
  if (mime.includes("word") || mime.includes("document"))     return "docx";
  // If MIME is JSON/plain — backend returned error, not a real file
  // Fall back to declared type but never allow "json" or "assessment"
  const safe = declared.toLowerCase();
  if (safe === "json" || safe === "assessment" || safe === "") return "pdf";
  return safe;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function DocumentActions({
  doc, busy, onView, onDownload,
}: {
  doc:        PatientDocument;
  busy:       boolean;
  onView:     () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="h-9 text-sm rounded-xl" disabled={busy} onClick={onView}>
        {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Eye size={14} className="mr-1.5" />}
        View
      </Button>
      <Button variant="outline" size="sm" className="h-9 text-sm rounded-xl" disabled={busy} onClick={onDownload}>
        <Download size={14} className="mr-1.5" />
        Download
      </Button>
    </div>
  );
}

export function RecoveryDocumentsContent({
  documents, loading, error,
}: {
  documents: PatientDocument[];
  loading:   boolean;
  error:     string | null;
}) {
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewer,   setViewer]   = useState<{ doc: PatientDocument; data: PatientDocumentViewData } | null>(null);

  const reports = useMemo(
    () => documents.filter(isReportDocument),
    [documents],
  );

  const handleView = async (doc: PatientDocument) => {
    setActionId(`view-${doc.source}-${doc.id}`);
    try {
      const result = await patientService.viewDocument(doc.source, doc.id);
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        setViewer({ doc, data: result });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open document.");
    } finally {
      setActionId(null);
    }
  };

  // FIX: ext from blob MIME — was hardcoded to "json" for screening/report
  const handleDownload = async (doc: PatientDocument) => {
    setActionId(`dl-${doc.source}-${doc.id}`);
    try {
      const blob     = await patientService.downloadDocument(doc.source, doc.id);
      const ext      = extFromBlob(blob, doc.fileType);
      const safeName = doc.title.replace(/[^a-zA-Z0-9._\- ]/g, "_").replace(/\s+/g, "_").slice(0, 60);
      downloadBlob(blob, `${safeName}.${ext}`);
      toast.success("Download started.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download document.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <>
      {reports.length === 0 ? (
        <div className="py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden />
          <RecoveryEmptyState message="No medical reports on record yet. Reports shared by your care team will appear here." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto rounded-xl border border-border max-md:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Report</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Generated</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((doc) => {
                  const busy  = actionId === `view-${doc.source}-${doc.id}` || actionId === `dl-${doc.source}-${doc.id}`;
                  return (
                    <tr key={`${doc.source}-${doc.id}`} className="border-b border-border/50 last:border-none">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                            <FileText size={16} aria-hidden />
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[220px]">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs", fileTypeBadgeClass(doc.fileType))}>{doc.fileType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatUploadDate(doc.uploadedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DocumentActions doc={doc} busy={busy} onView={() => void handleView(doc)} onDownload={() => void handleDownload(doc)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden" aria-label="Medical reports">
            {reports.map((doc) => {
              const busy  = actionId === `view-${doc.source}-${doc.id}` || actionId === `dl-${doc.source}-${doc.id}`;
              return (
                <li key={`${doc.source}-${doc.id}`} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                      <FileText size={16} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{doc.title}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-xs", fileTypeBadgeClass(doc.fileType))}>{doc.fileType}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Generated {formatUploadDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <DocumentActions doc={doc} busy={busy} onView={() => void handleView(doc)} onDownload={() => void handleDownload(doc)} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Viewer modal */}
      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{viewer?.doc.title ?? "Document"}</DialogTitle>
          </DialogHeader>
          {viewer && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[viewer.doc.category]}</Badge>
                <Badge variant="outline" className="text-xs">{viewer.doc.fileType}</Badge>
              </div>
              {viewer.data.testDate != null && (
                <p className="text-muted-foreground">Test date: {formatUploadDate(String(viewer.data.testDate))}</p>
              )}
              {viewer.data.generatedDate != null && (
                <p className="text-muted-foreground">Generated: {formatUploadDate(String(viewer.data.generatedDate))}</p>
              )}
              {viewer.data.score != null && (
                <p className="text-foreground font-semibold">Score: {viewer.data.score}</p>
              )}
              {viewer.data.riskLevel && (
                <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{viewer.data.riskLevel} risk</Badge>
              )}
              <pre className="text-sm bg-muted/40 rounded-lg p-4 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                {viewer.data.content ? String(viewer.data.content) : JSON.stringify(viewer.data, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function RecoveryDocumentsSection() {
  const { documents, loading, error } = usePatientDocuments();
  return (
    <RecoveryPanelCard
      title="Reports"
      description="Medical reports shared by your care team."
    >
      <RecoveryDocumentsContent documents={documents} loading={loading} error={error} />
    </RecoveryPanelCard>
  );
}