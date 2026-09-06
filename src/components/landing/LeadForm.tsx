"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import type { FormConfig, LandingFormField } from "@/modules/landing-pages/section-types";
import { submitLead } from "@/modules/leads/actions";
import { getFbCookies } from "@/lib/fb-cookies";
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

type LeadFormProps = {
  formConfig: FormConfig | null;
  landingSlug: string;
  previewMode?: boolean;
};

function looksLikePhone(val: string): boolean {
  const digits = val.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^\+?[\d\s().-]+$/.test(val);
}

function looksLikeEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function LeadForm({ formConfig, landingSlug, previewMode = false }: LeadFormProps) {
  const formUid = useId();
  const [isPending, startTransition] = useTransition();
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (!formConfig || !formConfig.fields || formConfig.fields.length === 0) {
    return null;
  }

  const fields = formConfig.fields;

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      const rawVal = (formData[field.key] ?? "").trim();
      if (field.required && !rawVal) {
        errors[field.key] = `${field.label} is required`;
        continue;
      }

      if (rawVal) {
        if (field.type === "email" && !looksLikeEmail(rawVal)) {
          errors[field.key] = "Enter a valid email address";
        } else if (field.type === "tel" && !looksLikePhone(rawVal)) {
          errors[field.key] = "Enter a valid phone number (7–15 digits)";
        } else if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(rawVal)) {
          errors[field.key] = "Enter a valid date (YYYY-MM-DD)";
        } else if (field.type === "select" && field.options && !field.options.includes(rawVal)) {
          errors[field.key] = "Select one of the available options";
        }
      }
    }

    // Reachability guarantee check (at least one email or tel field must hold a value)
    const reachableFields = fields.filter((f) => f.type === "email" || f.type === "tel");
    if (reachableFields.length > 0) {
      const hasAnyContact = reachableFields.some((f) => (formData[f.key] ?? "").trim().length > 0);
      if (!hasAnyContact) {
        const targetKey = reachableFields[0].key;
        errors[targetKey] = "Provide at least a phone number or an email so we can reach you";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateClientSide()) {
      return;
    }

    if (previewMode) {
      setSubmittedSuccess(true);
      return;
    }

    startTransition(async () => {
      try {
        const fbParams = getFbCookies();
        const honeypotVal = formData.company_website || "";

        const fullFormData: Record<string, string> = {};
        for (const f of fields) {
          fullFormData[f.key] = formData[f.key] ?? "";
        }
        if (formData.company_website) {
          fullFormData.company_website = formData.company_website;
        }

        const result = await submitLead({
          landingSlug,
          formData: fullFormData,
          fbParams,
          honeypot: honeypotVal,
        });

        if (result.ok) {
          setSubmittedSuccess(true);
          // Optional client pixel Lead event (server CAPI is source of truth)
          if (typeof window !== "undefined" && "fbq" in window) {
            try {
              (window as unknown as { fbq: (...args: unknown[]) => void }).fbq(
                "track",
                "Lead",
              );
            } catch {
              // Ignore client pixel fire failure
            }
          }
        } else {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
            if (result.fieldErrors.form) {
              setGeneralError(result.fieldErrors.form);
            }
          } else {
            setGeneralError("We were unable to submit your request. Please try again.");
          }
        }
      } catch (err) {
        console.error("[LeadForm] Submission error", err);
        setGeneralError("An unexpected error occurred. Please try again or contact us directly.");
      }
    });
  };

  return (
    <section className="py-16 sm:py-24" id="lead-form-section">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-10">
          {submittedSuccess ? (
            <div
              className="py-10 text-center animate-in fade-in zoom-in-95 duration-300"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="size-8" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Thank you! We&apos;ve received your inquiry.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                A TripMate dedicated specialist will review your details and contact you promptly.
              </p>
            </div>
          ) : (
            <>
              {formConfig.title?.trim() || formConfig.subtitle?.trim() ? (
                <div className="mb-8 text-center">
                  {formConfig.title?.trim() ? (
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formConfig.title}
                    </h2>
                  ) : null}
                  {formConfig.subtitle?.trim() ? (
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                      {formConfig.subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Accessible live region for errors */}
              <div aria-live="polite" aria-atomic="true">
                {generalError ? (
                  <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {generalError}
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Honeypot field (hidden from sighted visitors & screen readers) */}
                <div aria-hidden="true" className="sr-only opacity-0 pointer-events-none absolute -left-[9999px]">
                  <label htmlFor={`${formUid}-company_website`}>Company Website</label>
                  <input
                    id={`${formUid}-company_website`}
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.company_website || ""}
                    onChange={(e) => handleFieldChange("company_website", e.target.value)}
                  />
                </div>

                {fields.map((field: LandingFormField) => {
                  const fieldId = `${formUid}-${field.key}`;
                  const error = fieldErrors[field.key];
                  const value = formData[field.key] || "";

                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required ? (
                          <span className="text-destructive ml-1" aria-hidden="true">*</span>
                        ) : null}
                      </Label>

                      {field.type === "textarea" ? (
                        <Textarea
                          id={fieldId}
                          name={field.key}
                          placeholder={field.placeholder || ""}
                          value={value}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          rows={4}
                          disabled={isPending}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${fieldId}-error` : undefined}
                          className="resize-none"
                        />
                      ) : field.type === "select" ? (
                        <Select
                          value={value}
                          onValueChange={(val) => handleFieldChange(field.key, val)}
                          disabled={isPending}
                        >
                          <SelectTrigger
                            id={fieldId}
                            className="h-11 w-full"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${fieldId}-error` : undefined}
                          >
                            <SelectValue placeholder={field.placeholder || "Select an option"} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={fieldId}
                          type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                          name={field.key}
                          placeholder={field.placeholder || ""}
                          value={value}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          disabled={isPending}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${fieldId}-error` : undefined}
                          className="h-11"
                        />
                      )}

                      {error ? (
                        <p id={`${fieldId}-error`} className="text-xs font-medium text-destructive">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  );
                })}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full min-h-[44px] rounded-lg text-base font-semibold shadow-sm transition-all duration-200"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                      Sending details...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 size-4" aria-hidden="true" />
                      Submit inquiry
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
