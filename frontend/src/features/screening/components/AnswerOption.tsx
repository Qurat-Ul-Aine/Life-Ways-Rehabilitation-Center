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
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/50"
      )}
    >
      {label}
    </button>
  );
}
