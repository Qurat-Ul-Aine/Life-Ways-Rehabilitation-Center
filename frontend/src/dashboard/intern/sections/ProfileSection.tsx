import { Mail, Phone, GraduationCap, Building2, User, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { DashboardState } from "./DashboardState";

export default function ProfileSection() {
  return (
    <DashboardState>
      {(data) => {
        const { intern } = data;
        const isActive = intern.isActive && intern.is_active;

        return (
          <div className="space-y-6">
            <PageHeader
              title="My Profile"
              subtitle="Your personal internship profile information (read-only)."
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <User className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{intern.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Mail className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{intern.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{intern.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <GraduationCap className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Education</p>
                    <p className="text-sm font-medium">{intern.education || "—"}</p>
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
                  <UserCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Mentor</p>
                    <p className="text-sm font-medium">{intern.mentor?.name ?? "Unassigned"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-4 sm:col-span-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={isActive ? "secondary" : "outline"} className="mt-1">
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }}
    </DashboardState>
  );
}
