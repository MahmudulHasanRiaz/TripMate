"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changeOwnPasswordAction } from "@/modules/users/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Customer portal: change own password (§2.4). */
export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await changeOwnPasswordAction({ currentPassword, newPassword });
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error || "Could not change password." });
      return;
    }
    setMessage({ ok: true, text: "Password changed successfully." });
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4" aria-hidden="true" />
          Change password
        </CardTitle>
        <CardDescription className="text-xs">Update the password you sign in with.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-sm">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-sm">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="h-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
          </div>
          {message ? (
            <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-success" : "text-destructive"}`}>
              {message.text}
            </p>
          ) : null}
          <Button type="submit" size="sm" className="h-9" disabled={busy || newPassword.length < 10}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
