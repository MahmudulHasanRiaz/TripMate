"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Package, Search, X } from "lucide-react";
import { searchCatalogListingsAction } from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/components/site/currency";
import { cn } from "@/lib/utils";

export type PackagePickerItem = {
  id: string;
  title: string;
  price: number | null;
  costPrice: number | null;
  currency: string;
  durationDays: number | null;
  status: string;
};

type PackagePickerFieldProps = {
  value: string | null | undefined;
  onChange: (packageId: string | null, packageItem?: PackagePickerItem | null) => void;
  selectedTitle?: string | null;
  placeholder?: string;
  className?: string;
  id?: string;
};

export default function PackagePickerField({
  value,
  onChange,
  selectedTitle,
  placeholder = "Select package or tour...",
  className,
  id,
}: PackagePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PackagePickerItem[]>([]);
  const [activeItem, setActiveItem] = useState<PackagePickerItem | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchCatalogListingsAction(query);
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

  const handleSelect = (item: PackagePickerItem) => {
    setActiveItem(item);
    onChange(item.id, item);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveItem(null);
    onChange(null, null);
  };

  const displayTitle = activeItem?.title || selectedTitle || "";

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 text-xs ring-offset-background transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              !value && "text-muted-foreground",
            )}
          >
            <div className="flex items-center gap-2 truncate text-left">
              <Package className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              {value ? (
                <span className="font-medium text-foreground truncate">
                  {displayTitle || "Package selected"}
                </span>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {value ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClear(e as unknown as React.MouseEvent);
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Clear package selection"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}
              <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-80 sm:w-96 p-0 shadow-lg" align="start">
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search catalog packages & tours..."
                className="h-8 pl-8 text-xs bg-muted/40"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1 text-xs">
            {loading ? (
              <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                <span>Searching packages...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p>No packages found matching &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Packages ({items.length})
                </div>
                {items.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full text-left p-2 rounded-md transition-colors flex items-start justify-between gap-2 hover:bg-accent/80",
                        isSelected ? "bg-accent/50 font-medium" : "",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{item.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {item.price !== null ? (
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {formatMoney(item.price, (item.currency as "BDT" | "USD" | "SAR") || "BDT")}
                            </span>
                          ) : (
                            <span>Custom pricing</span>
                          )}
                          {item.durationDays ? (
                            <span>· {item.durationDays} Days</span>
                          ) : null}
                          <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize font-mono">
                            {item.status}
                          </Badge>
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

          {value ? (
            <div className="p-2 border-t border-border/60 bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveItem(null);
                  onChange(null, null);
                  setOpen(false);
                }}
                className="w-full justify-start text-xs h-7 text-muted-foreground hover:text-destructive gap-1.5"
              >
                <X className="size-3" aria-hidden="true" />
                <span>Remove linked package</span>
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
