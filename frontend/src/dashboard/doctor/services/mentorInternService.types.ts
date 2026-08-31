import type { Intern } from "@/features/intern/intern.types";

export type MenteeIntern = Intern & {
  totalHours: number;
  logCount: number;
  attendancePercentage: number;
  progress: number;
  internshipStatus: string;
};

export type MentorInternsResult = {
  items: MenteeIntern[];
  total: number;
  stats: {
    assigned: number;
    activeAssigned: number;
    totalSupervisedHours: number;
  };
};
