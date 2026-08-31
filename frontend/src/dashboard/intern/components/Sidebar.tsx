import { useMemo } from "react";
import { GraduationCap, LogOut, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";
import { NAV, type NavItem } from "../data/nav";
import { useInternDashboardContext } from "../hooks/InternDashboardContext";

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { data, loading } = useInternDashboardContext();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = data?.intern.name ?? user?.name ?? "Intern";
  const displayEmail = data?.intern.email ?? user?.email ?? "";
  const department = data?.intern.department ?? "—";
  const initials = getInitials(displayName);
  const status = data?.stats.internshipStatus ?? "Active";

  const sections = useMemo(
    () =>
      NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
        acc[item.section] = acc[item.section] ?? [];
        acc[item.section].push(item);
        return acc;
      }, {}),
    [],
  );

  const handleLogout = () => {
    logout();
    navigate("/intern/login", { replace: true });
  };

  return (
    <aside className="flex h-full min-h-0 w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[2px_0_16px_-6px_hsl(200_25%_15%_/0.1)] z-20">
      <div className="shrink-0 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-foreground">Lifeways Rehab</p>
            <p className="truncate text-[10px] text-muted-foreground">Intern Portal</p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-sidebar-border p-3">
        {loading ? (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {displayEmail}
                  {department !== "—" ? <>&nbsp;·&nbsp;{department}</> : null}
                </p>
              </div>
            </div>
            <Badge
              variant={status === "Active" ? "secondary" : "outline"}
              className="mt-2 text-[10px] capitalize"
            >
              {status}
            </Badge>
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0 [&_svg]:h-[15px] [&_svg]:w-[15px]",
                          isActive ? "text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 px-1 text-[10px]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3 w-3" aria-hidden />
            Settings
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px]"
            onClick={handleLogout}
          >
            <LogOut className="h-3 w-3" aria-hidden />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
