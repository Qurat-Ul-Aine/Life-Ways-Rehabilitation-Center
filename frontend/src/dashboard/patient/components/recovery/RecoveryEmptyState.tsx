import { cn } from "@/lib/utils";

type Props = {
  message: string;
  className?: string;
  align?: "center" | "left";
};

export default function RecoveryEmptyState({
  message,
  className,
  align = "center",
}: Props) {
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
      role="status"
    >
      {message}
    </p>
  );
}
