"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_KIND_META } from "./kind-labels";
import type { CategoryRow } from "./types";
import CategoryRowActions from "./CategoryRowActions";
import CategoryFormDialog from "./CategoryFormDialog";

/**
 * Category admin: header + table + the shared create/edit dialog. The server
 * page fetches `listCategories(false)` (inactive included) and hands the plain
 * rows here; every mutation calls its server action then router.refresh() so
 * the server page re-fetches and this view re-renders with fresh props.
 */
export default function CategoriesView({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  // Dialog is rendered conditionally below, so opening it (un)mounts the form
  // dialog fresh each time — no nonce needed to reset its state between opens.
  const [dialog, setDialog] = useState<{ row: CategoryRow | null } | null>(null);

  const activeCount = rows.filter((r) => r.isActive).length;
  const openCreate = () => setDialog({ row: null });
  const openEdit = (row: CategoryRow) => setDialog({ row });
  const close = () => setDialog(null);
  const saved = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="tabular-nums font-medium text-foreground">{rows.length}</span> {rows.length === 1 ? "category" : "categories"} · <span className="tabular-nums font-medium text-foreground">{activeCount}</span> active
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 px-4 rounded-lg text-sm font-semibold gap-2 shadow-xs">
          <Plus className="size-4" aria-hidden="true" />
          New category
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kind</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Plus className="size-6" aria-hidden="true" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-foreground">No categories yet</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Create categories to organize your tour packages and travel services.
                          </p>
                        </div>
                        <Button onClick={openCreate} size="sm" className="mt-2 h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
                          <Plus className="size-4" aria-hidden="true" />
                          Create your first category
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="min-h-[52px] border-b border-border transition-colors hover:bg-muted/30">
                      <TableCell className="py-3.5">
                        <span className="text-sm font-semibold text-foreground">{row.name}</span>
                        <p className="text-xs text-muted-foreground font-mono">{row.slug}</p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">{CATEGORY_KIND_META[row.kind].label}</Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-mono text-sm tabular-nums text-foreground">{row.sortOrder}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant={row.isActive ? "success" : "outline"} className="text-xs font-medium px-2 py-0.5">
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <CategoryRowActions row={row} onEdit={() => openEdit(row)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {dialog ? (
        <CategoryFormDialog
          row={dialog.row}
          open
          onCancel={close}
          onSaved={saved}
        />
      ) : null}
    </div>
  );
}
