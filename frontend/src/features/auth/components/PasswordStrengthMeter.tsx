import { cn } from "@/lib/utils";
import {
  getPasswordStrength,
  STRENGTH_COLOR,
  STRENGTH_LABEL,
  STRENGTH_SEGMENTS,
} from "../utils/passwordStrength";

type Props = {
  password: string;
  className?: string;
};

export default function PasswordStrengthMeter({ password, className }: Props) {
  const strength = getPasswordStrength(password);
  const segments = STRENGTH_SEGMENTS[strength];

  if (!password) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index < segments ? STRENGTH_COLOR[strength] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{STRENGTH_LABEL[strength]}</span>
      </p>
    </div>
  );
}
