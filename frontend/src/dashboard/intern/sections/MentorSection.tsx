import { useEffect } from "react";
import { Building2, Calendar, Mail, Stethoscope, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { useInternDashboardContext } from "../hooks/InternDashboardContext";
import { DashboardState } from "./DashboardState";

export default function MentorSection() {
  const { refetch } = useInternDashboardContext();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <DashboardState>
      {(data) => {
        const { intern, mentorAssignedAt } = data;
        const mentor = intern.mentor;

        return (
          <div className="space-y-6">
            <PageHeader
              title="My Mentor"
              subtitle="View your assigned clinical mentor details."
            />

            {!mentor ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">No mentor assigned yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    An administrator will assign a mentor to guide your internship.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mentor Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <UserCheck className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Mentor Name</p>
                      <p className="text-sm font-medium">{mentor.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Stethoscope className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Specialization</p>
                      <p className="text-sm font-medium">{mentor.specialization || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{intern.department || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Mail className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact Email</p>
                      <p className="text-sm font-medium">{mentor.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assignment Date</p>
                      <p className="text-sm font-medium">{mentorAssignedAt ?? "—"}</p>
                      {mentorAssignedAt ? (
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          Assigned
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      }}
    </DashboardState>
  );
}
