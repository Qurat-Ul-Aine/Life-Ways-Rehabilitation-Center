import React from "react";
import {
  LayoutDashboard, CalendarDays, Activity, BookOpen, FlaskConical,
  Bell, Brain, MessageSquare, Pill, FileText, Sparkles, UserCircle,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section: string;
  href?: string;
};

export const NAV: NavItem[] = [
  { id: "home",         label: "My Health",        icon: <LayoutDashboard size={15} />, section: "Overview" },
  { id: "appointments", label: "Appointments",     icon: <CalendarDays size={15} />,   section: "My Care" },
  { id: "recovery",     label: "Recovery Progress", icon: <Activity size={15} />,      section: "My Care" },
  { id: "therapy",      label: "Therapy Plan",     icon: <BookOpen size={15} />,       section: "My Care" },
  { id: "screening",        label: "Screening Results", icon: <FlaskConical size={15} />,  section: "My Care" },
  { id: "ai-recommendations", label: "AI Recommendations", icon: <Brain size={15} />, section: "My Care" },
  { id: "recommendations",    label: "Find a Doctor",      icon: <Sparkles size={15} />, section: "My Care", href: "/find-my-doctor" },
  { id: "medications",  label: "Medications",      icon: <Pill size={15} />,           section: "My Care" },
  { id: "messages",     label: "Messages",         icon: <MessageSquare size={15} />,  section: "Communication" },
  { id: "notifications", label: "Notifications", icon: <Bell size={15} />, section: "Communication" },
  { id: "profile",      label: "My Profile",       icon: <UserCircle size={15} />,     section: "Account" },
  { id: "reports",      label: "My Reports",       icon: <FileText size={15} />,       section: "Account" },
];
