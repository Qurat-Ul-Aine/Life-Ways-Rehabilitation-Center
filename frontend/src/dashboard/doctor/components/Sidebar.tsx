import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stethoscope, LogOut, Settings, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { SIDEBAR_NAV } from "../data/nav";

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isNavActive = (pathname: string, path: string) =>
  pathname === path || (path !== "/doctor/dashboard" && pathname.startsWith(`${path}/`));

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function Sidebar({ mobileOpen = false, onMobileClose }: Props) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { data } = useDoctorDashboard();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const displayName = data?.profile?.name ?? user?.name ?? "Doctor";
  const displayEmail = data?.profile?.email ?? user?.email ?? "";
  const initials = getInitials(displayName);
  const avatarUrl = resolveUploadUrl(data?.profile?.image);

  const sections = useMemo(
    () =>
      SIDEBAR_NAV.reduce<Record<string, typeof SIDEBAR_NAV>>((acc, item) => {
        acc[item.section] = acc[item.section] ?? [];
        acc[item.section].push(item);
        return acc;
      }, {}),
    [],
  );

  const handleLogout = () => {
    logout();
    navigate("/login/doctor", { replace: true });
  };

  const navContent = (
    <>
      <div className="shrink-0 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-foreground">
                Lifeways Rehab
              </p>
              <p className="truncate text-[10px] text-muted-foreground">Doctor Portal</p>
            </div>
          </div>
          {onMobileClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 lg:hidden"
              onClick={onMobileClose}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0 border-b border-sidebar-border p-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 border border-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.path);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 max-lg:py-3",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[15px] w-[15px] shrink-0",
                          active ? "text-primary-foreground" : "text-muted-foreground",
                        )}
                        aria-hidden
                      />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px] text-muted-foreground hover:text-foreground max-lg:h-11"
            onClick={() => {
              navigate("/doctor/dashboard/settings");
              onMobileClose?.();
            }}
          >
            <Settings className="h-3 w-3" aria-hidden />
            Settings
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px] max-lg:h-11"
            onClick={handleLogout}
          >
            <LogOut className="h-3 w-3" aria-hidden />
            Logout
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-full min-h-0 w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[2px_0_16px_-6px_hsl(200_25%_15%_/0.1)] z-20 lg:flex">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-overlay backdrop-blur-[1px]"
            aria-label="Close menu overlay"
            onClick={onMobileClose}
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col border-r border-sidebar-border bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
