import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  className?: string;
};

const StatCard = ({ label, value, sub, icon, iconBg, className }: StatCardProps) => (
  <Card className={cn("rounded-2xl border-border bg-card h-full", className)}>
    <CardContent className="p-3">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", iconBg)} aria-hidden>
        {icon}
      </div>
      <p className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{sub}</p>
    </CardContent>
  </Card>
);

export default StatCard;
