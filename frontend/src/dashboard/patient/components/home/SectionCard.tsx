import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const SectionCard = ({ title, action, children, className }: SectionCardProps) => (
  <Card className={cn("rounded-2xl border-border bg-card h-full flex flex-col", className)}>
    <CardHeader className="px-4 pt-4 pb-0 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-[13px] font-semibold text-foreground">{title}</CardTitle>
        {action}
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4 pt-3 flex-1">{children}</CardContent>
  </Card>
);

export default SectionCard;
