import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  lastSync: Date | null;
  syncing?: boolean;
  onRefresh?: () => void;
};

export default function DashboardFooter({ lastSync, syncing, onRefresh }: Props) {
  const syncLabel = lastSync
    ? lastSync.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <footer className="mt-8 flex flex-col gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-2 w-2 rounded-full",
            syncing ? "animate-pulse bg-amber-500" : "bg-emerald-500",
          )}
          aria-hidden
        />
        <span>
          System {syncing ? "syncing" : "online"} · Last sync {syncLabel}
        </span>
      </div>
      {onRefresh && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 self-start text-[11px] sm:self-auto"
          onClick={onRefresh}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
          Refresh data
        </Button>
      )}
    </footer>
  );
}
