import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminHeroStat = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
};

type AdminHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  stats?: AdminHeroStat[];
  className?: string;
};

export default function AdminHero({
  eyebrow = "Admin Portal",
  title,
  description,
  action,
  stats,
  className,
}: AdminHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-hero-gradient p-6 text-primary-foreground shadow-md md:p-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-foreground/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-primary-foreground/5 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/75">
            {eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="text-sm leading-relaxed text-primary-foreground/85 md:text-base">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {stats && stats.length > 0 ? (
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                {stat.icon ? (
                  <stat.icon className="h-4 w-4 shrink-0 text-primary-foreground/80" aria-hidden />
                ) : null}
                <p className="text-[10px] font-medium uppercase tracking-wide text-primary-foreground/70">
                  {stat.label}
                </p>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
