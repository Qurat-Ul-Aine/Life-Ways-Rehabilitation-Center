import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, User, Video, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { createWaitingSocket } from "@/lib/telehealthSocket";
import type { Socket } from "socket.io-client";
import {
  telehealthJoinMessage,
} from "@/features/appointment/utils/appointmentDisplay";
import { useTelehealthJoin } from "@/features/appointment/hooks/useTelehealthJoin";

interface AppointmentDetails {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  doctorName: string;
  doctorId: string;
  mode: string;
  status: string;
  meetingUrl?: string | null;
}

export default function WaitingRoomPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"waiting" | "admitted" | "error" | "too_early">("waiting");
  const [socket, setSocket] = useState<Socket | null>(null);

  const joinState = useTelehealthJoin(
    appointment
      ? {
          mode: appointment.mode,
          date: appointment.date,
          startTime: appointment.startTime,
          status: appointment.status,
        }
      : null,
  );

  useEffect(() => {
    if (!appointmentId) return;

    const fetchAppointment = async () => {
      try {
        const response = await api.get(`/appointments/${appointmentId}`);
        setAppointment(response.data);
      } catch (error) {
        console.error("Failed to fetch appointment:", error);
        toast.error("Could not load appointment details");
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    void fetchAppointment();
  }, [appointmentId]);

  useEffect(() => {
    if (!appointmentId || !appointment || !user) return;

    if (appointment.mode !== "online") {
      setStatus("error");
      toast.error("This appointment is not a telehealth session");
      return;
    }

    if (!joinState.canJoin) {
      setStatus("too_early");
      return;
    }

    const socketInstance = createWaitingSocket();

    socketInstance.on("connect", () => {
      socketInstance.emit("join-waiting-room", {
        appointmentId,
        userId: user.id,
        role: user.role,
      });
    });

    socketInstance.on("join-denied", (data: { message?: string }) => {
      toast.error(data?.message ?? "You cannot join this session yet");
      setStatus("too_early");
    });

    socketInstance.on("patient-admitted", () => {
      setStatus("admitted");
      toast.success("Doctor has admitted you. Joining session...");

      setTimeout(() => {
        navigate(`/session/${appointmentId}`, {
          state: { meetingUrl: appointment.meetingUrl },
        });
      }, 1500);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      toast.error("Connection to waiting room failed");
    });

    setSocket(socketInstance);
    setStatus("waiting");

    return () => {
      socketInstance.emit("leave-waiting-room", { appointmentId });
      socketInstance.disconnect();
    };
  }, [appointmentId, appointment, user, navigate, joinState.canJoin]);

  const handleLeave = () => {
    if (socket) {
      socket.emit("leave-waiting-room", { appointmentId });
    }
    navigate("/patient/dashboard/appointments");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading waiting room...</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive mb-4">Could not load waiting room</p>
            <Button onClick={() => navigate("/patient/dashboard/appointments")}>
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "too_early" || !joinState.canJoin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-xl">Telehealth not open yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {joinState.message
                ?? telehealthJoinMessage({
                  mode: appointment.mode,
                  date: appointment.date,
                  startTime: appointment.startTime,
                  status: appointment.status,
                })}
            </p>
            <p className="text-xs text-muted-foreground">
              You can join from 5 minutes before your scheduled time with {appointment.doctorName}.
            </p>
            <Button className="w-full" onClick={() => navigate("/patient/dashboard/appointments")}>
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleLeave}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xl">Virtual Waiting Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Badge
              variant={status === "admitted" ? "default" : "secondary"}
              className="text-sm px-4 py-2"
            >
              {status === "admitted" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Admitted - Joining Session
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Waiting for Doctor
                </span>
              )}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{appointment.doctorName}</p>
                <p className="text-xs text-muted-foreground">Doctor</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(`${appointment.date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="text-sm font-medium text-foreground">
                  {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Session Type</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Video className="h-4 w-4" />
                Telehealth
              </p>
            </div>
          </div>

          <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-lg">
            {status === "waiting" ? (
              <p className="text-sm text-primary">
                Please wait while your doctor prepares for your session. You will be automatically admitted when ready.
              </p>
            ) : (
              <p className="text-sm text-primary">
                Your doctor has admitted you. Redirecting to the session...
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleLeave}
            disabled={status === "admitted"}
          >
            Leave Waiting Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
