import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export default function RecoveryPanelCard({ title, description, className, children }: Props) {
  return (
    <Card className={cn("rounded-2xl border-border bg-card shadow-sm", className)}>
      {title && (
        <CardHeader className="px-5 pt-5 pb-0">
          <CardTitle className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(title ? "px-5 pb-5 pt-4" : "p-5")}>{children}</CardContent>
    </Card>
  );
}
