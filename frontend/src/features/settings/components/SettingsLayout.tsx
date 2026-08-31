import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SettingsSection } from "../settings.types";

type Props = {
  title: string;
  subtitle?: string;
  sections: SettingsSection[];
  activeId: string;
  onSelect: (id: string) => void;
  children: ReactNode;
};

export default function SettingsLayout({
  title,
  subtitle,
  sections,
  activeId,
  onSelect,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav
          className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:w-56 lg:flex-col lg:overflow-visible lg:pb-0"
          aria-label="Settings sections"
        >
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelect(section.id)}
                className={cn(
                  "flex min-w-[9.5rem] items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors lg:min-w-0 lg:w-full",
                  active
                    ? "border-primary/30 bg-primary/5 text-primary shadow-sm"
                    : "border-transparent bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 [&_svg]:h-4 [&_svg]:w-4",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {section.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{section.label}</span>
                  {section.description ? (
                    <span className="mt-0.5 hidden text-[11px] font-normal text-muted-foreground lg:block">
                      {section.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
