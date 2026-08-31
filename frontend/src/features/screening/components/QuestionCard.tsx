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
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-white">
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
