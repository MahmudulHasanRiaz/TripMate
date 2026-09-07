"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { ServiceOptionCardData } from "../../_lib/service-data";
import {
  createServiceOptionOrderAction,
  getPublicPaymentGatewaysAction,
  type CreateOrderResult,
} from "@/modules/bookings/actions";
import { formatMoney, telLink, whatsappLink } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

type ServiceOptionsSelectorProps = {
  categoryName: string;
  categorySlug: string;
  options: ServiceOptionCardData[];
  site: { phone: string; email: string };
};

type PublicGateway = {
  id: string;
  name: string;
  kind: string;
  config: Record<string, string>;
  instructions: string | null;
};

export function ServiceOptionsSelector({
  categoryName,
  options,
  site,
}: ServiceOptionsSelectorProps) {
  const formUid = useId();
  const [selectedOption, setSelectedOption] = useState<ServiceOptionCardData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();

  // Step 1: Applicant Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [dob, setDob] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 2: Payment
  const [gateways, setGateways] = useState<PublicGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");

  // Errors & Success
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    orderId: string;
    orderNo: string;
    gatewayName?: string;
  } | null>(null);

  const openBookingModal = (option: ServiceOptionCardData) => {
    setSelectedOption(option);
    setStep(1);
    setFieldErrors({});
    setGeneralError(null);
    setSuccessResult(null);
    setModalOpen(true);
    loadGateways();
  };

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

  const handleStep1Advance = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!customerName.trim()) errors.name = "Full name is required";
    if (!customerPhone.trim()) errors.phone = "Phone number is required";
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      errors.dob = "Enter valid date of birth (YYYY-MM-DD)";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    setGeneralError(null);
    setFieldErrors({});

    const activeGateway = gateways.find((g) => g.id === selectedGatewayId);
    const isPayLater = activeGateway?.kind === "paylater";

    if (!isPayLater && !trxId.trim()) {
      setFieldErrors({ trxId: "Transaction ID / reference is required for verification" });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          optionId: selectedOption.id,
          customer: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || undefined,
          },
          travelers: [
            {
              name: customerName.trim(),
              passportNo: passportNo.trim() || undefined,
              dob: dob.trim() || undefined,
              relation: "Self",
            },
          ],
          specialRequests: specialRequests.trim() || undefined,
          payment: isPayLater
            ? { method: "pay_later" as const }
            : {
                method: "manual" as const,
                gatewayId: selectedGatewayId || undefined,
                senderNumber: senderNumber.trim() || undefined,
                trxId: trxId.trim() || undefined,
                    },
        };

        const res: CreateOrderResult = await createServiceOptionOrderAction(payload);

        if (res.ok) {
          setSuccessResult({
            orderId: res.orderId,
            orderNo: res.orderNo,
            gatewayName: activeGateway?.name ?? (isPayLater ? "Pay Later" : "Manual Payment"),
          });
        } else {
          if (res.error === "validation" && res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          } else if (res.error === "RATE_LIMITED") {
            setGeneralError("Too many attempts. Please wait a few moments and try again.");
          } else {
            setGeneralError("Could not submit order. Please check details or contact us.");
          }
        }
      } catch {
        setGeneralError("An unexpected error occurred. Please retry or contact an advisor.");
      }
    });
  };

  const selectedGateway = gateways.find((g) => g.id === selectedGatewayId);
  const isPayLater = selectedGateway?.kind === "paylater";
  const telHref = telLink(site.phone);
  const waHref = whatsappLink(site.phone);

  return (
    <section aria-labelledby="service-options-heading" className="bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Service Packages
          </p>
          <h2
            id="service-options-heading"
            className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Choose your {categoryName.toLowerCase()} option
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Select the required duration or validity below. Transparent government and processing
            fees, guaranteed timelines, and direct booking support.
          </p>
        </div>

        {/* Options Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <div
              key={option.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  {option.duration ? (
                    <Badge variant="secondary" className="font-medium text-xs">
                      {option.duration}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  {option.deliveryTime ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5 text-primary" aria-hidden="true" />
                      <span>{option.deliveryTime}</span>
                    </div>
                  ) : null}
                </div>

                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-foreground">
                  {option.title}
                </h3>

                {option.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {option.description}
                  </p>
                ) : null}

                <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    All-in Fee
                  </p>
                  <p className="font-mono text-2xl font-bold tracking-tight text-foreground mt-0.5">
                    {formatMoney(option.price, "BDT")}
                  </p>
                </div>

                {option.requirements.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileCheck className="size-3.5 text-primary" aria-hidden="true" />
                      Required Documents
                    </p>
                    <ul className="space-y-1.5">
                      {option.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="size-3.5 shrink-0 text-success mt-0.5" aria-hidden="true" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <Button
                  type="button"
                  onClick={() => openBookingModal(option)}
                  className="w-full min-h-11 font-semibold"
                >
                  Apply for this Option
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Advisor Contact Helper */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between rounded-xl border border-border bg-secondary/30 p-6 gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              Have specific questions before applying?
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Speak directly with our passport and documentation specialists.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {telHref ? (
              <a
                href={telHref}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                <span>{site.phone}</span>
              </a>
            ) : null}
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                <MessageCircle className="size-3.5 text-primary" aria-hidden="true" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {successResult ? (
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-8" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="font-display text-2xl font-bold">
                  Application Received!
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  Your order reference is{" "}
                  <span className="font-mono font-bold text-foreground">
                    {successResult.orderNo}
                  </span>
                  .
                </DialogDescription>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-semibold text-foreground">{selectedOption?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applicant:</span>
                  <span className="font-semibold text-foreground">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold text-foreground">{successResult.gatewayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Payable:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedOption ? formatMoney(selectedOption.price, "BDT") : ""}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Our verification desk will review your submission and contact you via phone or WhatsApp
                to arrange biometric schedule or physical document handover.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild className="font-semibold">
                  <Link href={`/account/orders/${successResult.orderId}`}>
                    View Order in Portal
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="font-display text-xl font-bold">
                    {step === 1 ? "Applicant Information" : "Payment & Submission"}
                  </DialogTitle>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Step {step} of 2
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedOption?.title} — {selectedOption ? formatMoney(selectedOption.price, "BDT") : ""}
                </DialogDescription>
              </DialogHeader>

              {generalError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                >
                  {generalError}
                </div>
              ) : null}

              {step === 1 ? (
                <form onSubmit={handleStep1Advance} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${formUid}-name`} className="text-xs font-medium">
                      Applicant Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${formUid}-name`}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Mohammad Rahman"
                      className={cn("h-9 text-xs", fieldErrors.name && "border-destructive")}
                      required
                    />
                    {fieldErrors.name ? (
                      <p className="text-[11px] text-destructive">{fieldErrors.name}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${formUid}-phone`} className="text-xs font-medium">
                        Phone / WhatsApp <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`${formUid}-phone`}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+8801700000000"
                        className={cn("h-9 text-xs", fieldErrors.phone && "border-destructive")}
                        required
                      />
                      {fieldErrors.phone ? (
                        <p className="text-[11px] text-destructive">{fieldErrors.phone}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${formUid}-email`} className="text-xs font-medium">
                        Email Address (Optional)
                      </Label>
                      <Input
                        id={`${formUid}-email`}
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${formUid}-passport`} className="text-xs font-medium">
                        Current / Previous Passport No. (Optional)
                      </Label>
                      <Input
                        id={`${formUid}-passport`}
                        value={passportNo}
                        onChange={(e) => setPassportNo(e.target.value)}
                        placeholder="e.g. A01234567"
                        className="h-9 text-xs uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`${formUid}-dob`} className="text-xs font-medium">
                        Date of Birth (YYYY-MM-DD)
                      </Label>
                      <Input
                        id={`${formUid}-dob`}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="1990-05-15"
                        className={cn("h-9 text-xs", fieldErrors.dob && "border-destructive")}
                      />
                      {fieldErrors.dob ? (
                        <p className="text-[11px] text-destructive">{fieldErrors.dob}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${formUid}-notes`} className="text-xs font-medium">
                      Special Requests / Notes (Optional)
                    </Label>
                    <Textarea
                      id={`${formUid}-notes`}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Any urgent deadline, previous rejection or specific appointment dates..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="gap-2 font-semibold">
                      Continue to Payment
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleFinalSubmit} className="space-y-4 pt-2">
                  <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Selected Package:</span>
                      <span className="text-foreground">{selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground">
                      <span>Total Amount:</span>
                      <span className="font-mono">
                        {selectedOption ? formatMoney(selectedOption.price, "BDT") : ""}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Select Payment Method</Label>
                    {loadingGateways ? (
                      <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Loading payment options...
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {gateways.map((gw) => {
                          const isSelected = selectedGatewayId === gw.id;
                          return (
                            <button
                              key={gw.id}
                              type="button"
                              onClick={() => setSelectedGatewayId(gw.id)}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                                  : "border-border bg-card text-muted-foreground hover:border-border/80",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                                  isSelected
                                    ? "border-primary/20 bg-primary text-primary-foreground"
                                    : "border-border bg-muted text-muted-foreground",
                                )}
                              >
                                {gw.kind === "mfs" ? (
                                  <Wallet className="size-4" />
                                ) : gw.kind === "bank" ? (
                                  <Building2 className="size-4" />
                                ) : gw.kind === "paylater" ? (
                                  <ShieldCheck className="size-4" />
                                ) : (
                                  <CreditCard className="size-4" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {gw.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground capitalize">
                                  {gw.kind === "paylater" ? "Book & pay later" : `${gw.kind} transfer`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedGateway && !isPayLater ? (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-xs">
                      {selectedGateway.instructions ? (
                        <div>
                          <p className="font-semibold text-foreground">Payment Instructions:</p>
                          <p className="mt-1 leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {selectedGateway.instructions}
                          </p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
                        <div className="space-y-1">
                          <Label htmlFor={`${formUid}-sender`} className="text-xs font-medium">
                            Sender Number / Account
                          </Label>
                          <Input
                            id={`${formUid}-sender`}
                            value={senderNumber}
                            onChange={(e) => setSenderNumber(e.target.value)}
                            placeholder="e.g. 01711223344"
                            className="h-8 text-xs bg-background"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`${formUid}-trx`} className="text-xs font-medium">
                            Transaction ID / Reference <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`${formUid}-trx`}
                            value={trxId}
                            onChange={(e) => setTrxId(e.target.value)}
                            placeholder="e.g. 9J5K2L99Q"
                            className={cn(
                              "h-8 text-xs uppercase font-mono bg-background",
                              fieldErrors.trxId && "border-destructive",
                            )}
                            required
                          />
                          {fieldErrors.trxId ? (
                            <p className="text-[10px] text-destructive">{fieldErrors.trxId}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isPayLater ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                        Reserve Now, Pay Later
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        Your application will be queued immediately. You can make payment via portal or cash
                        after our advisor verifies your documentation.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      disabled={isPending}
                      className="gap-1.5 text-xs"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                      Back
                    </Button>

                    <Button type="submit" disabled={isPending} className="gap-2 font-semibold">
                      {isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Confirm & Book
                          <Check className="size-4" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
