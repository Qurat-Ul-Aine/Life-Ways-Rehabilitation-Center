import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  OTHER_OPTION,
  type AssessmentOption,
  getOptionLabel,
} from "../data/assessmentOptions";

type SearchableComboboxProps = {
  id?: string;
  label: string;
  options: AssessmentOption[];
  value: string;
  onValueChange: (value: string) => void;
  otherValue?: string;
  onOtherValueChange?: (value: string) => void;
  placeholder?: string;
  otherPlaceholder?: string;
  required?: boolean;
};

export default function SearchableCombobox({
  id,
  label,
  options,
  value,
  onValueChange,
  otherValue = "",
  onOtherValueChange,
  placeholder = "Search and select…",
  otherPlaceholder = "Please specify…",
  required = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);

  const displayLabel = value
    ? getOptionLabel(options, value)
    : placeholder;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full justify-between font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value === OTHER_OPTION && onOtherValueChange && (
        <div className="space-y-1.5 rounded-lg border border-dashed border-primary/25 bg-muted/30 p-3">
          <Label htmlFor={id ? `${id}-other` : undefined} className="text-xs text-muted-foreground">
            Please specify
          </Label>
          <Input
            id={id ? `${id}-other` : undefined}
            value={otherValue}
            onChange={(e) => onOtherValueChange(e.target.value)}
            placeholder={otherPlaceholder}
            aria-label={`${label} — other`}
          />
        </div>
      )}
    </div>
  );
}
