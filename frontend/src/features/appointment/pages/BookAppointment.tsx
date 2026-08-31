import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import AppointmentForm from "../components/AppointmentForm";
import { appointmentService } from "../services/appointmentService";

export default function BookAppointment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "patient";
  const basePath = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  return (
    <>
      <PageHeader
        title="Book appointment"
        subtitle="Online or in-person, slot-based scheduling."
        action={
          <Button variant="outline" onClick={() => navigate(`${basePath}/appointments`)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />
      <Card>
        <CardHeader><CardTitle className="text-lg">New appointment</CardTitle></CardHeader>
        <CardContent>
          <AppointmentForm
            submitLabel="Book appointment"
            onSubmit={async (values) => {
              try {
                await appointmentService.create(values);
                toast.success("Appointment booked. Confirmation sent.");
                navigate(`${basePath}/appointments`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to book.");
              }
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}