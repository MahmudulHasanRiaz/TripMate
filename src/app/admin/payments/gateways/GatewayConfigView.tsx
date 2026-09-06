"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  CreditCard,
  Building,
  Smartphone,
  Info,
} from "lucide-react";
import type { GatewayView } from "@/modules/payments/service";
import type { GatewayKind } from "@/modules/payments/validation";
import {
  reorderGatewaysAction,
  setGatewayActiveAction,
  upsertGatewayAction,
} from "@/modules/payments/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GatewayConfigViewProps = {
  gateways: GatewayView[];
};

type ConfigPair = { key: string; value: string };

const GATEWAY_KINDS: { kind: GatewayKind; label: string; desc: string }[] = [
  { kind: "manual", label: "Manual / Bank Transfer", desc: "Customer transfers to bank and submits slip" },
  { kind: "bkash", label: "bKash (Manual)", desc: "Customer sends money to bKash and submits TrxID" },
  { kind: "nagad", label: "Nagad (Manual)", desc: "Customer sends money to Nagad and submits TrxID" },
  { kind: "paylater", label: "Pay Later", desc: "Customer requests later offline payment (no TrxID)" },
  { kind: "sslcommerz", label: "SSLCommerz (Automated)", desc: "Hosted checkout (disabled / not implemented in v1)" },
];

export default function GatewayConfigView({ gateways: initialGateways }: GatewayConfigViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [gateways, setGateways] = useState<GatewayView[]>(
    [...initialGateways].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  // Edit / Add modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GatewayKind>("manual");
  const [instructions, setInstructions] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [configPairs, setConfigPairs] = useState<ConfigPair[]>([]);

  // Notices
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const openAddDialog = () => {
    setEditingId(null);
    setName("");
    setKind("manual");
    setInstructions("");
    setLogoUrl("");
    setSortOrder(gateways.length);
    setIsActive(true);
    setConfigPairs([{ key: "accountNumber", value: "" }]);
    setDialogOpen(true);
  };

  const openEditDialog = (gw: GatewayView) => {
    setEditingId(gw.id);
    setName(gw.name);
    setKind(gw.kind);
    setInstructions(gw.instructions || "");
    setLogoUrl(gw.logoUrl || "");
    setSortOrder(gw.sortOrder);
    setIsActive(gw.isActive);

    const pairs = Object.entries(gw.config || {}).map(([key, value]) => ({ key, value }));
    setConfigPairs(pairs.length > 0 ? pairs : [{ key: "accountNumber", value: "" }]);
    setDialogOpen(true);
  };

  // Toggle active state
  const handleToggleActive = (id: string, active: boolean) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    setGateways((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isActive: active } : g)),
    );

    startTransition(async () => {
      try {
        const res = await setGatewayActiveAction({ id, isActive: active });
        if (res.ok) {
          setSuccessNotice(`Gateway ${active ? "activated" : "deactivated"}.`);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to update gateway status.");
          router.refresh();
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
        router.refresh();
      }
    });
  };

  // Reorder up / down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gateways.length) return;

    const reordered = [...gateways];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Re-assign sort orders 0..n
    const updated = reordered.map((item, idx) => ({ ...item, sortOrder: idx }));
    setGateways(updated);

    startTransition(async () => {
      try {
        const res = await reorderGatewaysAction({
          items: updated.map((g) => ({ id: g.id, sortOrder: g.sortOrder })),
        });
        if (res.ok) {
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to reorder gateways.");
          router.refresh();
        }
      } catch {
        setErrorMessage("An unexpected error occurred while reordering.");
        router.refresh();
      }
    });
  };

  // Save Gateway dialog form
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Gateway name is required.");
      return;
    }

    // Convert config pairs to record
    const configRecord: Record<string, string> = {};
    for (const pair of configPairs) {
      const k = pair.key.trim();
      if (k) {
        configRecord[k] = pair.value.trim();
      }
    }

    startTransition(async () => {
      try {
        const payload = {
          id: editingId || undefined,
          name: name.trim(),
          kind,
          instructions: instructions.trim() || undefined,
          config: configRecord,
          logoUrl: logoUrl.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        };

        const res = await upsertGatewayAction(payload);
        if (res.ok) {
          setDialogOpen(false);
          setSuccessNotice(`Gateway "${name}" saved successfully.`);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to save gateway.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving gateway.");
      }
    });
  };

  const getKindIcon = (k: GatewayKind) => {
    switch (k) {
      case "bkash":
      case "nagad":
        return <Smartphone className="size-4 text-primary" aria-hidden="true" />;
      case "manual":
        return <Building className="size-4 text-primary" aria-hidden="true" />;
      case "paylater":
        return <CreditCard className="size-4 text-primary" aria-hidden="true" />;
      default:
        return <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Configured Payment Methods</h2>
          <p className="text-xs text-muted-foreground">
            Gateways visible to customers at checkout and in the customer portal. Display data only.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground">
          <Plus className="size-3.5" aria-hidden="true" />
          Add Gateway
        </Button>
      </div>

      {/* Global Notices */}
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Gateway Cards List */}
      <div className="space-y-3">
        {gateways.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
            No gateways configured yet. Click &quot;Add Gateway&quot; to configure payment channels.
          </div>
        ) : (
          gateways.map((gw, idx) => (
            <Card key={gw.id} className="shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/30">
                    {getKindIcon(gw.kind)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{gw.name}</h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {gw.kind}
                      </Badge>
                      {gw.kind === "sslcommerz" ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Not Implemented
                        </Badge>
                      ) : null}
                    </div>
                    {gw.instructions ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1 max-w-xl">
                        {gw.instructions}
                      </p>
                    ) : null}

                    {/* Display Config Badges */}
                    {Object.keys(gw.config || {}).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono">
                        {Object.entries(gw.config).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 rounded bg-secondary/50 px-2 py-0.5 border border-border/50 text-foreground"
                          >
                            <span className="text-muted-foreground">{k}:</span>
                            <span className="font-semibold">{v}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-border/50 sm:border-0">
                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0 || isPending}
                      onClick={() => handleMove(idx, "up")}
                      aria-label="Move up"
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={idx === gateways.length - 1 || isPending}
                      onClick={() => handleMove(idx, "down")}
                      aria-label="Move down"
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`gw-active-${gw.id}`}
                      checked={gw.isActive}
                      onCheckedChange={(checked) => handleToggleActive(gw.id, checked)}
                      disabled={isPending}
                    />
                    <Label htmlFor={`gw-active-${gw.id}`} className="text-xs font-medium cursor-pointer">
                      {gw.isActive ? "Active" : "Inactive"}
                    </Label>
                  </div>

                  {/* Edit Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(gw)}
                    className="h-8 text-xs gap-1"
                  >
                    <Edit2 className="size-3" aria-hidden="true" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Gateway Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingId ? "Edit Payment Gateway" : "Add Payment Gateway"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure payment instructions and public display data. Never enter secret API credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGateway} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Gateway Name *</Label>
                <Input
                  placeholder="e.g. bKash Personal or City Bank Gulshan Branch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gateway Kind *</Label>
                <Select value={kind} onValueChange={(val) => setKind(val as GatewayKind)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {GATEWAY_KINDS.map((k) => (
                      <SelectItem key={k.kind} value={k.kind} className="text-xs">
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sort Order</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Logo URL (optional)</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Customer Instructions</Label>
                <Textarea
                  placeholder="Step-by-step transfer instructions shown to the customer at checkout..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Display Config Key-Value Editor */}
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    Display Configuration Data
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Public attributes displayed to the customer (account numbers, account type, bank branch).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfigPairs((prev) => [...prev, { key: "", value: "" }])}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-2">
                {configPairs.map((pair, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key (e.g. accountNumber)"
                      value={pair.key}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfigPairs((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, key: val } : p)),
                        );
                      }}
                      className="h-8 text-xs font-mono w-1/3"
                    />
                    <Input
                      placeholder="Value (e.g. +880 1700-000000)"
                      value={pair.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfigPairs((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, value: val } : p)),
                        );
                      }}
                      className="h-8 text-xs font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfigPairs((prev) => prev.filter((_, i) => i !== index))}
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove configuration field"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="dialog-gw-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="dialog-gw-active" className="text-xs font-medium cursor-pointer">
                  Active (available for customer payments)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    "Save Gateway"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
