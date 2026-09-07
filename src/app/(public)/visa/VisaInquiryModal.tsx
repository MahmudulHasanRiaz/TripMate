"use client";

import { useState, useId, useTransition } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { submitVisaInquiryAction } from "@/modules/catalog/visa-actions";
import type { VisaServiceWithRefs } from "@/modules/catalog/visa-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VisaInquiryModal({
  visa,
  open,
  onClose,
}: {
  visa: VisaServiceWithRefs | null;
  open: boolean;
  onClose: () => void;
}) {
  const formId = useId();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [travelersCount, setTravelersCount] = useState(1);
  const [passportNo, setPassportNo] = useState("");
  const [targetTravelDate, setTargetTravelDate] = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  if (!visa) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errors: Record<string, string> = {};

    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!phone.trim()) errors.phone = "Phone number is required";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitVisaInquiryAction({
          visaServiceId: visa.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          travelersCount,
          passportNo: passportNo.trim(),
          targetTravelDate: targetTravelDate.trim(),
          message: message.trim(),
        });

        if (!res.ok) {
          setGeneralError(res.error || "Unable to submit inquiry.");
          return;
        }

        setSuccessRef(res.data?.referenceNo || "SUBMITTED");
      } catch {
        setGeneralError("Network connection error. Please try again or call us.");
      }
    });
  };

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setTravelersCount(1);
    setPassportNo("");
    setTargetTravelDate("");
    setMessage("");
    setFieldErrors({});
    setGeneralError(null);
    setSuccessRef(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetForm()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {successRef ? (
          <div className="py-6 text-center space-y-4" role="status">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Application Inquiry Received!
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                Our senior visa consultant will contact you via WhatsApp & phone within 2 business hours.
              </DialogDescription>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 text-left">
              <div className="text-xs text-muted-foreground">Reference Tracking Code</div>
              <div className="font-mono text-lg font-bold text-foreground mt-0.5">
                {successRef}
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <div>• Destination: <strong className="text-foreground">{visa.destination.name}</strong></div>
                <div>• Visa Offering: <strong className="text-foreground">{visa.title}</strong></div>
                <div>• Travelers: <strong className="text-foreground">{travelersCount} Person(s)</strong></div>
              </div>
            </div>

            <Button onClick={resetForm} className="w-full">
              Done & Return to Explorer
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ShieldCheck className="size-4" />
                <span>TripMate Official Visa Assistance</span>
              </div>
              <DialogTitle className="text-xl font-bold">{visa.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Official processing time: {visa.processingTime || "Standard"} • ৳{visa.price.toLocaleString()} / person
              </DialogDescription>
            </DialogHeader>

            <form id={formId} onSubmit={handleSubmit} className="space-y-4 py-2">
              {generalError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  {generalError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name (as per Passport) *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mohammad Rahim"
                  disabled={isPending}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">WhatsApp / Mobile *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1700-000000"
                    disabled={isPending}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={isPending}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="travelersCount">Travelers</Label>
                  <Input
                    id="travelersCount"
                    type="number"
                    min={1}
                    max={50}
                    value={travelersCount}
                    onChange={(e) => setTravelersCount(Number(e.target.value) || 1)}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="targetTravelDate">Planned Departure</Label>
                  <Input
                    id="targetTravelDate"
                    type="date"
                    value={targetTravelDate}
                    onChange={(e) => setTargetTravelDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passportNo">Passport Number (Optional)</Label>
                <Input
                  id="passportNo"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="e.g. A01234567"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Questions or Special Requests (Optional)</Label>
                <Textarea
                  id="message"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any prior rejections, travel urgency, or specific questions..."
                  disabled={isPending}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>Total Estimated Cost ({travelersCount} pax):</span>
                <span className="font-bold text-foreground text-sm">
                  ৳{(visa.price * travelersCount).toLocaleString()} BDT
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1 gap-2">
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit Application
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
