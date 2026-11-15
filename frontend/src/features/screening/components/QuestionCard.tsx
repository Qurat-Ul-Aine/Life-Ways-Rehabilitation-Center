import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScreeningQuestion } from "@/features/screening/types/screening.types";
import AnswerOption from "@/features/screening/components/AnswerOption";

type Props = {
  question: ScreeningQuestion;
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export default function QuestionCard({ question, selectedValue, onSelect }: Props) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-foreground">
          {question.text}
          {question.isRequired ? <span className="text-destructive"> *</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {question.options.map((opt) => (
          <AnswerOption
            key={opt.label}
            label={opt.label}
            selected={selectedValue === opt.label}
            onSelect={() => onSelect(opt.label)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
