import * as React from "react";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Props = {
  options: { value: string; label: string }[];
  selectedValues?: string[];
  defaultSelectedValues?: string[];
  onChange?: (selected: string[]) => void;
};

export function DropdownTurma({
  options,
  selectedValues,
  defaultSelectedValues,
  onChange,
}: Props) {
  const [internalSelected, setInternalSelected] = React.useState<string[]>(
    () => defaultSelectedValues ?? [],
  );
  const isControlled = selectedValues !== undefined;
  const effectiveSelected = isControlled ? selectedValues : internalSelected;

  const selectedLabel = effectiveSelected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((value): value is string => Boolean(value))
    .join(", ");

  const toggleValue = React.useCallback(
    (value: string, next: boolean | "indeterminate") => {
      if (next === "indeterminate") {
        return;
      }

      if (next) {
        const updated = effectiveSelected.includes(value)
          ? effectiveSelected
          : [...effectiveSelected, value];
        if (!isControlled) {
          setInternalSelected(updated);
        }
        onChange?.(updated);
        return;
      }

      const updated = effectiveSelected.filter((item) => item !== value);
      if (!isControlled) {
        setInternalSelected(updated);
      }
      onChange?.(updated);
    },
    [effectiveSelected, isControlled, onChange],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {selectedLabel || "Selecione turmas"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={effectiveSelected.includes(option.value)}
            onCheckedChange={(next) => toggleValue(option.value, next)}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
