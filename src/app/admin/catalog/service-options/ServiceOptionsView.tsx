"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { ServiceOptionWithRef } from "@/modules/catalog/visa-service";
import type { CategoryRow } from "@/app/admin/catalog/categories/types";
import ServiceOptionFormDialog from "./ServiceOptionFormDialog";
import ServiceOptionRowActions from "./ServiceOptionRowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ServiceOptionsView({
  options,
  categories,
}: {
  options: ServiceOptionWithRef[];
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ServiceOptionWithRef | null>(null);

  const filtered = useMemo(() => {
    return options.filter((o) => {
      if (selectedCat && o.categoryId !== selectedCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = o.title.toLowerCase().includes(q);
        const matchCat = o.category.name.toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [options, selectedCat, search]);

  const handleOpenAdd = () => {
    setEditingOption(null);
    setDialogOpen(true);
  };

  const handleEdit = (opt: ServiceOptionWithRef) => {
    setEditingOption(opt);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingOption(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Service Options & Tiers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage granular service tiers, passport turnaround packages, and commercial profit margins.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="h-10 gap-2 shrink-0 rounded-lg text-sm font-semibold">
          <Plus className="size-4" />
          Add Service Option
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search service options..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 text-sm rounded-lg border-border"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          aria-label="Filter by category"
          className="flex h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-56"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Plus className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No service options found</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {search || selectedCat ? "No options match your filter criteria. Try resetting your search." : "No service options or tiers configured yet."}
            </p>
            {search || selectedCat ? (
              <Button
                variant="outline"
                onClick={() => { setSearch(""); setSelectedCat(""); }}
                className="mt-5 h-9 rounded-lg text-sm font-semibold"
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                onClick={handleOpenAdd}
                className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold"
              >
                <Plus className="size-4" /> Add Service Option
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Option / Service</th>
                  <th className="px-4 py-3.5">Duration / Pages</th>
                  <th className="px-4 py-3.5">Delivery Time</th>
                  <th className="px-4 py-3.5 text-right">Selling Price</th>
                  <th className="px-4 py-3.5 text-right">Direct Cost</th>
                  <th className="px-4 py-3.5 text-right">Gross Margin</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => (
                  <tr key={item.id} className="min-h-[52px] transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-primary">{item.category.name}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{item.slug}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {item.duration || "Standard"}
                    </td>

                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {item.deliveryTime || "Standard turnaround"}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold font-mono tabular-nums text-foreground">
                      ৳{item.price.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right text-sm font-mono tabular-nums text-muted-foreground">
                      {item.costPrice ? `৳${item.costPrice.toLocaleString()}` : "—"}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {item.grossProfit !== null ? (
                        <div>
                          <span className="font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                            ৳{item.grossProfit.toLocaleString()}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-muted-foreground ml-1.5">
                            ({item.marginPercent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={item.isActive
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                          : "border-muted-foreground/30 text-muted-foreground font-medium"}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <ServiceOptionRowActions option={item} onEdit={() => handleEdit(item)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen && (
        <ServiceOptionFormDialog
          option={editingOption}
          categories={categories}
          open={dialogOpen}
          onCancel={() => {
            setDialogOpen(false);
            setEditingOption(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
