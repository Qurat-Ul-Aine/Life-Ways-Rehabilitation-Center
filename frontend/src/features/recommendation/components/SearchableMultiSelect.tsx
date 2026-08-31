import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type SearchableMultiSelectProps = {
  id?: string;
  label: string;
  options: AssessmentOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  otherValue?: string;
  onOtherValueChange?: (value: string) => void;
  placeholder?: string;
  otherPlaceholder?: string;
  required?: boolean;
};

export default function SearchableMultiSelect({
  id,
  label,
  options,
  values,
  onValuesChange,
  otherValue = "",
  onOtherValueChange,
  placeholder = "Search and select…",
  otherPlaceholder = "Please specify…",
  required = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onValuesChange(values.filter((v) => v !== optionValue));
      return;
    }
    onValuesChange([...values, optionValue]);
  };

  const removeValue = (optionValue: string) => {
    onValuesChange(values.filter((v) => v !== optionValue));
  };

  const chipLabel = (optionValue: string) => {
    if (optionValue === OTHER_OPTION && otherValue.trim()) {
      return `Other: ${otherValue.trim()}`;
    }
    return getOptionLabel(options, optionValue);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((optionValue) => (
            <Badge
              key={optionValue}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="max-w-[220px] truncate">{chipLabel(optionValue)}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => removeValue(optionValue)}
                aria-label={`Remove ${chipLabel(optionValue)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-auto min-h-10 w-full justify-between py-2 font-normal",
              values.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate text-left">
              {values.length > 0 ? `${values.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = values.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => toggleValue(option.value)}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.includes(OTHER_OPTION) && onOtherValueChange && (
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
