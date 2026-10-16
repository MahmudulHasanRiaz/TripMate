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
          ? await addTravelerAction({ orderId, ...toPayload(d) })
          : await updateTravelerAction({ orderId, travelerId: editingId as string, ...toPayload(d) });
      if (!res.ok) {
        setError(res.error || "Could not save traveler.");
        return;
      }
      setDraft(EMPTY);
      setAdding(false);
      setEditingId(null);
      router.refresh();
    });
  };

  const remove = (travelerId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeTravelerAction({ orderId, travelerId });
      if (!res.ok) {
        setError(res.error || "Could not remove traveler.");
        return;
      }
      router.refresh();
    });
  };

  const set = (which: "draft" | "edit", key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    (which === "draft" ? setDraft : setEditDraft)((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            Travelers Manifest ({initial.length})
          </span>
          {canEdit && !adding ? (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setAdding(true)}>
              <Plus className="size-3.5" aria-hidden="true" /> Add traveler
            </Button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={initial.length > 0 || adding ? "p-0" : "pt-0"}>
        {initial.length === 0 && !adding ? (
          <p className="px-4 pb-4 text-xs text-muted-foreground">No travelers recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">#</TableHead>
                <TableHead className="text-xs font-semibold">Traveler Name</TableHead>
                <TableHead className="text-xs font-semibold">Passport No.</TableHead>
                <TableHead className="text-xs font-semibold">Date of Birth</TableHead>
                <TableHead className="text-xs font-semibold">Relation</TableHead>
                {canEdit ? <TableHead className="text-xs font-semibold text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.map((t, idx) => (
                <TableRow key={t.id || idx} className="text-xs">
                  <TableCell className="text-muted-foreground font-mono">{idx + 1}</TableCell>
                  {editingId === t.id ? (
                    <>
                      <TableCell><Input value={editDraft.name} onChange={set("edit", "name")} className="h-8 text-xs" /></TableCell>
                      <TableCell><Input value={editDraft.passportNo} onChange={set("edit", "passportNo")} className="h-8 text-xs font-mono" /></TableCell>
                      <TableCell><Input value={editDraft.dob} onChange={set("edit", "dob")} placeholder="YYYY-MM-DD" className="h-8 text-xs font-mono" /></TableCell>
                      <TableCell><Input value={editDraft.relation} onChange={set("edit", "relation")} className="h-8 text-xs" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => save("edit")}>
                            {busy && <Loader2 className="size-3 animate-spin" aria-hidden="true" />} Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-semibold text-foreground">{t.name}</TableCell>
                      <TableCell className="font-mono">{t.passportNo || "—"}</TableCell>
                      <TableCell className="font-mono">{t.dob || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.relation || "—"}</TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="size-7"
                              aria-label={`Edit ${t.name}`}
                              onClick={() => {
                                setEditingId(t.id);
                                setEditDraft({ name: t.name, passportNo: t.passportNo ?? "", dob: t.dob ?? "", relation: t.relation ?? "" });
                              }}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="size-7 text-destructive"
                              aria-label={`Remove ${t.name}`} disabled={busy}
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
          <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input value={draft.name} onChange={set("draft", "name")} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Passport No.</Label>
              <Input value={draft.passportNo} onChange={set("draft", "passportNo")} className="h-9 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of Birth</Label>
              <Input value={draft.dob} onChange={set("draft", "dob")} placeholder="YYYY-MM-DD" className="h-9 text-xs font-mono" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Relation</Label>
              <Input value={draft.relation} onChange={set("draft", "relation")} className="h-9 text-xs" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button size="sm" className="h-9 text-xs" disabled={busy} onClick={() => save("add")}>
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />} Save traveler
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setAdding(false); setDraft(EMPTY); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="px-4 pb-3 text-xs text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
