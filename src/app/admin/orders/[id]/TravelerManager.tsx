"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  addTravelerAction,
  removeTravelerAction,
  updateTravelerAction,
} from "@/modules/bookings/actions";
import type { TravelerView } from "@/modules/bookings/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Draft = { name: string; passportNo: string; dob: string; relation: string };
const EMPTY: Draft = { name: "", passportNo: "", dob: "", relation: "" };

/**
 * Traveler manifest manager (§2.7): add/edit/remove at ANY order stage.
 * No status guard — the order only needs to exist.
 */
export default function TravelerManager({
  orderId,
  initial,
  canEdit,
}: {
  orderId: string;
  initial: TravelerView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);

  const toPayload = (d: Draft) => ({
    name: d.name,
    ...(d.passportNo.trim() ? { passportNo: d.passportNo.trim() } : {}),
    ...(d.dob.trim() ? { dob: d.dob.trim() } : {}),
    ...(d.relation.trim() ? { relation: d.relation.trim() } : {}),
  });

  const save = (kind: "add" | "edit") => {
    setError(null);
    const d = kind === "add" ? draft : editDraft;
    if (!d.name.trim()) {
      setError("Traveler name is required.");
      return;
    }
    startTransition(async () => {
      const res =
        kind === "add"
          ? await addTravelerAction({ orderId, ...toPayload(draft) })
          : editingId
            ? await updateTravelerAction({ travelerId: editingId, ...toPayload(editDraft) })
            : { ok: false, error: "Missing traveler" };

      if (res.ok) {
        if (kind === "add") {
          setAdding(false);
          setDraft(EMPTY);
        } else {
          setEditingId(null);
        }
        router.refresh();
      } else {
        setError(res.error || "Could not save traveler.");
      }
    });
  };

  const remove = (travelerId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeTravelerAction({ travelerId });
      if (res.ok) router.refresh();
      else setError(res.error || "Could not remove traveler.");
    });
  };

  const set = (which: "draft" | "edit", key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    (which === "draft" ? setDraft : setEditDraft)((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Card className="shadow-xs border-border bg-card rounded-xl">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            Travelers Manifest ({initial.length})
          </span>
          {canEdit && !adding ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs rounded-lg gap-1.5"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3.5" aria-hidden="true" /> Add traveler
            </Button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {initial.length === 0 && !adding ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
              <Users className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No travelers registered</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click &quot;Add traveler&quot; to begin building the group manifest for this booking.
            </p>
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding(true)}
                className="mt-3 h-9 text-xs rounded-lg gap-1.5"
              >
                <Plus className="size-3.5" />
                Add First Traveler
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border">
                <TableHead className="w-12 text-xs font-semibold py-3 pl-4">#</TableHead>
                <TableHead className="text-xs font-semibold py-3 px-3">Traveler Name</TableHead>
                <TableHead className="text-xs font-semibold py-3 px-3">Passport No.</TableHead>
                <TableHead className="text-xs font-semibold py-3 px-3">Date of Birth</TableHead>
                <TableHead className="text-xs font-semibold py-3 px-3">Relation</TableHead>
                {canEdit ? <TableHead className="text-xs font-semibold py-3 pr-4 text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {initial.map((t, idx) => (
                <TableRow key={t.id || idx} className="text-sm min-h-[48px] hover:bg-muted/30">
                  <TableCell className="text-muted-foreground font-mono text-xs pl-4 tabular-nums">{idx + 1}</TableCell>
                  {editingId === t.id ? (
                    <>
                      <TableCell className="py-2 px-3">
                        <Input value={editDraft.name} onChange={set("edit", "name")} className="h-9 text-xs rounded-lg" />
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <Input value={editDraft.passportNo} onChange={set("edit", "passportNo")} className="h-9 text-xs font-mono rounded-lg" />
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <Input value={editDraft.dob} onChange={set("edit", "dob")} placeholder="YYYY-MM-DD" className="h-9 text-xs font-mono rounded-lg tabular-nums" />
                      </TableCell>
                      <TableCell className="py-2 px-3">
                        <Input value={editDraft.relation} onChange={set("edit", "relation")} className="h-9 text-xs rounded-lg" />
                      </TableCell>
                      <TableCell className="text-right py-2 pr-4">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" className="h-8 text-xs rounded-lg" disabled={busy} onClick={() => save("edit")}>
                            {busy && <Loader2 className="size-3 animate-spin mr-1" aria-hidden="true" />} Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-semibold text-foreground py-3.5 px-3">{t.name}</TableCell>
                      <TableCell className="font-mono text-xs py-3.5 px-3">{t.passportNo || "—"}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums py-3.5 px-3">{t.dob || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs py-3.5 px-3">{t.relation || "—"}</TableCell>
                      {canEdit ? (
                        <TableCell className="text-right py-3.5 pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                              aria-label={`Edit ${t.name}`}
                              onClick={() => {
                                setEditingId(t.id);
                                setEditDraft({ name: t.name, passportNo: t.passportNo ?? "", dob: t.dob ?? "", relation: t.relation ?? "" });
                              }}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              aria-label={`Remove ${t.name}`}
                              disabled={busy}
                              onClick={() => remove(t.id)}
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {adding ? (
          <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 bg-muted/20">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-medium">Full Name *</Label>
              <Input value={draft.name} onChange={set("draft", "name")} placeholder="As shown on passport" className="h-10 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Passport No.</Label>
              <Input value={draft.passportNo} onChange={set("draft", "passportNo")} placeholder="e.g. A12345678" className="h-10 text-sm font-mono rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Date of Birth</Label>
              <Input value={draft.dob} onChange={set("draft", "dob")} placeholder="YYYY-MM-DD" className="h-10 text-sm font-mono tabular-nums rounded-lg" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-medium">Relation (e.g. Self, Spouse, Child)</Label>
              <Input value={draft.relation} onChange={set("draft", "relation")} placeholder="Relationship to main passenger" className="h-10 text-sm rounded-lg" />
            </div>
            <div className="flex gap-2 sm:col-span-2 pt-1">
              <Button size="sm" className="h-10 px-4 text-xs font-medium rounded-lg" disabled={busy} onClick={() => save("add")}>
                {busy && <Loader2 className="size-3.5 animate-spin mr-1.5" aria-hidden="true" />} Save traveler
              </Button>
              <Button variant="ghost" size="sm" className="h-10 text-xs rounded-lg" onClick={() => { setAdding(false); setDraft(EMPTY); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="px-4 py-3 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
