import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  HeartPulse,
  ClipboardList,
  AlertTriangle,
  BarChart3,
  Brain,
  FileText,
  GraduationCap,
  Bell,
  LogOut,
  Activity,
  Stethoscope,
  Pill,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "admin" | "doctor" | "patient" | "staff";

type SidebarProps = {
  onNavigate?: () => void;
  collapsed?: boolean;
};

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navByRole: Record<Role, NavSection[]> = {
  admin: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Profile", to: "/admin/dashboard/profile", icon: UserCircle },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Patients", to: "/admin/patients", icon: Users },
        { label: "Doctors", to: "/admin/doctors", icon: Stethoscope },
        { label: "Staff", to: "/admin/staff", icon: UserCog },
      ],
    },
    {
      title: "Clinical",
      items: [
        { label: "Appointments", to: "/admin/appointments", icon: CalendarDays },
        { label: "Therapy", to: "/admin/therapy", icon: HeartPulse },
        { label: "Medications", to: "/admin/medications", icon: Pill },
        { label: "Screening", to: "/admin/screening", icon: ClipboardList, end: true },
        { label: "High Risk Patients", to: "/admin/screening/high-risk", icon: AlertTriangle },
        { label: "Screening Analytics", to: "/admin/screening/analytics", icon: BarChart3 },
      ],
    },
    {
      title: "System",
      items: [
        { label: "AI Recommendation Management", to: "/admin/ai-recommendations", icon: Brain },
        { label: "Reports", to: "/admin/reports", icon: FileText },
        { label: "Internship", to: "/admin/internship", icon: GraduationCap },
        { label: "Notifications", to: "/admin/notifications", icon: Bell },
        { label: "Settings", to: "/admin/dashboard/settings", icon: Settings },
      ],
    },
  ],
  doctor: [
    {
      title: "Overview",
      items: [{ label: "Dashboard", to: "/doctor/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Clinical",
      items: [
        { label: "My Patients", to: "/doctor/patients", icon: Users },
        { label: "Appointments", to: "/doctor/appointments", icon: CalendarDays },
        { label: "Therapy", to: "/doctor/therapy", icon: HeartPulse },
        { label: "Reports", to: "/doctor/reports", icon: FileText },
      ],
    },
  ],
  patient: [
    {
      title: "Overview",
      items: [{ label: "Dashboard", to: "/patient/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Care",
      items: [
        { label: "My Appointments", to: "/patient/appointments", icon: CalendarDays },
        { label: "My Therapy", to: "/patient/therapy", icon: HeartPulse },
        { label: "Screening", to: "/patient/screening", icon: ClipboardList },
      ],
    },
    {
      title: "System",
      items: [{ label: "Notifications", to: "/patient/dashboard/notifications", icon: Bell }],
    },
  ],
  staff: [
    {
      title: "Overview",
      items: [{ label: "Dashboard", to: "/staff/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Management",
      items: [
        { label: "Patients", to: "/admin/patients", icon: Users },
        { label: "Appointments", to: "/admin/appointments", icon: CalendarDays },
      ],
    },
  ],
};

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "LW"
  );
}

export default function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { hospital } = useHospitalSettings();
  const role = (user?.role as Role | undefined) ?? "patient";
  const sections = navByRole[role] ?? [];
  const logoUrl = resolveUploadUrl(hospital.logoUrl);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-5",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <Activity className="h-5 w-5" aria-hidden />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-semibold text-foreground">
              {hospital.hospitalName}
            </p>
            <p className="truncate text-xs text-muted-foreground capitalize">
              {role} portal
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )
                    }
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    to={item.to}
                    end={item.end}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-3",
            collapsed && "justify-center p-2",
          )}
        >
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name ?? "User"}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground capitalize">
                <Stethoscope className="h-3 w-3 shrink-0" aria-hidden />
                {user?.role ?? "guest"}
              </p>
            </div>
          )}
        </div>
        <Button
          className={cn("w-full", collapsed && "px-0")}
          onClick={logout}
          size={collapsed ? "icon" : "default"}
          variant="outline"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
