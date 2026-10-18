"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { VisaServiceWithRefs, VisaType } from "@/modules/catalog/visa-service";
import type { Destination } from "@/modules/catalog/service";
import VisaServiceFormDialog from "./VisaServiceFormDialog";
import VisaServiceRowActions from "./VisaServiceRowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function VisaServicesView({
  services,
  destinations,
  visaTypes,
}: {
  services: VisaServiceWithRefs[];
  destinations: Destination[];
  visaTypes: VisaType[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedDest, setSelectedDest] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<VisaServiceWithRefs | null>(null);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (selectedDest && s.destinationId !== selectedDest) return false;
      if (selectedType && s.visaTypeId !== selectedType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchDest = s.destination.name.toLowerCase().includes(q);
        const matchType = s.visaType.name.toLowerCase().includes(q);
        if (!matchTitle && !matchDest && !matchType) return false;
      }
      return true;
    });
  }, [services, selectedDest, selectedType, search]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  const handleEdit = (s: VisaServiceWithRefs) => {
    setEditingService(s);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingService(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Visa Services &amp; Offerings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage destination-specific visa packages, embassy checklists, and commercial margins.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="h-10 px-4 rounded-lg text-sm font-semibold gap-2 shadow-xs">
          <Plus className="size-4" />
          Add Visa Offering
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search visa offerings, countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm rounded-lg border-border"
          />
        </div>

        <select
          value={selectedDest}
          onChange={(e) => setSelectedDest(e.target.value)}
          className="flex h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Destinations</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Visa Types</option>
          {visaTypes.map((vt) => (
            <option key={vt.id} value={vt.id}>
              {vt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Offerings Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="h-11 px-4 py-3">Offering / Destination</th>
                <th className="h-11 px-4 py-3">Visa Type</th>
                <th className="h-11 px-4 py-3">Processing</th>
                <th className="h-11 px-4 py-3 text-right">Selling Price</th>
                <th className="h-11 px-4 py-3 text-right">Cost (COGS)</th>
                <th className="h-11 px-4 py-3 text-right">Gross Margin</th>
                <th className="h-11 px-4 py-3 text-center">Status</th>
                <th className="h-11 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Plus className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground">No visa offerings found</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {search || selectedDest || selectedType
                            ? "Try adjusting your search criteria or destination filter."
                            : "Create your first visa offering to publish visa services to travelers."}
                        </p>
                      </div>
                      <Button onClick={handleOpenAdd} size="sm" className="mt-2 h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
                        <Plus className="size-4" aria-hidden="true" />
                        Add Visa Offering
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="min-h-[52px] border-b border-border transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-primary">{item.destination.name}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{item.slug}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs font-normal">
                        {item.visaType.name}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      <div>{item.processingTime || "Standard"}</div>
                      {item.validity && <div className="text-xs opacity-80">Val: {item.validity}</div>}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-foreground tabular-nums">
                      ৳{item.price.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {item.costPrice ? `৳${item.costPrice.toLocaleString()}` : "—"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {item.grossProfit !== null ? (
                        <div>
                          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ৳{item.grossProfit.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1 tabular-nums">
                            ({item.marginPercent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant={item.isActive ? "default" : "secondary"}
                        className="text-xs font-medium px-2 py-0.5"
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <VisaServiceRowActions service={item} onEdit={() => handleEdit(item)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && (
        <VisaServiceFormDialog
          service={editingService}
          destinations={destinations}
          visaTypes={visaTypes}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingService(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
