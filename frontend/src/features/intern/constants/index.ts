export {
  INTERN_DEPARTMENTS,
  type ApplicationStatus,
  type InternDepartment,
} from "../intern.types";

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "weekly"] as const;

export const ATTENDANCE_PERIOD_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly Summary" },
] as const;

export const TRAINING_LOG_TYPES = [
  { value: "daily", label: "Daily Log" },
  { value: "weekly", label: "Weekly Log" },
] as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};
