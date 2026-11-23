import { useMemo } from "react";
import { Activity, Home, LogOut, Settings, Star } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NAV, NavItem } from "../data/nav";
import { usePatientContext } from "../hooks/usePatientContext";
import { useNotifications } from "@/context/NotificationContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const recoveryLabel = (progress: number): string => {
  if (progress >= 80) return "Excellent";
  if (progress >= 60) return "Good";
  if (progress >= 40) return "Fair";
  if (progress > 0) return "In progress";
  return "Getting started";
};

const filledStars = (progress: number): number => {
  if (progress <= 0) return 0;
  return Math.min(5, Math.max(1, Math.round(progress / 20)));
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { profile, loading } = usePatientContext();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.fullName ?? user?.name ?? "Patient";
  const displayEmail = profile?.email ?? user?.email ?? "";
  const displayPhone = profile?.phone?.trim() || null;
  const displayCondition = profile?.condition?.trim() || "—";
  const initials = getInitials(displayName);
  const recoveryProgress = profile?.recoveryProgress ?? 0;
  const stars = filledStars(recoveryProgress);
  const { unreadCount } = useNotifications();
  const avatarUrl = resolveUploadUrl(profile?.profileImageUrl);

  const sections = useMemo(
    () =>
      NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
        acc[item.section] = acc[item.section] ?? [];
        acc[item.section].push(item);
        return acc;
      }, {}),
    [],
  );

  return (
    <aside className="z-20 flex h-full min-h-0 w-48 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[2px_0_16px_-6px_hsl(200_25%_15%_/0.1)]">
      {/* Brand */}
      <div className="shrink-0 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-foreground">Lifeways Rehab</p>
            <p className="truncate text-[10px] text-muted-foreground">Patient Portal</p>
          </div>
        </div>
      </div>

      {/* Patient profile */}
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
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-2.5 w-2.5 rounded-full" />
              ))}
              <Skeleton className="h-2.5 w-16 ml-0.5" />
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 border border-border">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{displayEmail}</p>
                {displayPhone ? (
                  <p className="truncate text-[10px] text-muted-foreground">{displayPhone}</p>
                ) : null}
                {displayCondition !== "—" ? (
                  <p className="truncate text-[10px] text-muted-foreground">{displayCondition}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={cn(
                    i < stars ? "fill-accent text-accent" : "text-muted-foreground/40",
                  )}
                />
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">
                Recovery: {recoveryLabel(recoveryProgress)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const target = item.href ?? `/patient/dashboard/${item.id}`;
                const isActive = item.href
                  ? location.pathname === item.href
                  : location.pathname.endsWith(`/${item.id}`);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(target)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 max-lg:py-3",
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
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-4 shrink-0 px-1 text-[9px] font-semibold"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      ) : item.badge ? (
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-4 shrink-0 px-1 text-[9px] font-semibold"
                        >
                          {item.badge}
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

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3 space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full gap-1.5 text-[11px] text-muted-foreground hover:text-foreground max-lg:h-11"
          onClick={() => navigate("/")}
        >
          <Home className="h-3.5 w-3.5" aria-hidden />
          Back to website
        </Button>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px] text-muted-foreground hover:text-foreground max-lg:h-11"
            onClick={() => navigate("/patient/dashboard/settings")}
          >
            <Settings className="h-3 w-3" aria-hidden />
            Settings
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px] max-lg:h-11"
            onClick={logout}
          >
            <LogOut className="h-3 w-3" aria-hidden />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;