import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SecurityQuestionAnswer, SecurityQuestionOption } from "../securityQuestions.types";

const REQUIRED_COUNT = 2;

type Props = {
  catalog: SecurityQuestionOption[];
  value: SecurityQuestionAnswer[];
  onChange: (value: SecurityQuestionAnswer[]) => void;
  answerPlaceholder?: string;
  readOnly?: boolean;
};

export function createEmptySecurityAnswers(): SecurityQuestionAnswer[] {
  return Array.from({ length: REQUIRED_COUNT }, () => ({ questionKey: "", answer: "" }));
}

export default function SecurityQuestionsFields({
  catalog,
  value,
  onChange,
  answerPlaceholder = "Your answer",
  readOnly = false,
}: Props) {
  const slots = useMemo(() => {
    const base = value.length >= REQUIRED_COUNT ? value : createEmptySecurityAnswers();
    return base.slice(0, REQUIRED_COUNT);
  }, [value]);

  const usedKeys = new Set(slots.map((s) => s.questionKey).filter(Boolean));

  const updateSlot = (index: number, patch: Partial<SecurityQuestionAnswer>) => {
    const next = [...slots];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {slots.map((slot, index) => {
        const questionLabel = catalog.find((q) => q.key === slot.questionKey)?.label;
        return (
          <div key={index} className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Security question {index + 1}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor={`sq-${index}`}>Question</Label>
              {readOnly ? (
                <p className="text-sm font-medium text-foreground">{questionLabel || "Unknown question"}</p>
              ) : (
                <Select
                  value={slot.questionKey || undefined}
                  onValueChange={(key) => updateSlot(index, { questionKey: key })}
                >
                  <SelectTrigger id={`sq-${index}`}>
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((q) => (
                      <SelectItem
                        key={q.key}
                        value={q.key}
                        disabled={usedKeys.has(q.key) && slot.questionKey !== q.key}
                      >
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`sq-answer-${index}`}>Answer</Label>
              <Input
                id={`sq-answer-${index}`}
                value={slot.answer}
                onChange={(e) => updateSlot(index, { answer: e.target.value })}
                placeholder={answerPlaceholder}
                autoComplete="off"
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Answers are stored securely and used to verify your identity when resetting your password.
      </p>
    </div>
  );
}

export { REQUIRED_COUNT as SECURITY_QUESTIONS_REQUIRED };
