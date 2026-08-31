import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PortalAccountTypeBadge from "@/components/common/PortalAccountTypeBadge";
import type { LinkedFamilyMember } from "../patient.types";

type LinkedFamilyMembersCardProps = {
  members: LinkedFamilyMember[];
  patientsListPath?: string;
};

export default function LinkedFamilyMembersCard({
  members,
  patientsListPath = "/admin/patients",
}: LinkedFamilyMembersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
          Family portal access
        </CardTitle>
        <CardDescription>
          Family member accounts registered on the public sign-up page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No family member accounts are registered for this patient yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{member.name}</p>
                    <PortalAccountTypeBadge type="family" linked />
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  {member.relationship ? (
                    <p className="text-sm text-muted-foreground">
                      Relationship: <span className="text-foreground">{member.relationship}</span>
                    </p>
                  ) : null}
                </div>
                <Badge variant={member.isActive ? "outline" : "destructive"}>
                  {member.isActive ? "Active" : "Suspended"}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        {patientsListPath.startsWith("/admin") ? (
          <p className="mt-4 text-xs text-muted-foreground">
            To review all family registrations, open{" "}
            <Link to="/admin/patients?family=1" className="text-primary hover:underline">
              Patients → Family portal accounts
            </Link>
            .
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
