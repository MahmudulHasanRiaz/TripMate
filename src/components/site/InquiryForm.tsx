"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { createInquiryOrderAction, type CreateOrderResult } from "@/modules/bookings/actions";
import type { FormConfig } from "@/modules/landing-pages/section-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InquiryFormProps = {
  listingId?: string;
  listingTitle?: string;
  categoryName: string;
  formConfig?: FormConfig | null;
};

export function InquiryForm({
  listingId,
  listingTitle,
  categoryName,
  formConfig,
}: InquiryFormProps) {
  const formUid = useId();
  const [isPending, startTransition] = useTransition();

  // Basic contact fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");

  // Dynamic extra fields
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  // Error & success states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ orderId: string; orderNo: string } | null>(null);

  const hasCustomFields = Boolean(formConfig?.fields && formConfig.fields.length > 0);

  const handleExtraChange = (key: string, val: string) => {
    setExtraValues((prev) => ({ ...prev, [key]: val }));
    if (fieldErrors[key] || fieldErrors[`extraFields.${key}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        delete next[`extraFields.${key}`];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors["name"] = "Full name is required";
    }

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedPhone && !trimmedEmail) {
      errors["phone"] = "Provide at least a phone number or an email address";
    } else {
      if (trimmedPhone && (trimmedPhone.length < 5 || trimmedPhone.length > 20)) {
        errors["phone"] = "Phone number must be 5–20 characters";
      }
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errors["email"] = "Enter a valid email address";
      }
    }

    // Dynamic fields validation
    if (hasCustomFields && formConfig?.fields) {
      for (const field of formConfig.fields) {
        const val = (extraValues[field.key] ?? "").trim();
        if (field.required && !val) {
          errors[field.key] = `${field.label} is required`;
          continue;
        }
        if (val) {
          if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            errors[field.key] = "Enter a valid email address";
          } else if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            errors[field.key] = "Enter a valid date (YYYY-MM-DD)";
          }
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) return;

    startTransition(async () => {
      try {
        const payload = {
          listingId: listingId || undefined,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          details: details.trim() || undefined,
          extraFields: hasCustomFields ? extraValues : undefined,
        };

        const res: CreateOrderResult = await createInquiryOrderAction(payload);
        if (res.ok) {
          setSuccessResult({ orderId: res.orderId, orderNo: res.orderNo });
        } else {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          if (res.error === "RATE_LIMITED") {
            setGeneralError("Too many requests. Please wait a moment before trying again.");
          } else {
            setGeneralError("Could not submit your inquiry. Please check your information and try again.");
          }
        }
      } catch {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
    });
  };

  if (successResult) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-border bg-card p-6 shadow-sm text-center space-y-4"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Inquiry Submitted Successfully
        </h3>
        <p className="text-sm text-muted-foreground">
          Thank you for reaching out! Your inquiry for{" "}
          <span className="font-medium text-foreground">{listingTitle || categoryName}</span> has been received.
        </p>
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Inquiry Reference
          </p>
          <p
            data-testid="inquiry-order-no"
            className="font-mono text-xl font-bold tracking-wider text-foreground"
          >
            {successResult.orderNo}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          An advisor will review your requirements and follow up with a written breakdown.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/account/orders">
              Track in Portal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="font-display text-xl font-semibold tracking-tight">
          Request a Quote for {categoryName}
        </h3>
        <p className="text-xs text-muted-foreground">
          Tell us about your requirements and an advisor will prepare a custom proposal.
        </p>
      </div>

      {generalError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {generalError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Core contact fields */}
        <div className="space-y-1.5">
          <Label htmlFor={`${formUid}-name`} className="text-xs font-medium">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${formUid}-name`}
            placeholder="e.g. Tariq Ahmed"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors["name"]) {
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n["name"];
                  return n;
                });
              }
            }}
            className="min-h-11"
            aria-invalid={Boolean(fieldErrors["name"])}
          />
          {fieldErrors["name"] ? (
            <p className="text-xs text-destructive">{fieldErrors["name"]}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${formUid}-phone`} className="text-xs font-medium">
              Phone Number
            </Label>
            <Input
              id={`${formUid}-phone`}
              type="tel"
              placeholder="+880 1700-000000"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors["phone"]) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n["phone"];
                    return n;
                  });
                }
              }}
              className="min-h-11 font-mono"
              aria-invalid={Boolean(fieldErrors["phone"])}
            />
            {fieldErrors["phone"] ? (
              <p className="text-xs text-destructive">{fieldErrors["phone"]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formUid}-email`} className="text-xs font-medium">
              Email Address
            </Label>
            <Input
              id={`${formUid}-email`}
              type="email"
              placeholder="tariq@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors["email"]) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n["email"];
                    return n;
                  });
                }
              }}
              className="min-h-11"
              aria-invalid={Boolean(fieldErrors["email"])}
            />
            {fieldErrors["email"] ? (
              <p className="text-xs text-destructive">{fieldErrors["email"]}</p>
            ) : null}
          </div>
        </div>

        {/* Dynamic formConfig fields if configured */}
        {hasCustomFields && formConfig?.fields ? (
          <div className="space-y-4 border-t border-border pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Service Details
            </h4>
            {formConfig.fields.map((field) => {
              const errKey = fieldErrors[field.key] || fieldErrors[`extraFields.${field.key}`];

              if (field.type === "select") {
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                    </Label>
                    <Select
                      value={extraValues[field.key] || ""}
                      onValueChange={(val) => handleExtraChange(field.key, val)}
                    >
                      <SelectTrigger className="min-h-11 w-full text-sm">
                        <SelectValue placeholder={field.placeholder || "Select option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errKey ? <p className="text-xs text-destructive">{errKey}</p> : null}
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${formUid}-${field.key}`} className="text-xs font-medium">
                      {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                    </Label>
                    <Textarea
                      id={`${formUid}-${field.key}`}
                      placeholder={field.placeholder}
                      value={extraValues[field.key] || ""}
                      onChange={(e) => handleExtraChange(field.key, e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    {errKey ? <p className="text-xs text-destructive">{errKey}</p> : null}
                  </div>
                );
              }

              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`${formUid}-${field.key}`} className="text-xs font-medium">
                    {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                  </Label>
                  <Input
                    id={`${formUid}-${field.key}`}
                    type={field.type === "tel" ? "tel" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                    placeholder={field.placeholder}
                    value={extraValues[field.key] || ""}
                    onChange={(e) => handleExtraChange(field.key, e.target.value)}
                    className="min-h-11 text-sm"
                  />
                  {errKey ? <p className="text-xs text-destructive">{errKey}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* General details field */}
        <div className="space-y-1.5">
          <Label htmlFor={`${formUid}-details`} className="text-xs font-medium">
            Additional Details & Requirements <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id={`${formUid}-details`}
            placeholder="Destination dates, passenger count, passport urgency, or specific itinerary requests..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={4000}
            className="text-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Submitting Inquiry...
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" aria-hidden="true" />
              Send Inquiry Request
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
