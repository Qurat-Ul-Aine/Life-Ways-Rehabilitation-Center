import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminInternshipPage from "@/features/admin/pages/AdminInternshipPage";

/**
 * Admin dashboard internship panel — full system overview + link to CRUD management.
 * Admin-only: total interns, roster, add/edit/delete via /admin/interns/*.
 */
export default function InternshipPanel() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link to="/admin/interns">
            <Plus className="mr-1 h-4 w-4" /> Add / Manage Interns
          </Link>
        </Button>
      </div>
      <AdminInternshipPage />
    </div>
  );
}
