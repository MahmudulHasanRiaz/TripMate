"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { submitMyTravelerAction } from "@/modules/bookings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Portal traveler submission (§2.7): customers add travelers at any stage. */
export default function PortalTravelerForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [dob, setDob] = useState("");
  const [relation, setRelation] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await submitMyTravelerAction({
        orderId,
        name,
        ...(passportNo.trim() ? { passportNo: passportNo.trim() } : {}),
        ...(dob.trim() ? { dob: dob.trim() } : {}),
        ...(relation.trim() ? { relation: relation.trim() } : {}),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: res.error || "Could not add traveler." });
        return;
      }
      setMessage({ ok: true, text: "Traveler added." });
      setName("");
      setPassportNo("");
      setDob("");
      setRelation("");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Add a traveler</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setOpen((v) => !v)}>
            <Plus className="size-3.5" aria-hidden="true" />
            {open ? "Close" : "Add traveler"}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pt-name" className="text-xs font-medium">Full name *</Label>
              <Input id="pt-name" value={name} onChange={(e) => setName(e.target.value)} required className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-passport" className="text-xs font-medium">Passport No.</Label>
              <Input id="pt-passport" value={passportNo} onChange={(e) => setPassportNo(e.target.value)} className="h-10 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-dob" className="text-xs font-medium">Date of birth</Label>
              <Input id="pt-dob" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="YYYY-MM-DD" className="h-10 text-sm font-mono" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pt-relation" className="text-xs font-medium">Relation</Label>
              <Input id="pt-relation" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Self / Spouse / Child" className="h-10 text-sm" />
            </div>
            {message ? (
              <p role={message.ok ? "status" : "alert"} className={`text-xs sm:col-span-2 ${message.ok ? "text-success" : "text-destructive"}`}>
                {message.text}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || !name.trim()} className="min-h-10 w-full sm:w-auto">
                {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                Add traveler
              </Button>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
