import { cn } from "@/lib/utils";

type Props = {
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export default function AnswerOption({ label, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm transition",
        selected
          ? "border-primary bg-primary/20 text-white"
          : "border-slate-700 text-slate-300 hover:border-slate-500"
      )}
    >
      {label}
    </button>
  );
}
