"use client";

import { useState } from "react";
import { User, Phone, Mail, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateMyProfileAction } from "@/modules/users/actions";

type ProfileEditDialogProps = {
  initialName: string;
  initialPhone: string | null;
  email: string;
};

export function ProfileEditDialog({
  initialName,
  initialPhone,
  email,
}: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await updateMyProfileAction({
      name,
      phone,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Failed to update profile");
    } else {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Edit3 className="size-3.5" aria-hidden="true" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Profile Information</DialogTitle>
            <DialogDescription>
              Keep your contact details updated so our concierge team can reach you regarding your travel bookings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Profile updated successfully!
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="profile-email"
                  value={email}
                  disabled
                  className="pl-9 bg-muted text-muted-foreground"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email address is your primary account login identifier.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone / WhatsApp Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="profile-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700-000000"
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Used for instant booking confirmation, flight updates, and WhatsApp concierge.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
