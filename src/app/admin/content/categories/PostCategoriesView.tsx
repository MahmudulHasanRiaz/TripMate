"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import type { PostCategoryRow } from "./types";
import PostCategoryRowActions from "./PostCategoryRowActions";
import PostCategoryFormDialog from "./PostCategoryFormDialog";

/**
 * Post-category admin: header + table + the shared create/edit dialog. The
 * server page fetches every category and hands the plain rows here; every
 * mutation calls its server action then router.refresh() so the server page
 * re-fetches and this view re-renders with fresh props.
 */
export default function PostCategoriesView({ rows }: { rows: PostCategoryRow[] }) {
  const router = useRouter();
  // Dialog is rendered conditionally below, so opening it (un)mounts the form
  // dialog fresh each time — no nonce needed to reset its state between opens.
  const [dialog, setDialog] = useState<{ row: PostCategoryRow | null } | null>(null);

  const openCreate = () => setDialog({ row: null });
  const openEdit = (row: PostCategoryRow) => setDialog({ row });
  const close = () => setDialog(null);
  const saved = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Post Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "category" : "categories"} configured for blog and article grouping
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground">
          <Plus className="size-4" aria-hidden="true" />
          New Category
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="size-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No categories yet</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Create categories to organize and filter blog posts and travel guides.
                </p>
                <Button onClick={openCreate} className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold">
                  <Plus className="size-4" /> Create Category
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-b border-border/80">
                    <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Category</TableHead>
                    <TableHead className="w-[120px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {rows.map((row) => (
                    <TableRow key={row.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3.5 pl-6">
                        <span className="font-semibold text-foreground">{row.name}</span>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{row.slug}</p>
                      </TableCell>
                      <TableCell className="py-3.5 pr-6 text-right">
                        <PostCategoryRowActions row={row} onEdit={() => openEdit(row)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {dialog ? (
        <PostCategoryFormDialog
          row={dialog.row}
          open
          onCancel={close}
          onSaved={saved}
        />
      ) : null}
    </div>
  );
}
