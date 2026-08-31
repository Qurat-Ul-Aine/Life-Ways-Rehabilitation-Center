import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import AppointmentCalendar from "../components/Calendar";
import { appointmentService } from "../services/appointmentService";
import type { Appointment } from "../appointment.types";

export default function CalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "patient";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  const [month, setMonth] = useState(new Date());
  const [items, setItems] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    void appointmentService.list().then(setItems);
  }, []);

  const dayItems = useMemo(
    () => items.filter((a) => a.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [items, selectedDate],
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Monthly view of appointments."
        action={
          <Button onClick={() => navigate(`${basePath}/appointments/new`)}>
            <Plus className="h-4 w-4" /> Book
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {month.toLocaleString("default", { month: "long", year: "numeric" })}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AppointmentCalendar
              month={month}
              appointments={items}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedDate}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments.</p>
            ) : (
              dayItems.map((a) => (
                <div key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.startTime}–{a.endTime}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                  <p className="mt-1">{a.patientName} → {a.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{a.mode} · {a.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}