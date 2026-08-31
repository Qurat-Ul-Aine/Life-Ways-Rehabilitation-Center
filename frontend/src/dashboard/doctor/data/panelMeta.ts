import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Brain,
  ClipboardList,
  Bell,
  FileText,
  Pill,
  FlaskConical,
  MessageSquare,
  Settings,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { DoctorDashboardSummary } from "../types/doctor-dashboard.types";
import { getTopbarTitle } from "./topbar";

export type PanelStat = { label: string; value: string | number };

export type PanelAction = {
  label: string;
  icon?: LucideIcon;
  to?: string;
};

export type PanelMeta = {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  gradient: string;
  showInSidebar: boolean;
  showInBottomNav: boolean;
  getTitle: (data: DoctorDashboardSummary | null, loading: boolean) => string;
  getSubtitle: (data: DoctorDashboardSummary | null, loading: boolean) => string;
  getStats: (data: DoctorDashboardSummary | null, loading: boolean) => PanelStat[];
  primaryAction?: PanelAction;
};

const dash = (v: string | number | undefined, loading: boolean) =>
  loading ? "—" : (v ?? "—");

export const PANEL_META: PanelMeta[] = [
  {
    id: "home",
    path: "/doctor/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "Overview",
    gradient: "from-primary/90 via-primary to-emerald-700",
    showInSidebar: true,
    showInBottomNav: true,
    getTitle: (data) => {
      const name = data?.profile?.name?.split(" ").pop() ?? "Doctor";
      const h = new Date().getHours();
      const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
      return `${greet}, Dr. ${name}`;
    },
    getSubtitle: () => "Your clinical overview for today",
    getStats: (data, loading) => [
      { label: "Patients", value: dash(data?.stats?.totalPatients, loading) },
      { label: "Sessions today", value: dash(data?.stats?.sessionsToday, loading) },
      { label: "Pending notes", value: dash(data?.stats?.pendingNotes, loading) },
      { label: "Avg recovery", value: loading ? "—" : `${data?.stats?.avgRecovery ?? 0}%` },
    ],
    primaryAction: { label: "View schedule", icon: CalendarDays, to: "/doctor/appointments" },
  },
  {
    id: "patients",
    path: "/doctor/patients",
    label: "My Patients",
    icon: Users,
    section: "Clinical",
    gradient: "from-teal-600 via-teal-600 to-emerald-700",
    showInSidebar: true,
    showInBottomNav: true,
    getTitle: () => "My Patients",
    getSubtitle: (data, loading) =>
      loading
        ? "Loading assigned patients…"
        : `${data?.stats?.totalPatients ?? 0} patients under your care`,
    getStats: (data, loading) => [
      { label: "Total assigned", value: dash(data?.stats?.totalPatients, loading) },
      { label: "New this week", value: dash(data?.stats?.newThisWeek, loading) },
      { label: "Avg recovery", value: loading ? "—" : `${data?.stats?.avgRecovery ?? 0}%` },
    ],
    primaryAction: { label: "View patients", icon: Users, to: "/doctor/patients" },
  },
  {
    id: "appointments",
    path: "/doctor/appointments",
    label: "Appointments",
    icon: CalendarDays,
    section: "Clinical",
    gradient: "from-teal-600 via-teal-600 to-emerald-700",
    showInSidebar: true,
    showInBottomNav: true,
    getTitle: () => "Appointments",
    getSubtitle: (data, loading) =>
      loading
        ? "Loading your appointment schedule…"
        : `${data?.stats?.sessionsToday ?? 0} session(s) scheduled for today`,
    getStats: (data, loading) => [
      { label: "Total today", value: dash(data?.stats?.sessionsToday, loading) },
      { label: "Completed", value: dash(data?.stats?.sessionsCompleted, loading) },
      {
        label: "Pending notes",
        value: dash(data?.stats?.pendingNotes, loading),
      },
    ],
    primaryAction: { label: "View appointments", icon: CalendarDays, to: "/doctor/appointments" },
  },
  {
    id: "therapy",
    path: "/doctor/therapy",
    label: "Treatment Plans",
    icon: Brain,
    section: "Clinical",
    gradient: "from-teal-600 via-teal-600 to-emerald-700",
    showInSidebar: true,
    showInBottomNav: true,
    getTitle: () => "Therapy Plans",
    getSubtitle: (data, loading) =>
      loading ? "Loading active plans…" : "Manage rehabilitation therapy programs",
    getStats: (data, loading) => [
      { label: "Active patients", value: dash(data?.stats?.totalPatients, loading) },
      { label: "Avg recovery", value: loading ? "—" : `${data?.stats?.avgRecovery ?? 0}%` },
      { label: "Pending notes", value: dash(data?.stats?.pendingNotes, loading) },
    ],
    primaryAction: { label: "New plan", icon: Brain, to: "/doctor/therapy/new" },
  },
  {
    id: "notes",
    path: "/doctor/notes",
    label: "Session Notes",
    icon: ClipboardList,
    section: "Clinical",
    gradient: "from-teal-600 via-teal-600 to-emerald-700",
    showInSidebar: true,
    showInBottomNav: false,
    getTitle: () => "Clinical Notes",
    getSubtitle: (data, loading) =>
      loading
        ? "Loading notes…"
        : `${data?.stats?.pendingNotes ?? 0} session note(s) pending documentation`,
    getStats: (data, loading) => [
      { label: "Pending notes", value: dash(data?.stats?.pendingNotes, loading) },
      { label: "Sessions today", value: dash(data?.stats?.sessionsToday, loading) },
      { label: "Patients", value: dash(data?.stats?.totalPatients, loading) },
    ],
    primaryAction: { label: "New note", icon: ClipboardList },
  },
  {
    id: "ai-matches",
    path: "/doctor/ai-matches",
    label: "AI Matches",
    icon: Sparkles,
    section: "Clinical",
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "AI Matches",
    getSubtitle: () => "Patients recommended to you by the clinical decision support system",
    getStats: () => [],
  },
  {
    id: "notif",
    path: "/doctor/notifications",
    label: "Notifications",
    icon: Bell,
    section: "Communication",
    gradient: "from-rose-600 via-pink-600 to-rose-700",
    showInSidebar: true,
    showInBottomNav: true,
    getTitle: () => "Notifications",
    getSubtitle: (data, loading) =>
      loading
        ? "Loading alerts…"
        : `${data?.patientAlerts?.length ?? 0} active alert(s)`,
    getStats: (data, loading) => [
      { label: "Alerts", value: dash(data?.patientAlerts?.length, loading) },
      { label: "Pending notes", value: dash(data?.stats?.pendingNotes, loading) },
    ],
  },
  {
    id: "reports",
    path: "/doctor/reports",
    label: "Reports",
    icon: FileText,
    section: "Reports",
    gradient: "from-slate-600 via-slate-700 to-slate-800",
    showInSidebar: true,
    showInBottomNav: false,
    getTitle: () => "Performance Reports",
    getSubtitle: () => "Analytics and clinical outcomes",
    getStats: (data, loading) => [
      { label: "Patients", value: dash(data?.stats?.totalPatients, loading) },
      { label: "Avg recovery", value: loading ? "—" : `${data?.stats?.avgRecovery ?? 0}%` },
      { label: "Success rate", value: loading ? "—" : `${data?.profile?.successRate ?? 0}%` },
    ],
    primaryAction: { label: "Export report", icon: FileText },
  },
  {
    id: "prescriptions",
    path: "/doctor/prescriptions",
    label: "Prescriptions",
    icon: Pill,
    section: "Clinical",
    gradient: "from-cyan-600 via-teal-600 to-cyan-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "Prescriptions",
    getSubtitle: () => "Medication orders and renewals",
    getStats: () => [{ label: "Status", value: "Preview" }],
  },
  {
    id: "lab",
    path: "/doctor/lab",
    label: "Lab Orders",
    icon: FlaskConical,
    section: "Clinical",
    gradient: "from-indigo-600 via-blue-600 to-indigo-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "Lab Results",
    getSubtitle: () => "Orders and diagnostic results",
    getStats: () => [{ label: "Status", value: "Preview" }],
  },
  {
    id: "messages",
    path: "/doctor/messages",
    label: "Messages",
    icon: MessageSquare,
    section: "Communication",
    gradient: "from-emerald-600 via-teal-600 to-emerald-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "Messages",
    getSubtitle: () => "Patient and team communications",
    getStats: () => [{ label: "Unread", value: "—" }],
  },
  {
    id: "performance",
    path: "/doctor/performance",
    label: "My Performance",
    icon: TrendingUp,
    section: "Reports",
    gradient: "from-primary via-emerald-600 to-teal-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "My Performance",
    getSubtitle: (data) =>
      `${data?.profile?.patientsTreated ?? 0} patients treated · ${data?.profile?.successRate ?? 0}% success rate`,
    getStats: (data, loading) => [
      { label: "Patients treated", value: dash(data?.profile?.patientsTreated, loading) },
      { label: "Success rate", value: loading ? "—" : `${data?.profile?.successRate ?? 0}%` },
      { label: "Experience", value: loading ? "—" : `${data?.profile?.experience ?? 0} yrs` },
    ],
  },
  {
    id: "settings",
    path: "/doctor/dashboard/settings",
    label: "Settings",
    icon: Settings,
    section: "Account",
    gradient: "from-slate-600 via-slate-600 to-slate-700",
    showInSidebar: false,
    showInBottomNav: false,
    getTitle: () => "Settings",
    getSubtitle: () => "Manage your profile, schedule, and preferences",
    getStats: () => [],
  },
];

export const PANEL_BY_PATH = new Map(PANEL_META.map((p) => [p.path, p]));

export function resolvePanelMeta(pathname: string): PanelMeta {
  const exact = PANEL_BY_PATH.get(pathname);
  if (exact) return exact;
  const match = PANEL_META.find(
    (p) => p.path !== "/doctor/dashboard" && pathname.startsWith(p.path),
  );
  if (match) return match;

  const title = getTopbarTitle(pathname);
  const base = PANEL_META[0];
  return {
    ...base,
    id: "page",
    path: pathname,
    label: title,
    getTitle: () => title,
    getSubtitle: () => "",
    getStats: () => [],
    primaryAction: undefined,
  };
}

export const SIDEBAR_PANELS = PANEL_META.filter((p) => p.showInSidebar);
export const BOTTOM_NAV_PANELS = PANEL_META.filter((p) => p.showInBottomNav);

/** @deprecated — use SIDEBAR_PANELS */
export const HIDDEN_PANEL_IDS = PANEL_META.filter((p) => !p.showInSidebar).map((p) => p.id);
