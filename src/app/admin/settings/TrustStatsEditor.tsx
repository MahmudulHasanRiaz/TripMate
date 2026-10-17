"use client";

import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StatRow = {
  value: string;
  label: string;
};

interface TrustStatsEditorProps {
  stats: StatRow[];
  onChange: (stats: StatRow[]) => void;
}

export default function TrustStatsEditor({ stats, onChange }: TrustStatsEditorProps) {
  const handleAdd = () => {
    onChange([...stats, { value: "", label: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(stats.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: "value" | "label", val: string) => {
    const updated = [...stats];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stats.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...stats];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" /> Trust Stats Band
          </h3>
          <p className="text-xs text-muted-foreground">
            Highlight key numbers and milestones on your homepage. Leave empty to use live database stats.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-9 gap-1.5 text-xs rounded-lg self-start sm:self-auto"
        >
          <Plus className="size-3.5" /> Add Stat Item
        </Button>
      </div>

      {stats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
          <p className="text-xs text-muted-foreground">
            No custom trust stats defined. Homepage will fall back to live aggregates (e.g. destinations & bookings count).
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="mt-2 text-xs font-medium text-primary hover:text-primary"
          >
            + Add a custom milestone (e.g. &ldquo;12+ Years of service&rdquo;)
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border border-border bg-card shadow-xs transition-colors hover:border-border/80"
            >
              {/* Reorder buttons */}
              <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-0.5 text-muted-foreground">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, "up")}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:pointer-events-none text-muted-foreground"
                  title="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === stats.length - 1}
                  onClick={() => handleMove(idx, "down")}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:pointer-events-none text-muted-foreground"
                  title="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              {/* Value input */}
              <div className="w-full sm:w-1/3 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Figure / Value
                </Label>
                <Input
                  value={stat.value}
                  onChange={(e) => handleUpdate(idx, "value", e.target.value)}
                  placeholder="e.g. 15+, 99.8%, 10K+"
                  className="h-10 text-sm font-semibold rounded-lg tabular-nums"
                />
              </div>

              {/* Label input */}
              <div className="w-full sm:flex-1 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Description Label
                </Label>
                <Input
                  value={stat.label}
                  onChange={(e) => handleUpdate(idx, "label", e.target.value)}
                  placeholder="e.g. Years of excellence, Satisfied travelers"
                  className="h-10 text-sm rounded-lg"
                />
              </div>

              {/* Remove button */}
              <div className="flex sm:items-end sm:pb-0.5 pt-1 sm:pt-0 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(idx)}
                  className="size-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove stat"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Preview Strip */}
      {stats.some((s) => s.value.trim() && s.label.trim()) && (
        <div className="rounded-lg border border-border/80 bg-muted/40 p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview on Homepage
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
            {stats
              .filter((s) => s.value.trim() && s.label.trim())
              .map((s, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-primary tabular-nums">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
