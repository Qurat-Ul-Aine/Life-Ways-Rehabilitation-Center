import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";

type PortalAccountTypeBadgeProps = {
  type: "patient" | "family" | AppRole;
  linked?: boolean;
  className?: string;
};

export default function PortalAccountTypeBadge({
  type,
  linked,
  className,
}: PortalAccountTypeBadgeProps) {
  const normalized = String(type).toLowerCase();
  const isFamily = normalized === "family";

  const label = isFamily
    ? linked === false
      ? "Family (not linked)"
      : ROLE_LABELS.family
    : ROLE_LABELS.patient;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        isFamily
          ? linked === false
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : "border-violet-300 bg-violet-50 text-violet-800"
          : "border-teal-300 bg-teal-50 text-teal-800",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
