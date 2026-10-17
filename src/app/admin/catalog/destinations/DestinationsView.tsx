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
import type { DestinationRow } from "./types";
import DestinationRowActions from "./DestinationRowActions";
import DestinationFormDialog from "./DestinationFormDialog";

/**
 * Destination admin: header + table + shared create/edit dialog. The server
 * page fetches `listDestinations(false)` (inactive included) and hands the
 * plain rows here; every mutation calls its server action then
 * router.refresh() so the server page re-fetches fresh props.
 */
export default function DestinationsView({ rows }: { rows: DestinationRow[] }) {
  const router = useRouter();
  // Dialog is rendered conditionally below, so opening it (un)mounts the form
  // dialog fresh each time — no nonce needed to reset its state between opens.
  const [dialog, setDialog] = useState<{ row: DestinationRow | null } | null>(null);

  const activeCount = rows.filter((r) => r.isActive).length;
  const openCreate = () => setDialog({ row: null });
  const openEdit = (row: DestinationRow) => setDialog({ row });
  const close = () => setDialog(null);
  const saved = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Destinations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="tabular-nums font-medium text-foreground">{rows.length}</span> {rows.length === 1 ? "destination" : "destinations"} · <span className="tabular-nums font-medium text-foreground">{activeCount}</span> active
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 px-4 rounded-lg text-sm font-semibold gap-2 shadow-xs">
          <Plus className="size-4" aria-hidden="true" />
          New destination
        </Button>
      </div>

      <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured</TableHead>
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
                          <h4 className="text-base font-semibold text-foreground">No destinations yet</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Create travel destinations to link your packages, hotels, and flight itineraries.
                          </p>
                        </div>
                        <Button onClick={openCreate} size="sm" className="mt-2 h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
                          <Plus className="size-4" aria-hidden="true" />
                          Create your first destination
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="min-h-[52px] border-b border-border transition-colors hover:bg-muted/30">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail may be any configured host
                            <img
                              src={row.image}
                              alt={row.name}
                              className="size-10 rounded-lg object-cover border border-border shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="size-10 rounded-lg bg-muted border border-border flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                              No img
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-semibold text-foreground">{row.name}</span>
                            <p className="text-xs text-muted-foreground font-mono">{row.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-sm tabular-nums text-foreground">
                        #{row.sortOrder ?? 0}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {row.isFeatured ? (
                          <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary">
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant={row.isActive ? "success" : "outline"} className="text-xs font-medium px-2 py-0.5">
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <DestinationRowActions row={row} onEdit={() => openEdit(row)} />
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
        <DestinationFormDialog
          row={dialog.row}
          open
          onCancel={close}
          onSaved={saved}
        />
      ) : null}
    </div>
  );
}
