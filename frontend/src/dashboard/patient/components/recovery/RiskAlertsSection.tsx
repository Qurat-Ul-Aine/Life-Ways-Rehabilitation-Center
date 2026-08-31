import { AlertTriangle, CalendarX, TrendingDown, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  RecoveryRiskAlert,
  RecoveryRiskAlertType,
  RecoveryWarningNote,
} from "@/features/patient/patient.types";

const ALERT_ICONS: Record<RecoveryRiskAlertType, React.ReactNode> = {
  missed_session: <CalendarX size={15} aria-hidden />,
  multiple_cancellations: <UserX size={15} aria-hidden />,
  low_attendance: <AlertTriangle size={15} aria-hidden />,
  recovery_stagnation: <TrendingDown size={15} aria-hidden />,
};

type Props = {
  alerts: RecoveryRiskAlert[];
  clinicalWarnings?: RecoveryWarningNote[];
  loading: boolean;
};

function AlertStrip({
  severity,
  title,
  message,
  icon,
}: {
  severity: "high" | "medium" | string;
  title: string;
  message: string;
  icon: React.ReactNode;
}) {
  const isHigh = severity === "high";

  return (
    <li
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border-l-4 px-4 py-3",
        isHigh
          ? "border-l-red-500 bg-red-50/80 border border-red-100"
          : "border-l-amber-500 bg-amber-50/80 border border-amber-100",
      )}
    >
      <span
        className={cn(
          "shrink-0 mt-0.5",
          isHigh ? "text-red-600" : "text-amber-600",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold leading-snug",
            isHigh ? "text-red-900" : "text-amber-900",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-sm mt-0.5 leading-relaxed",
            isHigh ? "text-red-800/90" : "text-amber-800/90",
          )}
        >
          {message}
        </p>
      </div>
    </li>
  );
}

export default function RiskAlertsSection({
  alerts,
  clinicalWarnings = [],
  loading,
}: Props) {
  const combinedCount = alerts.length + clinicalWarnings.length;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (combinedCount === 0) {
    return null;
  }

  return (
    <ul className="space-y-2" aria-live="polite">
      {clinicalWarnings.map((warning) => (
        <AlertStrip
          key={`warning-${warning.id}`}
          severity={warning.severity}
          title={warning.title}
          message={warning.message}
          icon={<AlertTriangle size={15} aria-hidden />}
        />
      ))}
      {alerts.map((alert) => (
        <AlertStrip
          key={alert.id}
          severity={alert.severity}
          title={alert.title}
          message={alert.message}
          icon={ALERT_ICONS[alert.type] ?? <AlertTriangle size={15} aria-hidden />}
        />
      ))}
    </ul>
  );
}
