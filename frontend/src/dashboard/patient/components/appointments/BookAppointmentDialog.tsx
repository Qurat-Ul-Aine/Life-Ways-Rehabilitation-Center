import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TimeSlotPicker from "@/features/appointment/components/TimeSlotPicker";
import AppointmentReasonField from "@/features/appointment/components/AppointmentReasonField";
import { appointmentService } from "@/features/appointment/services/appointmentService";
import { doctorService } from "@/features/doctor/services/doctorService";
import type {
  AppointmentMode,
  DoctorOption,
  RehabilitationService,
} from "@/features/appointment/appointment.types";
import {
  formatAppointmentReason,
  validateAppointmentReason,
  type AppointmentReasonOption,
} from "@/features/appointment/utils/appointmentReason";
import {
  todayStr,
  validateNotPastTime,
} from "@/features/appointment/utils/appointmentDisplay";
import { refreshPatientDashboard } from "@/features/patient/utils/patientDashboardRefresh";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onSuccess: () => void;
  initialDoctorId?: string;
  initialAnalysisId?: string;
};

export default function BookAppointmentDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
  initialDoctorId,
  initialAnalysisId,
}: Props) {
  const [services, setServices] = useState<RehabilitationService[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mode, setMode] = useState<AppointmentMode>("in-person");
  const [visitReason, setVisitReason] = useState<AppointmentReasonOption | "">("");
  const [visitReasonOther, setVisitReasonOther] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingServices(true);
    appointmentService
      .listServices()
      .then(async (serviceList) => {
        setServices(serviceList);
        if (initialDoctorId) {
          try {
            const doctor = await doctorService.getById(initialDoctorId);
            const firstServiceId = doctor?.services?.[0]?.id;
            if (firstServiceId) {
              setServiceId(firstServiceId);
              setDoctorId(initialDoctorId);
            }
          } catch {
            // Doctor pre-select is best-effort
          }
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load services."))
      .finally(() => setLoadingServices(false));
  }, [open, initialDoctorId]);

  useEffect(() => {
    if (!open || !serviceId) {
      setDoctors([]);
      return;
    }
    setLoadingDoctors(true);
    appointmentService
      .listDoctors(serviceId)
      .then((list) => {
        setDoctors(list);
        if (list.length === 1) setDoctorId(list[0].id);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load doctors."))
      .finally(() => setLoadingDoctors(false));
  }, [open, serviceId]);

  const resetForm = () => {
    setServiceId("");
    setDoctorId("");
    setDate(todayStr());
    setStartTime("");
    setEndTime("");
    setMode("in-person");
    setVisitReason("");
    setVisitReasonOther("");
  };

  const handleClose = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const selectedService = services.find((s) => s.id === serviceId);

  const handleSubmit = async () => {
    const reasonError = validateAppointmentReason(visitReason, visitReasonOther);
    if (reasonError) {
      toast.error(reasonError);
      return;
    }

    if (!serviceId || !date || !startTime) {
      toast.error("Please select a service, date, and time slot.");
      return;
    }

    const pastTimeError = validateNotPastTime(date, startTime);
    if (pastTimeError) {
      toast.error(pastTimeError);
      return;
    }

    if (!doctors.length) {
      toast.error("No doctors are available for the selected rehabilitation service.");
      return;
    }

    setSubmitting(true);
    try {
      await appointmentService.create({
        patientId,
        patientName,
        doctorId: doctorId || doctors[0].id,
        doctorName: selectedDoctor?.name ?? doctors[0]?.name ?? "",
        serviceId,
        date,
        startTime,
        endTime: endTime || startTime,
        mode,
        reason: formatAppointmentReason(visitReason, visitReasonOther),
        analysisId: initialAnalysisId,
      });
      toast.success("Appointment booked successfully.");
      resetForm();
      onOpenChange(false);
      onSuccess();
      refreshPatientDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>
            Choose your rehabilitation service, then pick a date and available time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Rehabilitation service *</Label>
            <Select
              value={serviceId}
              disabled={loadingServices}
              onValueChange={(v) => {
                setServiceId(v);
                setDoctorId("");
                setStartTime("");
                setEndTime("");
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingServices ? "Loading services..." : "Select a program"}
                />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService?.description && (
              <p className="text-xs text-muted-foreground">{selectedService.description}</p>
            )}
          </div>

          {serviceId && (
            <div className="space-y-1.5">
              <Label>Doctor {doctors.length > 1 ? "*" : ""}</Label>
              {doctors.length > 1 ? (
                <Select
                  value={doctorId}
                  disabled={loadingDoctors}
                  onValueChange={(v) => {
                    setDoctorId(v);
                    setStartTime("");
                    setEndTime("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingDoctors ? "Loading doctors..." : "Select doctor"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.specialization ? ` — ${d.specialization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : loadingDoctors ? (
                <p className="text-sm text-muted-foreground">Loading assigned doctors...</p>
              ) : doctors.length === 1 ? (
                <p className="text-sm text-foreground">
                  {doctors[0].name}
                  {doctors[0].specialization ? ` — ${doctors[0].specialization}` : ""}
                </p>
              ) : (
                <p className="text-sm text-destructive">
                  No doctors are assigned to this service yet. Please contact the center.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="book-date">Date *</Label>
              <Input
                id="book-date"
                type="date"
                min={todayStr()}
                value={date}
                disabled={!serviceId || !doctors.length}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartTime("");
                  setEndTime("");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visit type *</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as AppointmentMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">In-person</SelectItem>
                  <SelectItem value="online">Telehealth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Available time *</Label>
            {serviceId && (doctorId || doctors.length === 1) && date ? (
              <TimeSlotPicker
                doctorId={doctorId || doctors[0]?.id}
                date={date}
                value={startTime ? { startTime, endTime } : undefined}
                onChange={(s) => {
                  setStartTime(s.startTime);
                  setEndTime(s.endTime);
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a service{doctors.length > 1 ? ", doctor," : ""} and date first.
              </p>
            )}
          </div>

          <AppointmentReasonField
            id="patient-book-reason"
            value={visitReason}
            otherValue={visitReasonOther}
            onValueChange={setVisitReason}
            onOtherValueChange={setVisitReasonOther}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !startTime || !serviceId || !doctors.length}
          >
            {submitting ? "Booking..." : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
