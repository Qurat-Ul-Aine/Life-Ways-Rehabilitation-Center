import { Link, useLocation } from "react-router-dom";
import { Bell, Calendar, ChevronDown, KeyRound, LogOut, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAdminProfile } from "@/features/admin/context/AdminProfileContext";
import AdminGlobalSearch from "@/features/admin/components/AdminGlobalSearch";
import { resolveUploadUrl } from "@/lib/mediaUrl";

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U"
  );
}

function formatToday() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/dashboard/profile": "Profile",
  "/admin/patients": "Patients",
  "/admin/staff": "Staff",
  "/admin/doctors": "Doctors",
  "/admin/appointments": "Appointments",
  "/admin/appointments/calendar": "Calendar",
  "/admin/appointments/new": "Book appointment",
  "/admin/ai-recommendations": "AI recommendations",
  "/admin/medications": "Medications",
  "/admin/screening": "Screening",
  "/admin/reports": "Reports",
  "/admin/internship": "Internship",
  "/admin/notifications": "Notifications",
  "/admin/dashboard/settings": "Settings",
  "/admin/therapy": "Therapy plans",
};

function resolvePageTitle(pathname: string): string | null {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  if (pathname.startsWith("/admin/patients/")) return "Patient details";
  if (pathname.startsWith("/admin/staff/")) return "Staff member";
  if (pathname.startsWith("/admin/doctors/")) return "Doctor profile";
  if (pathname.startsWith("/admin/therapy/")) return "Therapy plan";
  return null;
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const { profile } = useAdminProfile();
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();
  const pageTitle = resolvePageTitle(pathname);
  const avatarUrl = resolveUploadUrl(profile?.avatarUrl);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <AdminGlobalSearch className="hidden w-full max-w-md sm:block" />
          <div className="min-w-0 sm:hidden">
            <p className="text-xs text-muted-foreground">{pageTitle ?? "Welcome back"}</p>
            <h1 className="truncate text-base font-semibold text-foreground">
              {user?.name ?? "User"}
            </h1>
          </div>
          {pageTitle ? (
            <div className="hidden min-w-0 lg:block">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Admin portal
              </p>
              <h1 className="truncate text-lg font-semibold text-foreground">{pageTitle}</h1>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            <span>{formatToday()}</span>
          </div>

          <Link
            to="/admin/notifications"
            aria-label="Notifications"
            className="relative rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <ThemeToggle />

          <Link
            to="/admin/dashboard/settings"
            aria-label="Settings"
            className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-auto gap-2 px-2 py-1.5" variant="ghost">
                <Avatar className="h-8 w-8 border border-border">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.name} /> : null}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold leading-none text-foreground">
                    {user?.name ?? "User"}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {user?.role ?? "guest"}
                  </p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{user?.name ?? "User"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                  <Badge className="mt-1 w-fit capitalize" variant="secondary">
                    {user?.role ?? "guest"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link className="cursor-pointer" to="/admin/dashboard/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link className="cursor-pointer" to="/admin/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link className="cursor-pointer" to="/change-password">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 pb-3 sm:hidden">
        <AdminGlobalSearch placeholder="Search..." />
      </div>
    </header>
  );
}
