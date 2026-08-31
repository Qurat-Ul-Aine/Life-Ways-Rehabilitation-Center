import type { RecoveryPoint } from "../patient.types";

export default function RecoverySparkline({ data, height = 80 }: { data: RecoveryPoint[]; height?: number }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No recovery data yet.</p>;
  const w = 320;
  const h = height;
  const pad = 8;
  const xs = data.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1));
  const ys = data.map((d) => h - pad - (d.score / 100) * (h - pad * 2));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${path} L${xs[xs.length - 1].toFixed(1)},${(h - pad).toFixed(1)} L${xs[0].toFixed(1)},${(h - pad).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md">
      <path d={area} fill="hsl(var(--primary) / 0.15)" />
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={2.5} fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}
