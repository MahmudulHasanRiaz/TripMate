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
          <h2 className="text-lg font-semibold tracking-tight">Destinations</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "destination" : "destinations"} · {activeCount} active
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New destination
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center">
                      <p className="font-medium text-muted-foreground">No destinations yet.</p>
                      <Button variant="link" className="mt-1" onClick={openCreate}>
                        Create your first destination
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
                        <Badge variant={row.isActive ? "success" : "outline"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
