import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Brain,
  ClipboardList,
  Pill,
  Sparkles,
  FileText,
  GraduationCap,
  Bell,
  MessageSquare,
  UserCircle,
} from "lucide-react";

export type NavItem = {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
};

export const SIDEBAR_NAV: NavItem[] = [
  {
    id: "dashboard",
    path: "/doctor/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Overview",
  },
  {
    id: "appointments",
    path: "/doctor/appointments",
    label: "Appointments",
    icon: CalendarDays,
    section: "Clinical",
  },
  {
    id: "patients",
    path: "/doctor/patients",
    label: "My Patients",
    icon: Users,
    section: "Clinical",
  },
  {
    id: "therapy",
    path: "/doctor/therapy",
    label: "Treatment Plans",
    icon: Brain,
    section: "Clinical",
  },
  {
    id: "prescriptions",
    path: "/doctor/prescriptions",
    label: "Prescriptions",
    icon: Pill,
    section: "Clinical",
  },
  {
    id: "notes",
    path: "/doctor/notes",
    label: "Session Notes",
    icon: ClipboardList,
    section: "Clinical",
  },
  {
    id: "ai-matches",
    path: "/doctor/ai-matches",
    label: "AI Matches",
    icon: Sparkles,
    section: "Clinical",
  },
  {
    id: "reports",
    path: "/doctor/reports",
    label: "Reports",
    icon: FileText,
    section: "Tools",
  },
  {
    id: "interns",
    path: "/doctor/interns",
    label: "My Interns",
    icon: GraduationCap,
    section: "Tools",
  },
  {
    id: "messages",
    path: "/doctor/messages",
    label: "Messages",
    icon: MessageSquare,
    section: "Communication",
  },
  {
    id: "notifications",
    path: "/doctor/notifications",
    label: "Notifications",
    icon: Bell,
    section: "Communication",
  },
  {
    id: "profile",
    path: "/doctor/profile",
    label: "My Profile",
    icon: UserCircle,
    section: "Account",
  },
];

/** Mobile bottom bar — primary destinations */
export const MOBILE_BOTTOM_NAV = SIDEBAR_NAV.filter((item) =>
  ["dashboard", "patients", "therapy", "messages"].includes(item.id),
);

/** @deprecated */
export const NAV = SIDEBAR_NAV;
export const HIDDEN_PANEL_IDS: string[] = [];
