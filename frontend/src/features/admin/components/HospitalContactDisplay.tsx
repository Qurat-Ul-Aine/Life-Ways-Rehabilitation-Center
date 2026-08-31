import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

type ContactRow = {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  href?: string;
};

type Layout = "stack" | "footer" | "grid" | "cards";

type HospitalContactDisplayProps = {
  layout: Layout;
  showHours?: boolean;
  hours?: string;
  className?: string;
};

const DEFAULT_HOURS = "Mon – Sat, 9:00 AM – 6:00 PM";

export function HospitalContactDisplay({
  layout,
  showHours = false,
  hours = DEFAULT_HOURS,
  className,
}: HospitalContactDisplayProps) {
  const { address, contactPhone, contactEmail, phoneHref, emailHref } = useHospitalContact();

  const rows: ContactRow[] = [
    { icon: MapPin, label: "Location", value: address },
    { icon: Phone, label: "Phone", value: contactPhone, href: phoneHref },
    { icon: Mail, label: "Email", value: contactEmail, href: emailHref },
  ];

  if (showHours) {
    rows.push({ icon: Clock, label: "Hours", value: hours });
  }

  const visibleRows = rows.filter((row) => row.value?.trim());

  if (layout === "footer") {
    return (
      <ul className={cn("space-y-2 text-sm text-muted-foreground", className)}>
        {visibleRows.map((row) => (
          <li key={row.label} className="flex gap-2 items-start">
            <row.icon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            {row.href ? (
              <a href={row.href} className="hover:text-primary transition-colors break-all">
                {row.value}
              </a>
            ) : (
              <span>{row.value}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "grid") {
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {visibleRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <row.icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{row.label}</p>
              {row.href ? (
                <a
                  href={row.href}
                  className="text-sm font-medium text-foreground hover:text-primary break-all"
                >
                  {row.value}
                </a>
              ) : (
                <p className="text-sm font-medium text-foreground">{row.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "cards") {
    return (
      <div className={cn("grid md:grid-cols-3 gap-6 max-w-4xl mx-auto", className)}>
        {visibleRows.map((row) => (
          <div
            key={row.label}
            className="bg-card rounded-xl p-6 text-center shadow-card border border-border"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <row.icon className="w-6 h-6 text-primary" aria-hidden />
            </div>
            <h3 className="font-semibold mb-2">{row.label}</h3>
            {row.href ? (
              <a
                href={row.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors break-all"
              >
                {row.value}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground break-words">{row.value}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {visibleRows.map((row) => (
        <div key={row.label} className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <row.icon className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{row.label}</div>
            {row.href ? (
              <a href={row.href} className="font-medium text-foreground hover:text-primary break-all">
                {row.value}
              </a>
            ) : (
              <div className="font-medium text-foreground">{row.value}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
