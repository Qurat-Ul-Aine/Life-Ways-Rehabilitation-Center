import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Loader2,
  Search,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  adminService,
  type AdminGlobalSearchResults,
} from "@/features/admin/services/adminService";

const EMPTY_RESULTS: AdminGlobalSearchResults = {
  patients: [],
  doctors: [],
  staff: [],
  appointments: [],
};

type Props = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

function hasResults(results: AdminGlobalSearchResults): boolean {
  return (
    results.patients.length > 0 ||
    results.doctors.length > 0 ||
    results.staff.length > 0 ||
    results.appointments.length > 0
  );
}

function resolveEnterRoute(q: string, results: AdminGlobalSearchResults): string {
  const lower = q.toLowerCase();
  if (lower.includes("appointment") || lower.includes("appt")) {
    return `/admin/appointments?search=${encodeURIComponent(q)}`;
  }
  if (lower.includes("doctor") || lower.includes("dr ")) {
    return `/admin/doctors?search=${encodeURIComponent(q)}`;
  }
  if (lower.includes("staff")) {
    return `/admin/staff?search=${encodeURIComponent(q)}`;
  }
  if (lower.includes("patient")) {
    return `/admin/patients?search=${encodeURIComponent(q)}`;
  }

  const counts = [
    { key: "appointments", len: results.appointments.length, path: `/admin/appointments?search=${encodeURIComponent(q)}` },
    { key: "doctors", len: results.doctors.length, path: `/admin/doctors?search=${encodeURIComponent(q)}` },
    { key: "staff", len: results.staff.length, path: `/admin/staff?search=${encodeURIComponent(q)}` },
    { key: "patients", len: results.patients.length, path: `/admin/patients?search=${encodeURIComponent(q)}` },
  ];
  const best = counts.sort((a, b) => b.len - a.len).find((c) => c.len > 0);
  return best?.path ?? `/admin/patients?search=${encodeURIComponent(q)}`;
}

export default function AdminGlobalSearch({
  className,
  inputClassName,
  placeholder = "Search patients, doctors, appointments...",
}: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminGlobalSearchResults>(EMPTY_RESULTS);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await adminService.globalSearch(trimmed);
      setResults(data);
    } catch (err) {
      setResults(EMPTY_RESULTS);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    go(resolveEnterRoute(q, results));
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search patients, doctors, staff, appointments"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          className={cn("h-10 border-border bg-muted/40 pl-9", inputClassName)}
          placeholder={placeholder}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </form>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : error ? (
            <p className="px-3 py-4 text-sm text-destructive">{error}</p>
          ) : !hasResults(results) ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No results for &quot;{query.trim()}&quot;
            </p>
          ) : (
            <div className="space-y-3">
              {results.patients.length > 0 ? (
                <section>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Patients
                  </p>
                  <ul className="space-y-0.5">
                    {results.patients.map((item) => (
                      <li key={`patient-${item.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                          onClick={() => go(`/admin/patients/${item.id}`)}
                        >
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle || item.email}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                    onClick={() =>
                      go(`/admin/patients?search=${encodeURIComponent(query.trim())}`)
                    }
                  >
                    View all patients
                  </button>
                </section>
              ) : null}

              {results.doctors.length > 0 ? (
                <section>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Doctors
                  </p>
                  <ul className="space-y-0.5">
                    {results.doctors.map((item) => (
                      <li key={`doctor-${item.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                          onClick={() => go(`/admin/doctors/${item.id}`)}
                        >
                          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle || item.email}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                    onClick={() =>
                      go(`/admin/doctors?search=${encodeURIComponent(query.trim())}`)
                    }
                  >
                    View all doctors
                  </button>
                </section>
              ) : null}

              {results.staff.length > 0 ? (
                <section>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Staff
                  </p>
                  <ul className="space-y-0.5">
                    {results.staff.map((item) => (
                      <li key={`staff-${item.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                          onClick={() => go(`/admin/staff/${item.id}`)}
                        >
                          <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle || item.email}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                    onClick={() => go(`/admin/staff?search=${encodeURIComponent(query.trim())}`)}
                  >
                    View all staff
                  </button>
                </section>
              ) : null}

              {results.appointments.length > 0 ? (
                <section>
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Appointments
                  </p>
                  <ul className="space-y-0.5">
                    {results.appointments.map((item) => (
                      <li key={`appointment-${item.id}`}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                          onClick={() =>
                            go(`/admin/appointments?search=${encodeURIComponent(query.trim())}`)
                          }
                        >
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.patientName} with {item.doctorName}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[item.date, item.startTime, item.status].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                    onClick={() =>
                      go(`/admin/appointments?search=${encodeURIComponent(query.trim())}`)
                    }
                  >
                    View all appointments
                  </button>
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
