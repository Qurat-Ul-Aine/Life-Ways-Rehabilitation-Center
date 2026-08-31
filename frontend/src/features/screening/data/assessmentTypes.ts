import type { AssessmentType } from "@/features/screening/types/screening.types";

export const ASSESSMENT_TYPE_OPTIONS: {
  value: AssessmentType;
  label: string;
  description: string;
}[] = [
  {
    value: "self",
    label: "For Myself",
    description: "I am completing this screening based on my own experiences and symptoms.",
  },
  {
    value: "other",
    label: "For Someone Else",
    description:
      "I am completing this screening on behalf of another person I am concerned about.",
  },
];

export function getAssessmentTypeGuidance(type: AssessmentType | ""): {
  summary: string;
  instructions: string[];
  questionnairePreamble: string;
} {
  if (type === "other") {
    return {
      summary:
        "Answer each question based on the experiences of the person you are concerned about, not your own.",
      instructions: [
        "Use observations and information the person has shared with you.",
        "If unsure, choose the option that best reflects their recent behavior.",
        "Results will help guide whether they should seek professional support.",
        "You may encourage them to complete a follow-up assessment with a clinician.",
      ],
      questionnairePreamble:
        "Please answer based on the person you are concerned about. Select the option that best describes their recent experiences.",
    };
  }

  return {
    summary:
      "Answer each question honestly based on your own experiences over the past several months.",
    instructions: [
      "There are no right or wrong answers — choose what best reflects your situation.",
      "Take your time and complete all required questions before submitting.",
      "Your responses are confidential and used only to generate a risk summary.",
      "This tool does not replace a clinical diagnosis or professional evaluation.",
    ],
    questionnairePreamble:
      "Please answer honestly based on your own experiences. Select the option that best describes your recent situation.",
  };
}
