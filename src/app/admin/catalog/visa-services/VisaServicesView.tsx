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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Visa Services & Offerings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage destination-specific visa packages, embassy checklists, and commercial margins.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Add Visa Offering
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search visa offerings, countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={selectedDest}
          onChange={(e) => setSelectedDest(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Offering / Destination</th>
                <th className="px-4 py-3">Visa Type</th>
                <th className="px-4 py-3">Processing</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Cost (COGS)</th>
                <th className="px-4 py-3 text-right">Gross Margin</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No visa offerings found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">{item.title}</div>
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

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>{item.processingTime || "Standard"}</div>
                      {item.validity && <div className="text-[11px] opacity-80">Val: {item.validity}</div>}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium">
                      ৳{item.price.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                      {item.costPrice ? `৳${item.costPrice.toLocaleString()}` : "—"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {item.grossProfit !== null ? (
                        <div>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            ৳{item.grossProfit.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-1">
                            ({item.marginPercent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant={item.isActive ? "default" : "secondary"}
                        className="text-xs"
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
