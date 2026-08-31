import { Home, Video } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TOPBAR } from "../data/topbar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePatientDashboard } from "@/features/patient/hooks/usePatientDashboard";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { useNotificationBell } from "@/features/notifications/hooks/useNotificationBell";

const formatToday = () =>
  new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime12 = (time?: string | null) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
};

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = usePatientDashboard();
  const bell = useNotificationBell({ viewAllPath: "/patient/dashboard/notifications" });

  const activeKey = location.pathname.split("/").pop() ?? "home";

  const nextAppt = data?.upcomingAppointments?.[0];
  const nextLabel = nextAppt
    ? `Next: ${nextAppt.doctorName ?? "visit"} · ${formatTime12(nextAppt.startTime)}`
    : "No upcoming visits scheduled";

  const canJoinTelehealth =
    nextAppt?.mode === "online" && Boolean(nextAppt.meetingUrl);

  const handleJoinTelehealth = () => {
    if (nextAppt?.meetingUrl) {
      window.open(nextAppt.meetingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    navigate("/patient/dashboard/appointments");
  };

  return (
    <header className="z-30 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-foreground">
          {TOPBAR[activeKey] ?? "Dashboard"}
        </h1>
        <p className="text-xs text-muted-foreground">{formatToday()}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden h-8 gap-1.5 text-xs sm:inline-flex"
          onClick={() => navigate("/")}
        >
          <Home className="h-3.5 w-3.5" aria-hidden />
          Website
        </Button>
        <ThemeToggle />
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 sm:flex">
          {nextAppt ? (
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          ) : null}
          <span className="max-w-[220px] truncate text-xs font-medium text-foreground">
            {nextLabel}
          </span>
        </div>

        <NotificationBell
          notifications={bell.notifications}
          unreadCount={bell.unreadCount}
          loading={bell.loading}
          viewAllPath={bell.viewAllPath}
          onMarkRead={bell.onMarkRead}
          onMarkAllRead={bell.onMarkAllRead}
          onDelete={bell.onDelete}
        />

        {(canJoinTelehealth || nextAppt?.mode === "online") && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleJoinTelehealth}
            disabled={!nextAppt?.meetingUrl}
          >
            <Video className="h-3.5 w-3.5" aria-hidden />
            {nextAppt?.meetingUrl ? "Join Telehealth" : "Telehealth"}
          </Button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
