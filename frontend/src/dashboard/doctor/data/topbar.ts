export const TOPBAR_TITLES: Record<string, string> = {
  "/doctor/dashboard": "Dashboard",
  "/doctor/appointments": "Appointments",
  "/doctor/patients": "My Patients",
  "/doctor/therapy": "Treatment Plans",
  "/doctor/notes": "Session Notes",
  "/doctor/ai-matches": "AI Matches",
  "/doctor/reports": "Reports",
  "/doctor/interns": "Interns",
  "/doctor/notifications": "Notifications",
  "/doctor/profile": "My Profile",
  "/doctor/dashboard/settings": "Settings",
  "/doctor/settings": "Settings",
};

export function getTopbarTitle(pathname: string): string {
  if (TOPBAR_TITLES[pathname]) return TOPBAR_TITLES[pathname];

  const match = Object.entries(TOPBAR_TITLES)
    .filter(([path]) => path !== "/doctor/dashboard")
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname.startsWith(path));

  return match?.[1] ?? TOPBAR_TITLES["/doctor/dashboard"];
}

/** @deprecated — use getTopbarTitle(pathname) */
export const TOPBAR: Record<string, string> = {
  home: "Dashboard",
  patients: "My Patients",
  schedule: "Appointments",
  therapy: "Treatment Plans",
  notes: "Session Notes",
  notif: "Notifications",
  reports: "Reports",
};
