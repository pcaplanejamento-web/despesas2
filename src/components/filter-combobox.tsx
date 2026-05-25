import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface FilterComboboxProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  /** Placeholder mostrado quando value está vazio. Default "Todos". */
  placeholder?: string;
  icon: LucideIcon;
  disabled?: boolean;
  /** Texto exibido para a opção "limpar" no topo. Default "Todos". */
  allLabel?: string;
}

/**
 * Combobox de filtro — Popover + Command (cmdk) com busca filtrável.
 * - Item "Todos" sempre no topo (value=""), italic + border-bottom.
 * - Click no item já selecionado limpa para "".
 * - Width 100% no container; popover content acompanha width do trigger.
 */
export function FilterCombobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Todos",
  icon: Icon,
  disabled,
  allLabel = "Todos",
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (next: string): void => {
    // Clicar no item já selecionado limpa.
    onChange(next === value ? "" : next);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:border-foreground/20",
            )}
          >
            <span
              className={cn(
                "truncate text-left",
                !value && "text-muted-foreground",
              )}
            >
              {value || placeholder}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandInput placeholder={`Buscar ${label.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>Nada encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect("")}
                  className="italic border-b mb-1 rounded-none"
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === "" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {allLabel}
                </CommandItem>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => handleSelect(opt)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === opt ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
