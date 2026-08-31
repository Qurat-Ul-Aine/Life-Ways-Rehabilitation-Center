import { Progress } from "@/components/ui/progress";

type Props = {
  answered: number;
  total: number;
  percent: number;
};

export default function ProgressBar({ answered, total, percent }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {answered} of {total} required questions answered
        </span>
        <span>{percent}%</span>
      </div>
      <Progress value={percent} className="h-2 bg-slate-800" />
    </div>
  );
}
