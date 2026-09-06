"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { createPackageOrderAction, type CreateOrderResult } from "@/modules/bookings/actions";
import type { TravelerInput } from "@/modules/bookings/validation";
import { TRAVELERS_MAX, TRAVELERS_MIN } from "@/modules/bookings/validation";
import { formatMoney } from "@/components/site/currency";
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
  DialogTrigger,
} from "@/components/ui/dialog";

type BookingFormProps = {
  listingId: string;
  listingTitle: string;
  price?: number | null;
  currency?: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

const EMPTY_TRAVELER: TravelerInput = {
  name: "",
  passportNo: "",
  dob: "",
  relation: "",
};

export function BookingForm({
  listingId,
  listingTitle,
  price,
  currency = "BDT",
  triggerClassName,
  triggerLabel = "Book Now",
}: BookingFormProps) {
  const formUid = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [travelers, setTravelers] = useState<TravelerInput[]>([{ ...EMPTY_TRAVELER, relation: "Self" }]);

  // Submission / error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ orderId: string; orderNo: string } | null>(null);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSpecialRequests("");
    setTravelers([{ ...EMPTY_TRAVELER, relation: "Self" }]);
    setFieldErrors({});
    setGeneralError(null);
    setSuccessResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      if (successResult) {
        resetForm();
      }
    }
  };

  // Travelers repeatable handlers
  const addTraveler = () => {
    if (travelers.length < TRAVELERS_MAX) {
      setTravelers((prev) => [...prev, { ...EMPTY_TRAVELER }]);
    }
  };

  const removeTraveler = (index: number) => {
    if (travelers.length > TRAVELERS_MIN) {
      setTravelers((prev) => prev.filter((_, i) => i !== index));
      // Clean up any errors keyed on travelers[index]
      setFieldErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`travelers.${index}`)) {
            delete next[key];
          }
        });
        return next;
      });
    }
  };

  const updateTraveler = (index: number, field: keyof TravelerInput, value: string) => {
    setTravelers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    );
    const errorKey = `travelers.${index}.${field}`;
    if (fieldErrors[errorKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors["customer.name"] = "Full name is required";
    }

    const cleanPhone = customerPhone.trim();
    if (!cleanPhone) {
      errors["customer.phone"] = "Phone number is required";
    } else if (cleanPhone.length < 5 || cleanPhone.length > 20) {
      errors["customer.phone"] = "Phone number must be 5–20 characters";
    }

    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      errors["customer.email"] = "Enter a valid email address";
    }

    if (travelers.length < TRAVELERS_MIN) {
      errors["travelers"] = "Add at least one traveler";
    }

    travelers.forEach((t, index) => {
      if (!t.name.trim()) {
        errors[`travelers.${index}.name`] = "Traveler name is required";
      }
      if (t.dob && !/^\d{4}-\d{2}-\d{2}$/.test(t.dob.trim())) {
        errors[`travelers.${index}.dob`] = "Enter date of birth (YYYY-MM-DD)";
      }
      if (t.passportNo && t.passportNo.length > 30) {
        errors[`travelers.${index}.passportNo`] = "Passport number must be 30 characters or fewer";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateClientSide()) {
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          listingId,
          customer: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || undefined,
          },
          travelers: travelers.map((t) => ({
            name: t.name.trim(),
            passportNo: t.passportNo?.trim() || undefined,
            dob: t.dob?.trim() || undefined,
            relation: t.relation?.trim() || undefined,
          })),
          specialRequests: specialRequests.trim() || undefined,
        };

        const res: CreateOrderResult = await createPackageOrderAction(payload);
        if (res.ok) {
          setSuccessResult({ orderId: res.orderId, orderNo: res.orderNo });
        } else {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          if (res.error === "RATE_LIMITED") {
            setGeneralError("Too many booking requests. Please wait a moment before trying again.");
          } else if (res.error === "not_found") {
            setGeneralError("This package is no longer available for booking.");
          } else {
            setGeneralError("Could not submit booking. Please verify the information and try again.");
          }
        }
      } catch {
        setGeneralError("An unexpected connection error occurred. Please try again.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className={
            triggerClassName ||
            "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          }
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {successResult ? (
          <div className="py-6 text-center space-y-5" role="status" aria-live="polite">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Booking Request Received
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Thank you for your booking! Your reservation request has been registered and is now in review.
              </DialogDescription>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Your Order Reference Number
              </p>
              <p
                data-testid="order-number-display"
                className="font-mono text-2xl font-bold tracking-wider text-foreground"
              >
                {successResult.orderNo}
              </p>
              <p className="text-xs text-muted-foreground">
                Please save this number for reference. We will contact you at{" "}
                <span className="font-semibold text-foreground">{customerPhone}</span> to confirm dates and final details.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="min-h-11"
              >
                Close
              </Button>
              <Button asChild className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/account/orders">
                  View My Orders
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Book {listingTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {price != null ? `Starting from ${formatMoney(price, currency)} per person. ` : ""}
                Provide your details to initiate your booking request. An advisor will confirm availability and issue your quote.
              </DialogDescription>
            </DialogHeader>

            {generalError ? (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {generalError}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              {/* Customer Contact Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Contact
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`${formUid}-customer-name`} className="text-xs font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formUid}-customer-name`}
                      name="name"
                      placeholder="e.g. Mohammad Rahman"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (fieldErrors["customer.name"]) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n["customer.name"];
                            return n;
                          });
                        }
                      }}
                      className="min-h-11"
                      aria-invalid={Boolean(fieldErrors["customer.name"])}
                      aria-describedby={fieldErrors["customer.name"] ? `${formUid}-name-error` : undefined}
                    />
                    {fieldErrors["customer.name"] ? (
                      <p id={`${formUid}-name-error`} className="text-xs text-destructive">
                        {fieldErrors["customer.name"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${formUid}-customer-phone`} className="text-xs font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formUid}-customer-phone`}
                      name="phone"
                      type="tel"
                      placeholder="+880 1700-000000"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (fieldErrors["customer.phone"]) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n["customer.phone"];
                            return n;
                          });
                        }
                      }}
                      className="min-h-11 font-mono"
                      aria-invalid={Boolean(fieldErrors["customer.phone"])}
                      aria-describedby={fieldErrors["customer.phone"] ? `${formUid}-phone-error` : undefined}
                    />
                    {fieldErrors["customer.phone"] ? (
                      <p id={`${formUid}-phone-error`} className="text-xs text-destructive">
                        {fieldErrors["customer.phone"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${formUid}-customer-email`} className="text-xs font-medium">
                      Email Address <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id={`${formUid}-customer-email`}
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (fieldErrors["customer.email"]) {
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n["customer.email"];
                            return n;
                          });
                        }
                      }}
                      className="min-h-11"
                      aria-invalid={Boolean(fieldErrors["customer.email"])}
                      aria-describedby={fieldErrors["customer.email"] ? `${formUid}-email-error` : undefined}
                    />
                    {fieldErrors["customer.email"] ? (
                      <p id={`${formUid}-email-error`} className="text-xs text-destructive">
                        {fieldErrors["customer.email"]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Travelers repeatable list */}
              <div className="space-y-4 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden="true" />
                      Travelers ({travelers.length}/{TRAVELERS_MAX})
                    </h3>
                  </div>
                  {travelers.length < TRAVELERS_MAX ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTraveler}
                      className="h-8 text-xs gap-1"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add Traveler
                    </Button>
                  ) : null}
                </div>

                {fieldErrors["travelers"] ? (
                  <p className="text-xs text-destructive">{fieldErrors["travelers"]}</p>
                ) : null}

                <div className="space-y-3">
                  {travelers.map((traveler, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-secondary/20 p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {index === 0 ? "Traveler 1 (Primary Traveler)" : `Traveler ${index + 1}`}
                        </span>
                        {travelers.length > TRAVELERS_MIN ? (
                          <button
                            type="button"
                            onClick={() => removeTraveler(index)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Remove traveler"
                            aria-label={`Remove traveler ${index + 1}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label
                            htmlFor={`${formUid}-traveler-${index}-name`}
                            className="text-xs font-medium"
                          >
                            Full Name as on Passport <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`${formUid}-traveler-${index}-name`}
                            placeholder="Traveler name"
                            value={traveler.name}
                            onChange={(e) => updateTraveler(index, "name", e.target.value)}
                            className="min-h-10 text-sm"
                            aria-invalid={Boolean(fieldErrors[`travelers.${index}.name`])}
                          />
                          {fieldErrors[`travelers.${index}.name`] ? (
                            <p className="text-xs text-destructive">
                              {fieldErrors[`travelers.${index}.name`]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`${formUid}-traveler-${index}-relation`}
                            className="text-xs font-medium"
                          >
                            Relation
                          </Label>
                          <Input
                            id={`${formUid}-traveler-${index}-relation`}
                            placeholder="e.g. Self, Spouse, Child"
                            value={traveler.relation || ""}
                            onChange={(e) => updateTraveler(index, "relation", e.target.value)}
                            className="min-h-10 text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`${formUid}-traveler-${index}-passport`}
                            className="text-xs font-medium"
                          >
                            Passport No. <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            id={`${formUid}-traveler-${index}-passport`}
                            placeholder="Passport number"
                            value={traveler.passportNo || ""}
                            onChange={(e) => updateTraveler(index, "passportNo", e.target.value)}
                            className="min-h-10 text-sm font-mono"
                          />
                          {fieldErrors[`travelers.${index}.passportNo`] ? (
                            <p className="text-xs text-destructive">
                              {fieldErrors[`travelers.${index}.passportNo`]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <Label
                            htmlFor={`${formUid}-traveler-${index}-dob`}
                            className="text-xs font-medium"
                          >
                            Date of Birth <span className="text-muted-foreground font-normal">(YYYY-MM-DD, optional)</span>
                          </Label>
                          <Input
                            id={`${formUid}-traveler-${index}-dob`}
                            type="date"
                            value={traveler.dob || ""}
                            onChange={(e) => updateTraveler(index, "dob", e.target.value)}
                            className="min-h-10 text-sm font-mono"
                          />
                          {fieldErrors[`travelers.${index}.dob`] ? (
                            <p className="text-xs text-destructive">
                              {fieldErrors[`travelers.${index}.dob`]}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div className="space-y-1.5 border-t border-border pt-5">
                <Label htmlFor={`${formUid}-special-requests`} className="text-xs font-medium">
                  Special Requests / Dietary / Room Requirements <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id={`${formUid}-special-requests`}
                  placeholder="Share any special preferences, hotel room sharing requests, or accessibility needs..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {specialRequests.length}/2000
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      Submitting Booking...
                    </>
                  ) : (
                    "Submit Booking Request"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
