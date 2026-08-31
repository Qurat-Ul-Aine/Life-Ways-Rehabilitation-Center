import { Skeleton } from "@/components/ui/skeleton";
import { useInternDashboardContext } from "../hooks/InternDashboardContext";
import type { InternDashboardData } from "@/features/intern/intern.types";
import type { ReactNode } from "react";

type Props = {
  children: (data: InternDashboardData) => ReactNode;
};

export function DashboardState({ children }: Props) {
  const { data, loading, error } = useInternDashboardContext();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">{error ?? "Dashboard unavailable."}</p>
    );
  }

  return <>{children(data)}</>;
}
