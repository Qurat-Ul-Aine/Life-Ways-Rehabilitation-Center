import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export default function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="report-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="report-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="report-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="report-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
    </div>
  );
}
