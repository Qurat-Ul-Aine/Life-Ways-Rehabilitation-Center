import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "compact";
};

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size={variant === "compact" ? "sm" : "icon"}
        className={cn("shrink-0", className)}
        aria-label="Theme"
        disabled
      >
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const active = theme ?? "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={variant === "compact" ? "sm" : "icon"}
          className={cn(
            "shrink-0 border-border bg-card/80 text-foreground hover:bg-muted",
            variant === "compact" && "h-9 gap-2 px-3",
            className,
          )}
          aria-label={`Theme: ${active}. Click to change.`}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
          {variant === "compact" ? (
            <span className="text-xs font-medium capitalize">{active}</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("light")}
        >
          <Sun className="h-4 w-4" />
          <span className="flex-1">Light</span>
          {active === "light" ? <Check className="h-4 w-4 text-primary" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4" />
          <span className="flex-1">Dark</span>
          {active === "dark" ? <Check className="h-4 w-4 text-primary" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onClick={() => setTheme("system")}
        >
          <Laptop className="h-4 w-4" />
          <span className="flex-1">System</span>
          {active === "system" ? <Check className="h-4 w-4 text-primary" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
