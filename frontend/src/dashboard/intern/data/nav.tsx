import React from "react";
import {
  LayoutDashboard,
  User,
  BarChart3,
  CalendarCheck,
  BookOpen,
  UserCheck,
  Bell,
  TrendingUp,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section: string;
  path: string;
};

export const NAV: NavItem[] = [
  {
    id: "overview",
    label: "Dashboard",
    icon: <LayoutDashboard size={15} />,
    section: "Main",
    path: "/intern/dashboard/overview",
  },
  {
    id: "profile",
    label: "My Profile",
    icon: <User size={15} />,
    section: "Main",
    path: "/intern/dashboard/profile",
  },
  {
    id: "progress",
    label: "Progress",
    icon: <TrendingUp size={15} />,
    section: "Training",
    path: "/intern/dashboard/progress",
  },
  {
    id: "evaluations",
    label: "Evaluations",
    icon: <BarChart3 size={15} />,
    section: "Training",
    path: "/intern/dashboard/evaluations",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: <CalendarCheck size={15} />,
    section: "Training",
    path: "/intern/dashboard/attendance",
  },
  {
    id: "training-logs",
    label: "Training Logs",
    icon: <BookOpen size={15} />,
    section: "Training",
    path: "/intern/dashboard/training-logs",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell size={15} />,
    section: "Support",
    path: "/intern/dashboard/notifications",
  },
  {
    id: "mentor",
    label: "My Mentor",
    icon: <UserCheck size={15} />,
    section: "Support",
    path: "/intern/dashboard/mentor",
  },
];
