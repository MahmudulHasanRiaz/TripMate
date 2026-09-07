"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  createPackageOrderAction,
  getPublicPaymentGatewaysAction,
  type CreateOrderResult,
} from "@/modules/bookings/actions";
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
import { cn } from "@/lib/utils";

type BookingFormProps = {
  listingId: string;
  listingTitle: string;
  price?: number | null;
  currency?: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

type PublicGateway = {
  id: string;
  name: string;
  kind: string;
  config: Record<string, string>;
  instructions: string | null;
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
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();

  // Form states - Step 1: Travelers
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [travelers, setTravelers] = useState<TravelerInput[]>([
    { ...EMPTY_TRAVELER, relation: "Self" },
  ]);

  // Form states - Step 2: Payment
  const [gateways, setGateways] = useState<PublicGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [depositSlipUrl, setDepositSlipUrl] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Submission / error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    orderId: string;
    orderNo: string;
    gatewayName?: string;
  } | null>(null);

  // Load payment gateways on first step 2 advance or modal open
  const loadGateways = async () => {
    if (gateways.length > 0) return;
    setLoadingGateways(true);
    try {
      const gws = await getPublicPaymentGatewaysAction();
      setGateways(gws);
      if (gws.length > 0 && !selectedGatewayId) {
        setSelectedGatewayId(gws[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingGateways(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSpecialRequests("");
    setTravelers([{ ...EMPTY_TRAVELER, relation: "Self" }]);
    setSenderNumber("");
    setTrxId("");
    setDepositSlipUrl("");
    setPaymentNotes("");
    setFieldErrors({});
    setGeneralError(null);
    setSuccessResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadGateways();
    } else if (successResult) {
      resetForm();
    }
  };

  // Repeatable travelers
  const addTraveler = () => {
    if (travelers.length < TRAVELERS_MAX) {
      setTravelers((prev) => [...prev, { ...EMPTY_TRAVELER }]);
    }
  };

  const removeTraveler = (index: number) => {
    if (travelers.length > TRAVELERS_MIN) {
      setTravelers((prev) => prev.filter((_, i) => i !== index));
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

  const updateTraveler = (
    index: number,
    field: keyof TravelerInput,
    value: string,
  ) => {
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

  // Validation - Step 1
  const validateStep1 = (): boolean => {
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

    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
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
        errors[`travelers.${index}.passportNo`] =
          "Passport number must be 30 characters or fewer";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validation - Step 2
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    const currentGateway = gateways.find((g) => g.id === selectedGatewayId);

    if (!currentGateway) {
      errors["payment.gateway"] = "Please select a payment method";
    } else if (currentGateway.kind === "manual") {
      const isBank = currentGateway.config?.accountType === "bank";
      if (!isBank) {
        // Mobile Money (bKash, Nagad, Rocket)
        if (!senderNumber.trim()) {
          errors["payment.senderNumber"] = "Sender account/mobile number is required";
        }
        if (!trxId.trim()) {
          errors["payment.trxId"] = "Transaction ID (TrxID) is required";
        }
      } else {
        // Bank transfer
        if (!trxId.trim() && !depositSlipUrl.trim()) {
          errors["payment.trxId"] = "Enter bank deposit transaction or receipt reference";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueToPayment = () => {
    setGeneralError(null);
    if (validateStep1()) {
      setStep(2);
      loadGateways();
    }
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateStep2()) {
      return;
    }

    const currentGateway = gateways.find((g) => g.id === selectedGatewayId);
    const isPayLater = currentGateway?.kind === "paylater";

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
          payment: currentGateway
            ? {
                gatewayId: currentGateway.id,
                method: (isPayLater ? "pay_later" : "manual") as "manual" | "pay_later",
                senderNumber: senderNumber.trim() || undefined,
                trxId: trxId.trim() || undefined,
                depositSlipUrl: depositSlipUrl.trim() || undefined,
                notes: paymentNotes.trim() || undefined,
              }
            : undefined,
        };

        const res: CreateOrderResult = await createPackageOrderAction(payload);
        if (res.ok) {
          setSuccessResult({
            orderId: res.orderId,
            orderNo: res.orderNo,
            gatewayName: currentGateway?.name,
          });
        } else {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          if (res.error === "RATE_LIMITED") {
            setGeneralError("Too many booking attempts. Please wait a moment before trying again.");
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

  const selectedGw = gateways.find((g) => g.id === selectedGatewayId);
  const totalAmount = price ? price * travelers.length : null;

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

      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {successResult ? (
          /* Step 3: Success Screen */
          <div className="py-6 text-center space-y-5" role="status" aria-live="polite">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="size-8" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Booking Confirmed & Received!
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                Your reservation and payment information have been registered into our system.
              </DialogDescription>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Order Reference Number
              </p>
              <p
                data-testid="order-number-display"
                className="font-mono text-2xl font-bold tracking-wider text-foreground"
              >
                {successResult.orderNo}
              </p>
              {successResult.gatewayName && (
                <p className="text-xs text-muted-foreground pt-1">
                  Payment Method: <span className="font-medium text-foreground">{successResult.gatewayName}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Please save this reference. Our travel advisor will reach out to{" "}
                <span className="font-semibold text-foreground">{customerPhone}</span> to finalize your itinerary.
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
                <Link href="/account/orders">View My Orders</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper Header */}
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px]",
                    step === 1 ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground",
                  )}
                >
                  {step > 1 ? <Check className="size-3" /> : "1"}
                </span>
                <span className={step === 1 ? "text-foreground font-medium" : ""}>Traveler Details</span>
                <span className="text-border">/</span>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px]",
                    step === 2 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
                  )}
                >
                  2
                </span>
                <span className={step === 2 ? "text-foreground font-medium" : ""}>Payment Method</span>
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {step === 1 ? `Book ${listingTitle}` : "Payment & Final Review"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {step === 1
                  ? price != null
                    ? `From ${formatMoney(price, currency)} per traveler. Provide traveler details to begin.`
                    : "Provide traveler details to initiate your reservation."
                  : "Choose your preferred payment method to secure your reservation."}
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

            {/* STEP 1: Traveler Details */}
            {step === 1 ? (
              <div className="space-y-6 pt-2">
                {/* Primary Contact */}
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
                      />
                      {fieldErrors["customer.name"] ? (
                        <p className="text-xs text-destructive">{fieldErrors["customer.name"]}</p>
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
                      />
                      {fieldErrors["customer.phone"] ? (
                        <p className="text-xs text-destructive">{fieldErrors["customer.phone"]}</p>
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
                      />
                      {fieldErrors["customer.email"] ? (
                        <p className="text-xs text-destructive">{fieldErrors["customer.email"]}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Travelers Repeatable */}
                <div className="space-y-4 border-t border-border pt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden="true" />
                      Travelers ({travelers.length}/{TRAVELERS_MAX})
                    </h3>
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
                            <Label htmlFor={`${formUid}-t-${index}-name`} className="text-xs font-medium">
                              Full Name as on Passport <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`${formUid}-t-${index}-name`}
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
                            <Label htmlFor={`${formUid}-t-${index}-relation`} className="text-xs font-medium">
                              Relation
                            </Label>
                            <Input
                              id={`${formUid}-t-${index}-relation`}
                              placeholder="e.g. Self, Spouse, Child"
                              value={traveler.relation || ""}
                              onChange={(e) => updateTraveler(index, "relation", e.target.value)}
                              className="min-h-10 text-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor={`${formUid}-t-${index}-passport`} className="text-xs font-medium">
                              Passport No. <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                              id={`${formUid}-t-${index}-passport`}
                              placeholder="Passport number"
                              value={traveler.passportNo || ""}
                              onChange={(e) => updateTraveler(index, "passportNo", e.target.value)}
                              className="min-h-10 text-sm font-mono"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor={`${formUid}-t-${index}-dob`} className="text-xs font-medium">
                              Date of Birth <span className="text-muted-foreground font-normal">(YYYY-MM-DD, optional)</span>
                            </Label>
                            <Input
                              id={`${formUid}-t-${index}-dob`}
                              type="date"
                              value={traveler.dob || ""}
                              onChange={(e) => updateTraveler(index, "dob", e.target.value)}
                              className="min-h-10 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Requests */}
                <div className="space-y-1.5 border-t border-border pt-5">
                  <Label htmlFor={`${formUid}-special-requests`} className="text-xs font-medium">
                    Special Requests / Room Preferences <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id={`${formUid}-special-requests`}
                    placeholder="Share any special preferences, hotel room sharing requests, or accessibility needs..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                    maxLength={2000}
                    className="text-sm"
                  />
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
                    type="button"
                    onClick={handleContinueToPayment}
                    className="min-h-11 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Proceed to Payment <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              /* STEP 2: Payment Method Selection & Submit */
              <form onSubmit={handleSubmitBooking} className="space-y-5 pt-2">
                {/* Commercial Summary Banner */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Summary</p>
                      <p className="font-semibold text-sm text-foreground truncate max-w-[280px]">
                        {listingTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {travelers.length} {travelers.length === 1 ? "Traveler" : "Travelers"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Estimated Total</p>
                      <p className="font-display text-lg font-bold text-primary">
                        {totalAmount !== null
                          ? formatMoney(totalAmount, currency)
                          : "Quote on Request"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Gateway Options */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Payment Gateway
                  </Label>

                  {loadingGateways ? (
                    <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading payment methods...
                    </div>
                  ) : gateways.length === 0 ? (
                    <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground text-center">
                      No online gateways currently configured. You can submit now and our team will contact you.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gateways.map((gw) => {
                        const isSelected = gw.id === selectedGatewayId;
                        const isMfs =
                          gw.kind === "manual" &&
                          (gw.config?.channel === "bkash" ||
                            gw.config?.channel === "nagad" ||
                            gw.config?.channel === "rocket" ||
                            /bkash|nagad|rocket/i.test(gw.name));
                        const isBank =
                          gw.kind === "manual" &&
                          (gw.config?.accountType === "bank" || Boolean(gw.config?.bankName));
                        const isPayLater = gw.kind === "paylater";

                        return (
                          <div
                            key={gw.id}
                            onClick={() => setSelectedGatewayId(gw.id)}
                            className={cn(
                              "relative cursor-pointer rounded-xl border-2 p-3.5 transition-all text-left",
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-border/80 bg-card",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground">
                                  {isMfs ? (
                                    <Wallet className="size-4 text-primary" />
                                  ) : isBank ? (
                                    <Building2 className="size-4 text-primary" />
                                  ) : isPayLater ? (
                                    <ShieldCheck className="size-4 text-primary" />
                                  ) : (
                                    <CreditCard className="size-4 text-primary" />
                                  )}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    {gw.name}
                                    {gw.config?.accountType && (
                                      <span className="inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-secondary-foreground">
                                        {gw.config.accountType}
                                      </span>
                                    )}
                                  </p>
                                  {gw.config?.number && (
                                    <p className="text-xs font-mono text-muted-foreground">
                                      Number: <span className="font-semibold text-foreground">{gw.config.number}</span>
                                    </p>
                                  )}
                                  {gw.config?.accountNo && (
                                    <p className="text-xs font-mono text-muted-foreground">
                                      A/C: <span className="font-semibold text-foreground">{gw.config.accountNo}</span> ({gw.config?.bankName})
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "flex size-5 items-center justify-center rounded-full border",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background",
                                )}
                              >
                                {isSelected ? <Check className="size-3" /> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {fieldErrors["payment.gateway"] && (
                    <p className="text-xs text-destructive">{fieldErrors["payment.gateway"]}</p>
                  )}
                </div>

                {/* Gateway Detail & Inputs */}
                {selectedGw && (
                  <div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-4">
                    {selectedGw.instructions && (
                      <div className="rounded-lg bg-card p-3 border border-border text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <HelpCircle className="size-3.5 text-primary" />
                          Instructions:
                        </p>
                        <p className="leading-relaxed">{selectedGw.instructions}</p>
                      </div>
                    )}

                    {/* Bank Transfer Details Block */}
                    {selectedGw.config?.accountType === "bank" && (
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-lg border border-border bg-card p-3">
                        {selectedGw.config.bankName && (
                          <div>
                            <span className="text-muted-foreground">Bank:</span>{" "}
                            <span className="font-semibold text-foreground">{selectedGw.config.bankName}</span>
                          </div>
                        )}
                        {selectedGw.config.accountName && (
                          <div>
                            <span className="text-muted-foreground">Account Name:</span>{" "}
                            <span className="font-semibold text-foreground">{selectedGw.config.accountName}</span>
                          </div>
                        )}
                        {selectedGw.config.accountNo && (
                          <div>
                            <span className="text-muted-foreground">Account No:</span>{" "}
                            <span className="font-mono font-semibold text-foreground">{selectedGw.config.accountNo}</span>
                          </div>
                        )}
                        {selectedGw.config.branch && (
                          <div>
                            <span className="text-muted-foreground">Branch:</span>{" "}
                            <span className="font-medium text-foreground">{selectedGw.config.branch}</span>
                          </div>
                        )}
                        {selectedGw.config.routing && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Routing No:</span>{" "}
                            <span className="font-mono font-medium text-foreground">{selectedGw.config.routing}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inputs depending on gateway kind */}
                    {selectedGw.kind === "manual" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedGw.config?.accountType !== "bank" && (
                          <div className="space-y-1">
                            <Label htmlFor={`${formUid}-sender-number`} className="text-xs font-medium">
                              Sender Mobile No. <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`${formUid}-sender-number`}
                              placeholder="01XXXXXXXXX"
                              value={senderNumber}
                              onChange={(e) => {
                                setSenderNumber(e.target.value);
                                if (fieldErrors["payment.senderNumber"]) {
                                  setFieldErrors((prev) => {
                                    const n = { ...prev };
                                    delete n["payment.senderNumber"];
                                    return n;
                                  });
                                }
                              }}
                              className="min-h-10 text-sm font-mono"
                              aria-invalid={Boolean(fieldErrors["payment.senderNumber"])}
                            />
                            {fieldErrors["payment.senderNumber"] && (
                              <p className="text-xs text-destructive">{fieldErrors["payment.senderNumber"]}</p>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label htmlFor={`${formUid}-trx-id`} className="text-xs font-medium">
                            {selectedGw.config?.accountType === "bank" ? "Deposit Slip / Reference No." : "Transaction ID (TrxID)"}{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`${formUid}-trx-id`}
                            placeholder={selectedGw.config?.accountType === "bank" ? "Ref / Deposit No" : "e.g. 9J38S74"}
                            value={trxId}
                            onChange={(e) => {
                              setTrxId(e.target.value);
                              if (fieldErrors["payment.trxId"]) {
                                setFieldErrors((prev) => {
                                  const n = { ...prev };
                                  delete n["payment.trxId"];
                                  return n;
                                });
                              }
                            }}
                            className="min-h-10 text-sm font-mono uppercase"
                            aria-invalid={Boolean(fieldErrors["payment.trxId"])}
                          />
                          {fieldErrors["payment.trxId"] && (
                            <p className="text-xs text-destructive">{fieldErrors["payment.trxId"]}</p>
                          )}
                        </div>

                        {selectedGw.config?.accountType === "bank" && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor={`${formUid}-slip-url`} className="text-xs font-medium">
                              Deposit Slip Image URL / Drive Link <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                              id={`${formUid}-slip-url`}
                              placeholder="https://..."
                              value={depositSlipUrl}
                              onChange={(e) => setDepositSlipUrl(e.target.value)}
                              className="min-h-10 text-sm"
                            />
                          </div>
                        )}

                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`${formUid}-payment-notes`} className="text-xs font-medium">
                            Payment Reference Note <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            id={`${formUid}-payment-notes`}
                            placeholder="Any note for our accounts team..."
                            value={paymentNotes}
                            onChange={(e) => setPaymentNotes(e.target.value)}
                            className="min-h-10 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {selectedGw.kind === "paylater" && (
                      <div className="rounded-lg bg-card p-3 border border-border text-xs text-muted-foreground">
                        <p className="text-foreground font-medium">Pay Later Selected</p>
                        <p className="mt-1">
                          No immediate deposit is required right now. You can complete payment at our agency office, via bank transfer, or MFS before departure.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isPending}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 size-4" /> Back to Travelers
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="min-h-11 w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                        Confirming Booking & Payment...
                      </>
                    ) : (
                      "Confirm & Place Order"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

