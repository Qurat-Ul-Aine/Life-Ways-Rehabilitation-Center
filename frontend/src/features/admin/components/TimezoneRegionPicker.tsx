import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  TIMEZONE_REGIONS,
  formatTimezoneDisplay,
  findRegionForTimezone,
} from "@/features/admin/data/timezoneRegions";

type Props = {
  value: string;
  onChange: (timezone: string) => void;
  label?: string;
  id?: string;
};

export default function TimezoneRegionPicker({ value, onChange, label = "Time zone", id }: Props) {
  const [open, setOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string>(
    () => findRegionForTimezone(value)?.country ?? TIMEZONE_REGIONS[0].country,
  );

  useEffect(() => {
    const region = findRegionForTimezone(value);
    if (region) setActiveCountry(region.country);
  }, [value]);

  const activeRegion = useMemo(
    () => TIMEZONE_REGIONS.find((r) => r.country === activeCountry) ?? TIMEZONE_REGIONS[0],
    [activeCountry],
  );

  const displayLabel = formatTimezoneDisplay(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="h-10 w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{displayLabel}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(100vw-2rem,22rem)] p-0">
          <div className="border-b border-border p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Country / Region
            </p>
            <div className="flex flex-wrap gap-1.5 p-1">
              {TIMEZONE_REGIONS.map((region) => (
                <button
                  key={region.country}
                  type="button"
                  onClick={() => setActiveCountry(region.country)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    activeCountry === region.country
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {region.country}
                </button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cities in {activeRegion.country}
            </p>
            <div className="max-h-52 space-y-0.5 overflow-y-auto p-1">
              {activeRegion.cities.map((city) => {
                const selected = value === city.value;
                const cityKey = `${activeRegion.country}-${city.label}-${city.value}`;
                return (
                  <button
                    key={cityKey}
                    type="button"
                    onClick={() => {
                      onChange(city.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span>
                      <span className="font-medium">{city.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatTimezoneDisplay(city.value)}
                      </span>
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
