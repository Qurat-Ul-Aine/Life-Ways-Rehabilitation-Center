import { cn } from "@/lib/utils";

type EmptyStateProps = {
  message: string;
  className?: string;
};

const EmptyState = ({ message, className = "py-6" }: EmptyStateProps) => (
  <p className={cn("text-center text-[11px] text-muted-foreground", className)} role="status">
    {message}
  </p>
);

export default EmptyState;
