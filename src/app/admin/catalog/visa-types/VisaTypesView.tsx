"use client";

import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import type { VisaType } from "@/modules/catalog/visa-service";
import VisaTypeFormDialog from "./VisaTypeFormDialog";
import VisaTypeRowActions from "./VisaTypeRowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function VisaTypesView({ types }: { types: VisaType[] }) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = types.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Visa Types
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Country-agnostic categories (e.g. Tourist, Business, Student, Transit) used to group and filter visa offerings.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          New Visa Type
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visa types..."
            className="pl-8 text-xs h-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "type" : "types"} configured
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="mx-auto size-12 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No visa types found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "No matches for your search term." : "Create your first visa type."}
            </p>
            {!search && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-2"
              >
                <Plus className="size-4" /> Add Visa Type
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Name</th>
                  <th className="px-3 py-3.5">Slug</th>
                  <th className="px-3 py-3.5">Icon</th>
                  <th className="px-3 py-3.5">Sort Order</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Description</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 pl-6 pr-3 font-semibold text-foreground">
                      {t.name}
                    </td>
                    <td className="px-3 py-4 font-mono text-xs text-muted-foreground">
                      {t.slug}
                    </td>
                    <td className="px-3 py-4 text-xs font-mono text-muted-foreground">
                      {t.icon || "—"}
                    </td>
                    <td className="px-3 py-4 text-xs font-mono">{t.sortOrder}</td>
                    <td className="px-3 py-4">
                      {t.isActive ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-4 text-xs text-muted-foreground max-w-xs truncate">
                      {t.description || "—"}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right">
                      <VisaTypeRowActions type={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VisaTypeFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
