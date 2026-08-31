import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { internService } from "../services/internService";
import type { Intern } from "../intern.types";

export default function InternMyProfile() {
  const [intern, setIntern] = useState<Intern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    internService
      .getMe()
      .then(setIntern)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-muted-foreground">Loading profile...</p>
      </DashboardLayout>
    );
  }

  if (!intern) {
    return (
      <DashboardLayout>
        <p className="p-6 text-sm text-destructive">Profile not found.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="My Profile"
        subtitle="Your internship profile at Life Ways Rehabilitation Centre."
        action={
          <Button variant="outline" asChild>
            <Link to="/intern/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name: </span>
              {intern.name}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {intern.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {intern.phone || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Education: </span>
              {intern.education}
            </p>
            <p>
              <span className="text-muted-foreground">Department: </span>
              {intern.department}
            </p>
            <Badge variant={intern.isActive ? "default" : "outline"}>
              {intern.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internship Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Start Date: </span>
              {intern.internshipStart ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">End Date: </span>
              {intern.internshipEnd ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Mentor: </span>
              {intern.mentor?.name ?? "Not assigned"}
            </p>
            {intern.mentor?.specialization && (
              <p>
                <span className="text-muted-foreground">Specialization: </span>
                {intern.mentor.specialization}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
