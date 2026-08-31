import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDoctorDashboard } from "../hooks/DoctorDashboardContext";
import { doctorPatientPath } from "../utils/routes";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = today.toLocaleDateString("en-PK", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{monthLabel}</p>
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <span key={d} className="py-0.5 font-medium">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          const isToday = day === today.getDate();
          return (
            <span
              key={i}
              className={cn(
                "flex h-6 items-center justify-center rounded-md text-[10px]",
                day == null && "invisible",
                isToday && "bg-primary font-semibold text-primary-foreground",
                !isToday && day && "text-foreground",
              )}
            >
              {day ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function RightSidebar({ collapsed, onToggle }: Props) {
  const { data, loading } = useDoctorDashboard();
  const [search, setSearch] = useState("");

  const schedule = data?.todaySchedule ?? [];
  const alerts = data?.patientAlerts ?? [];
  const patients = data?.patients ?? data?.patientRecovery ?? [];

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 5);
    return patients
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [patients, search]);

  if (collapsed) {
    return (
      <div className="hidden shrink-0 border-l border-border bg-card p-2 xl:flex xl:flex-col">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          aria-label="Expand widgets panel"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-card xl:flex">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground">Quick widgets</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggle}
          aria-label="Collapse widgets panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <MiniCalendar />

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Today&apos;s schedule</p>
              <Link
                to="/doctor/appointments"
                className="text-[10px] font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <p className="text-[11px] text-muted-foreground">Loading…</p>
            ) : schedule.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No sessions scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {schedule.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex gap-2 text-[11px]">
                    <span className="shrink-0 font-semibold text-muted-foreground">{s.time}</span>
                    <span className="truncate text-foreground">{s.patientName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Patient search</p>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="mb-2 h-8 text-xs"
            />
            <ul className="space-y-1.5">
              {filteredPatients.map((p) => (
                <li key={p.id}>
                  <Link
                    to={doctorPatientPath(p.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors hover:bg-muted"
                  >
                    <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                </li>
              ))}
              {!loading && filteredPatients.length === 0 && (
                <li className="text-[11px] text-muted-foreground">No patients found.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">Recent alerts</p>
              </div>
              <Link
                to="/doctor/notifications"
                className="text-[10px] font-medium text-primary hover:underline"
              >
                All
              </Link>
            </div>
            {alerts.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No new alerts.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-[11px]">
                    {a.patientId ? (
                      <Link
                        to={doctorPatientPath(a.patientId)}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {a.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-foreground">{a.name}</p>
                    )}
                    <p className="text-muted-foreground">{a.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

/** Collapsed strip icons — unused but kept for mobile sheet variant */
export function RightSidebarToggleIcons() {
  return (
    <>
      <ChevronLeft className="h-4 w-4" />
      <ChevronRight className="h-4 w-4" />
    </>
  );
}
