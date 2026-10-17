"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { adminSetPasswordAction } from "@/modules/users/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Admin set/reset a user's password (§2.4). Rendered inside the row menu host. */
export default function SetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const res = await adminSetPasswordAction({ userId: user.id, newPassword: password });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Could not set password", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: `New password set for ${user.email}.` });
    setPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" aria-hidden="true" />
            Set password
          </DialogTitle>
          <DialogDescription className="text-xs">
            {user ? `Set a new sign-in password for ${user.name} (${user.email}). Minimum 10 characters.` : ""}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="New password (min 10 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || password.length < 10}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Set password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
