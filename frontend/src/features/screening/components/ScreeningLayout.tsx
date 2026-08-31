import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  step: number;
  totalSteps: number;
  title?: string;
};

export default function ScreeningLayout({ children, step, totalSteps, title }: Props) {
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-slate-400 hover:text-white">
            ← Life Ways Rehab
          </Link>
          <span className="text-xs text-slate-500">
            Step {step} of {totalSteps}
          </span>
        </div>

        <div className="space-y-2">
          {title ? <h1 className="font-heading text-2xl font-bold text-white">{title}</h1> : null}
          <Progress value={progress} className="h-2 bg-slate-800" />
        </div>

        {children}
      </div>
    </div>
  );
}

export function ScreeningNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  loading,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-4">
      {onBack ? (
        <Button type="button" variant="outline" className="flex-1 border-slate-700" onClick={onBack}>
          Back
        </Button>
      ) : null}
      {onNext ? (
        <Button
          type="button"
          className="flex-1"
          onClick={onNext}
          disabled={nextDisabled || loading}
        >
          {loading ? "Please wait..." : nextLabel}
        </Button>
      ) : null}
    </div>
  );
}
