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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Post categories</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New category
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center">
                      <p className="font-medium text-muted-foreground">
                        No categories yet.
                      </p>
                      <Button variant="link" className="mt-1" onClick={openCreate}>
                        Create your first category
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium">{row.name}</span>
                        <p className="text-xs text-muted-foreground">{row.slug}</p>
                      </TableCell>
                      <TableCell>
                        <PostCategoryRowActions row={row} onEdit={() => openEdit(row)} />
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
