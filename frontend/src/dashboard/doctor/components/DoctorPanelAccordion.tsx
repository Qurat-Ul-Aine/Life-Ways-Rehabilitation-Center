import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DoctorPanelAccordionProps = {
  title: string;
  description?: string;
  badge?: string | number;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  tone?: "default" | "warning";
};

export function DoctorPanelAccordion({
  title,
  description,
  badge,
  icon,
  defaultOpen = false,
  children,
  className,
  tone = "default",
}: DoctorPanelAccordionProps) {
  return (
    <details
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card shadow-sm",
        tone === "warning"
          ? "border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/15"
          : "border-border",
        className,
      )}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {title}
            </h3>
            {badge != null && badge !== "" ? (
              <Badge variant="secondary" className="text-xs font-medium">
                {badge}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

export const doctorPanelLabel = "text-sm font-medium text-muted-foreground";
export const doctorPanelBody = "text-sm leading-relaxed text-foreground sm:text-[15px]";
export const doctorPanelHint = "text-sm leading-relaxed text-muted-foreground";
