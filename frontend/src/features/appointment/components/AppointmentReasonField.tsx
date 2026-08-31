import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_REASON_OPTIONS,
  type AppointmentReasonOption,
} from "../utils/appointmentReason";

type AppointmentReasonFieldProps = {
  value: AppointmentReasonOption | "";
  otherValue?: string;
  onValueChange: (value: AppointmentReasonOption) => void;
  onOtherValueChange?: (value: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
};

export default function AppointmentReasonField({
  value,
  otherValue = "",
  onValueChange,
  onOtherValueChange,
  id = "appointment-reason",
  required = true,
  className,
}: AppointmentReasonFieldProps) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-base font-semibold text-foreground">
        Reason for visit
        {required ? <span className="text-destructive"> *</span> : null}
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {APPOINTMENT_REASON_OPTIONS.map((option) => {
          const inputId = `${id}-${option.value}`;
          const checked = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                checked
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background hover:border-primary/40",
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={id}
                value={option.value}
                checked={checked}
                onChange={() => onValueChange(option.value)}
                className="h-4 w-4 accent-primary"
              />
              <span className="font-medium">{option.label}</span>
            </label>
          );
        })}
      </div>

      {value === "other" && onOtherValueChange && (
        <div className="space-y-1.5 rounded-lg border border-dashed border-primary/25 bg-muted/30 p-3">
          <Label htmlFor={`${id}-other`} className="text-xs text-muted-foreground">
            Please specify
          </Label>
          <Input
            id={`${id}-other`}
            value={otherValue}
            onChange={(e) => onOtherValueChange(e.target.value)}
            placeholder="Describe your reason for this visit"
            aria-label="Reason for visit — other"
          />
        </div>
      )}
    </fieldset>
  );
}
