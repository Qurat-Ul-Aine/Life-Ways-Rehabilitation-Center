type ProgressRingProps = {
  pct: number;
  color: string;
  size?: number;
  label?: string;
};

const ProgressRing = ({ pct, color, size = 84, label }: ProgressRingProps) => {
  const r = (size - 14) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const hasValue = clamped > 0;
  const displayPct = hasValue ? `${clamped}%` : "—";

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 px-2 py-3"
      role="img"
      aria-label={label ? `${label}: ${hasValue ? `${clamped}%` : "not recorded"}` : displayPct}
    >
      {label ? (
        <p className="text-xs font-medium text-foreground text-center leading-snug">{label}</p>
      ) : null}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={7} />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={hasValue ? color : "hsl(var(--muted-foreground) / 0.25)"}
            strokeWidth={7}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (clamped / 100) * circumference}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold text-foreground ${
            hasValue ? "text-sm" : "text-xs text-muted-foreground"
          }`}
        >
          {displayPct}
        </span>
      </div>
    </div>
  );
};

export default ProgressRing;
