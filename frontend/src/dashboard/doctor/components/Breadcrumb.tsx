import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { resolvePanelMeta } from "../data/panelMeta";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  subPage?: string;
};

export default function Breadcrumb({ className, subPage }: Props) {
  const { pathname } = useLocation();
  const panel = resolvePanelMeta(pathname);
  const isHome = panel.id === "home";

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <Link
        to="/doctor/dashboard"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span>Home</span>
      </Link>

      {!isHome && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          {subPage ? (
            <>
              <Link
                to={panel.path}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {panel.label}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              <span className="font-medium text-foreground">{subPage}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">{panel.label}</span>
          )}
        </>
      )}

      {isHome && subPage && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          <span className="font-medium text-foreground">{subPage}</span>
        </>
      )}
    </nav>
  );
}
