import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PanelAction, PanelStat } from "../data/panelMeta";

type Props = {
  title: string;
  subtitle: string;
  stats: PanelStat[];
  gradient: string;
  loading?: boolean;
  primaryAction?: PanelAction;
};

export default function HeroSection({
  title,
  subtitle,
  stats,
  gradient,
  loading,
  primaryAction,
}: Props) {
  const ActionIcon = primaryAction?.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-6 text-primary-foreground shadow-md sm:px-7 sm:py-7",
        gradient,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-black/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.04 }}
          className="min-w-0 flex-1"
        >
          {loading ? (
            <>
              <Skeleton className="mb-2 h-7 w-56 bg-white/20" />
              <Skeleton className="h-4 w-72 max-w-full bg-white/15" />
            </>
          ) : (
            <>
              <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {title}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-primary-foreground/85 sm:text-base">
                {subtitle}
              </p>
            </>
          )}

          {primaryAction && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="mt-4"
            >
              {primaryAction.to ? (
                <Button
                  asChild
                  size="sm"
                  className="bg-white/95 text-foreground shadow-sm hover:bg-white"
                >
                  <Link to={primaryAction.to}>
                    {ActionIcon && <ActionIcon className="mr-1.5 h-4 w-4" />}
                    {primaryAction.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-white/95 text-foreground shadow-sm hover:bg-white"
                  type="button"
                >
                  {ActionIcon && <ActionIcon className="mr-1.5 h-4 w-4" />}
                  {primaryAction.label}
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {loading ? (
                <Skeleton className="mb-1 h-5 w-10 bg-white/20" />
              ) : (
                <p className="text-lg font-bold leading-none sm:text-xl">{stat.value}</p>
              )}
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary-foreground/75 sm:text-[11px]">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
