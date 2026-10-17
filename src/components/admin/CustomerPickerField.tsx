"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, User, UserPlus } from "lucide-react";
import { searchUsersAction } from "@/modules/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CustomerPickerItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
};

type CustomerPickerFieldProps = {
  value: string;
  onChange: (name: string) => void;
  onSelectCustomer?: (customer: CustomerPickerItem) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
};

export default function CustomerPickerField({
  value,
  onChange,
  onSelectCustomer,
  placeholder = "Search existing customer or type name...",
  className,
  id,
  required,
}: CustomerPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CustomerPickerItem[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchUsersAction(query);
      if (active) {
        if (res.ok) {
          setItems(res.items);
        }
        setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, open]);

  const handleSelectCustomer = (item: CustomerPickerItem) => {
    onChange(item.name);
    if (onSelectCustomer) {
      onSelectCustomer(item);
    }
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id={id}
            value={value}
            required={required}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 text-xs pr-8"
          />
          {value ? (
            <span
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground pointer-events-none"
              title="You can type freely for walk-in customers or pick an existing customer"
            >
              Manual/Picker
            </span>
          ) : null}
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-2.5 text-xs shrink-0 gap-1.5"
              title="Search Users & Customers directory"
              aria-expanded={open}
            >
              <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:inline">Directory</span>
              <ChevronsUpDown className="size-3 opacity-50" aria-hidden="true" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 sm:w-96 p-0 shadow-lg" align="end">
            <div className="p-2 border-b border-border/60">
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, or email..."
                  className="h-8 pl-8 text-xs bg-muted/40"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1 text-xs">
              {loading ? (
                <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Searching directory...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  <p>No customers found matching &ldquo;{query}&rdquo;.</p>
                  {value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(false)}
                      className="mt-2 text-xs h-7 text-primary gap-1"
                    >
                      <UserPlus className="size-3" aria-hidden="true" />
                      Keep &ldquo;{value}&rdquo; as walk-in entry
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Directory matches ({items.length})
                  </div>
                  {items.map((item) => {
                    const isSelected = value.trim().toLowerCase() === item.name.trim().toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectCustomer(item)}
                        className={cn(
                          "w-full text-left p-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-accent/80",
                          isSelected ? "bg-accent/50 font-medium" : "",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">{item.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize font-mono">
                              {item.role}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            {item.phone ? (
                              <span className="font-mono text-foreground/80">{item.phone}</span>
                            ) : null}
                            <span className="truncate">{item.email}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {query ? (
              <div className="p-2 border-t border-border/60 bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange(query);
                    setOpen(false);
                  }}
                  className="w-full justify-start text-xs h-7 text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <UserPlus className="size-3" aria-hidden="true" />
                  <span>Use &ldquo;{query}&rdquo; as custom manual name</span>
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
