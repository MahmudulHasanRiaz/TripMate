"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MediaPickerField from "@/components/admin/MediaPickerField";

export type AccreditationRow = {
  imageUrl: string;
  label: string;
  sublabel: string;
  linkUrl: string;
  credentialText: string;
  credentialImageUrl: string;
};

interface AccreditationsEditorProps {
  rows: AccreditationRow[];
  onChange: (rows: AccreditationRow[]) => void;
  /** Credentials-section heading/description (Follow-up 17). */
  heading: string;
  description: string;
  onHeadingChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

/**
 * Accreditation badge rows (Follow-up 09 §5) — the footer's "Licensed &
 * Accredited" strip. Each row is one organization's REAL logo (media
 * picker) + its credential label. Leaving the image empty renders a
 * designed credential tile instead — for credentials that have no logo,
 * like a Hajj license number. Rows render in order on the public footer.
 */
export default function AccreditationsEditor({
  rows,
  onChange,
  heading,
  description,
  onHeadingChange,
  onDescriptionChange,
}: AccreditationsEditorProps) {
  const handleAdd = () => {
    onChange([
      ...rows,
      { imageUrl: "", label: "", sublabel: "", linkUrl: "", credentialText: "", credentialImageUrl: "" },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof AccreditationRow, val: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === rows.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...rows];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accreditations &amp; Licenses
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Shown as real logos in the footer&apos;s “Licensed &amp; Accredited” strip. Add only
            credentials your agency actually holds. Leave the image empty for a credential with
            no logo (e.g. a Hajj license number) — it renders as a text tile.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={rows.length >= 8}
          className="h-9 text-xs font-semibold shrink-0"
        >
          <Plus className="size-3.5 mr-1" /> Add badge
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Section heading (optional)</Label>
          <Input
            value={heading}
            onChange={(e) => onHeadingChange(e.target.value)}
            placeholder="Trusted & Accredited"
            className="h-10 text-xs"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Section description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Recognized by leading aviation and travel industry organizations."
            className="h-10 text-xs"
            maxLength={240}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
          No accreditation badges — the footer strip stays hidden.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">
                  BADGE {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleMove(i, "up")}
                    disabled={i === 0}
                    aria-label={`Move badge ${i + 1} up`}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleMove(i, "down")}
                    disabled={i === rows.length - 1}
                    aria-label={`Move badge ${i + 1} down`}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(i)}
                    aria-label={`Remove badge ${i + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Logo image</Label>
                <MediaPickerField
                  value={row.imageUrl}
                  onChange={(v) => handleUpdate(i, "imageUrl", v)}
                  accept="image"
                  placeholder="/badges/iata.svg or pick from media library"
                  className="h-10 text-xs font-mono"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Label</Label>
                  <Input
                    value={row.label}
                    onChange={(e) => handleUpdate(i, "label", e.target.value)}
                    placeholder="IATA Authorised Agent"
                    className="h-10 text-xs"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Sub-label (optional)</Label>
                  <Input
                    value={row.sublabel}
                    onChange={(e) => handleUpdate(i, "sublabel", e.target.value)}
                    placeholder="Din Air International"
                    className="h-10 text-xs"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Details / verification link (optional)
                </Label>
                <Input
                  value={row.linkUrl}
                  onChange={(e) => handleUpdate(i, "linkUrl", e.target.value)}
                  placeholder="https://authority.example/verify/… — shown as a “View details” link"
                  className="h-10 text-xs"
                  maxLength={2048}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Credential text (optional)
                  </Label>
                  <Input
                    value={row.credentialText}
                    onChange={(e) => handleUpdate(i, "credentialText", e.target.value)}
                    placeholder="Licence No. 741"
                    className="h-10 text-xs"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Credential image (optional)
                  </Label>
                  <MediaPickerField
                    value={row.credentialImageUrl}
                    onChange={(v) => handleUpdate(i, "credentialImageUrl", v)}
                    accept="image"
                    placeholder="Certificate photo — visitors open it from the card"
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
