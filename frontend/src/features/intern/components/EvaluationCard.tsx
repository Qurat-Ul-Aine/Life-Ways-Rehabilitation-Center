import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InternEvaluation } from "../intern.types";

type EvaluationCardProps = {
  evaluation: InternEvaluation;
};

export default function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const date = evaluation.evaluatedAt
    ? new Date(evaluation.evaluatedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span>Mentor Evaluation</span>
          <span className="flex items-center gap-1 text-primary">
            <Star className="h-4 w-4 fill-current" />
            {evaluation.rating ?? "—"}/5
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{date}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {evaluation.comments?.trim() || "No comments provided."}
        </p>
        {evaluation.mentorName ? (
          <p className="mt-2 text-xs text-muted-foreground">By {evaluation.mentorName}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
