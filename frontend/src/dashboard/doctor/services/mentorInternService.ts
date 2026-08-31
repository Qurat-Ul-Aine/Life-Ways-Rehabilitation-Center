import { internService } from "@/features/intern/services/internService";
import type { MentorInternsResult } from "./mentorInternService.types";

/** Doctor mentor API — delegates to shared internService. */
export const mentorInternService = {
  listMyMentees(): Promise<MentorInternsResult> {
    return internService.listMyMentees() as Promise<MentorInternsResult>;
  },

  getMentee(id: string) {
    return internService.getById(id);
  },

  getMenteeLogs(internId: string, params?: { fromDate?: string; toDate?: string }) {
    return internService.getLogs(internId, params);
  },
};

export type { MenteeIntern, MentorInternsResult } from "./mentorInternService.types";
