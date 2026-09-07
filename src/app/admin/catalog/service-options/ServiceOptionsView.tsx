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
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Service Options & Tiers
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage granular service tiers, passport turnaround packages, and commercial profit margins.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
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
            className="pl-9"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Option / Service</th>
                <th className="px-4 py-3">Duration / Pages</th>
                <th className="px-4 py-3">Delivery Time</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Direct Cost</th>
                <th className="px-4 py-3 text-right">Gross Margin</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No service options found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-primary">{item.category.name}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{item.slug}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {item.duration || "Standard"}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {item.deliveryTime || "Standard turnaround"}
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
                      <ServiceOptionRowActions option={item} onEdit={() => handleEdit(item)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
