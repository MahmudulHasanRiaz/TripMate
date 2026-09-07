"use client";

/**
 * Setup wizard — one-time first-run configuration.
 *
 * Vertical stepper (Admin account → Site identity → Storage → SMTP → Meta →
 * Finish) with per-step state chips. Two modes flow through the same panels:
 *  - envWritable (local/VPS): private values are written straight to `.env`
 *    through `wizardWriteEnv` and hot-detected via `wizardRecheck`.
 *  - !envWritable (Vercel/Docker): each env-dependent step shows a monospace
 *    KEY=VALUE copy-block the operator adds to the platform, then presses
 *    "Re-check" until detection flips the step to configured.
 *
 * Every password-type input starts empty and its value is never echoed after a
 * successful save (the panel unmounts on advance). Action/rate-limit failures
 * render as inline destructive text in a live region.
 *
 * "use client" + `import type` from server-only modules is safe — type imports
 * are erased at compile time, so no server-only runtime edge exists.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, HardDrive, Cloud, Info, ShieldCheck, ArrowRight, Wrench } from "lucide-react";

import {
  wizardComplete,
  wizardCreateSuperadmin,
  wizardRecheck,
  wizardSeedData,
  wizardSetSetting,
  wizardTestR2,
  wizardTestSmtp,
  wizardWriteEnv,
} from "@/modules/settings/wizard-actions";

import type { WizardStatus, WizardSteps } from "@/modules/settings/wizard";
import type { SiteSetting } from "@/modules/settings/service";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const RATE_LIMITED_MSG =
  "Too many attempts. Wait about a minute, then try again.";
const GENERIC_MSG = "Something went wrong on the server. Try again.";

/** Map an unknown error (thrown code, relayed code string, or message). */
function friendlyError(error: unknown): string {
  if (error === "RATE_LIMITED") return RATE_LIMITED_MSG;
  if (typeof error === "string") return error || GENERIC_MSG;
  if (error instanceof Error) {
    const m = error.message;
    if (/RATE_LIMITED/.test(m)) return RATE_LIMITED_MSG;
    if (/UNAUTHORIZED/.test(m)) return GENERIC_MSG;
    if (m && !/digest/i.test(m) && !/Server Component/i.test(m)) return m;
  }
  return GENERIC_MSG;
}

/** Turn an action result (`{ok,error?}`) into an error string or null. */
function resultError(res: { ok?: boolean; error?: string } | null | undefined): string | null {
  if (!res) return GENERIC_MSG;
  if (res.ok) return null;
  return friendlyError(res.error);
}

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function ActionSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="text-sm font-medium text-success">
      {message}
    </p>
  );
}

function LabeledInput(props: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const { id, label, type = "text", autoComplete, value, onValueChange, placeholder, disabled, hint } = props;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="h-11"
        placeholder={placeholder}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Monospace KEY=VALUE block shown when the platform owns the env. */
function CopyBlock({ keys }: { keys: readonly string[] }) {
  const text = keys.map((k) => `${k}=`).join("\n");
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-muted">
      <pre className="whitespace-pre p-4 font-mono text-xs leading-6 text-foreground select-text">
        {text}
      </pre>
    </div>
  );
}

/** External-env banner — shown on env-dependent steps that still need config. */
function ExternalEnvBanner() {
  return (
    <Alert className="border-info/40 bg-info/5 text-foreground [&>svg]:text-info">
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertDescription>
        This platform&apos;s env is managed externally (Vercel/Portainer). Add the keys
        below, then click <span className="font-medium">Re-check</span>.
      </AlertDescription>
    </Alert>
  );
}

/* ------------------------------------------------------------------ */
/* Layout + stepper                                                    */
/* ------------------------------------------------------------------ */

const STEP_LABELS = [
  "Installation Mode",
  "Admin account",
  "Site identity",
  "Storage",
  "Email (SMTP)",
  "Meta Pixel",
  "Finish",
] as const;

type StepState = "done" | "active" | "needs" | "todo";

function stepState(
  i: number,
  steps: WizardSteps,
  active: number,
  modeConfigured: boolean,
): StepState {
  if (i === active) return "active";
  const done =
    i === 0
      ? modeConfigured
      : i === 1
        ? steps.superadmin.configured
        : i === 2
          ? steps.site.configured
          : i === 3
            ? steps.storage.configured
            : i === 4
              ? steps.smtp.configured
              : i === 5
                ? steps.meta.configured || steps.meta.skipped
                : true;
  if (done) return "done";
  return i < active ? "todo" : "todo";
}

function Rail({
  steps,
  active,
  modeConfigured,
}: {
  steps: WizardSteps;
  active: number;
  modeConfigured: boolean;
}) {
  return (
    <nav aria-label="Setup progress" className="md:sticky md:top-8 md:self-start">
      <ol className="space-y-1">
        {STEP_LABELS.map((label, i) => {
          const state = stepState(i, steps, active, modeConfigured);
          const isActive = i === active;
          return (
            <li
              key={label}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                isActive ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  state === "done" && "bg-success text-success-foreground",
                  state === "active" && "bg-primary text-primary-foreground",
                  (state === "todo" || state === "needs") && "border border-border bg-background text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="flex-1 truncate">{label}</span>
              {isActive ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">Now</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Step panels                                                         */
/* ------------------------------------------------------------------ */

type PanelProps = {
  steps: WizardSteps;
  envWritable: boolean;
  onAdvance: () => void;
  refresh: () => Promise<WizardStatus | null>;
};

function CardHead({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <header className="border-b border-border px-6 py-5 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{step}</p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

const footer = "flex flex-wrap items-center justify-end gap-3 px-6 py-4 sm:px-8";

/* ---------------- Installation Mode ---------------- */

function ModePanel({
  selectedMode,
  onSelectMode,
  onAdvance,
}: {
  selectedMode: "demo" | "production";
  onSelectMode: (mode: "demo" | "production") => void;
  onAdvance: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await wizardSeedData({ mode: selectedMode });
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        step="Step 1 of 7"
        title="Choose installation mode"
        description="Select whether to initialize a clean production baseline or explore the full commercial showcase."
      />
      <CardContent className="space-y-6 px-6 py-6 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Production Option */}
          <div
            onClick={() => onSelectMode("production")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectMode("production");
              }
            }}
            role="button"
            tabIndex={0}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 p-5 transition-all text-left flex flex-col justify-between",
              selectedMode === "production"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-border/80 bg-card",
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                {selectedMode === "production" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="h-4 w-4" /> Selected
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground">Production Mode</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Clean slate designed for live agency operations.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Core categories & operational expense taxonomy</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Configured payment gateways & legal static pages</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="font-medium text-foreground">Zero sample packages or mock media</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2">
              <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 rounded px-2 py-0.5">
                Recommended for Live Agency
              </span>
            </div>
          </div>

          {/* Demo Option */}
          <div
            onClick={() => onSelectMode("demo")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectMode("demo");
              }
            }}
            role="button"
            tabIndex={0}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 p-5 transition-all text-left flex flex-col justify-between",
              selectedMode === "demo"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-border/80 bg-card",
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Cloud className="h-5 w-5" />
                </div>
                {selectedMode === "demo" && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="h-4 w-4" /> Selected
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-foreground">Demo & Showcase</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Full-featured agency operating system with sample data.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>6 Curated tour, Hajj & Umrah packages</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>5 Visa offerings & 4 e-Passport tiers</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Assets downloaded directly into application storage</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2">
              <span className="inline-block text-[11px] font-medium text-secondary-foreground bg-secondary rounded px-2 py-0.5">
                Recommended for Evaluation
              </span>
            </div>
          </div>
        </div>

        <ActionError message={error} />

        <div className="flex justify-end pt-2">
          <Button type="button" size="lg" onClick={handleContinue} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? "Initializing..." : "Continue"}
            {!busy && <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Admin account ---------------- */

const accountSchema = z.object({
  email: z.string().trim().min(1, "Enter an email address").email("Enter a valid email address"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  name: z.string().trim().min(1, "Enter the admin’s name"),
});
type AccountValues = z.infer<typeof accountSchema>;

function AccountPanel({ steps, onAdvance, refresh }: PanelProps) {
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: "", password: "", name: "" },
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (steps.superadmin.configured) {
    return (
      <Card>
        <CardHead step="Step 2 of 7" title="Admin account" description="The first sign-in for your team." />
        <CardContent className="flex items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-success text-success-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">Super admin account created</p>
              <p className="text-sm text-muted-foreground">You’ll sign in with it after setup.</p>
            </div>
          </div>
          <Button type="button" onClick={onAdvance} size="lg">
            Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const res = await wizardCreateSuperadmin(values);
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <Card>
      <CardHead
        step="Step 2 of 7"
        title="Admin account"
        description="Create the super admin who owns the system. Password must be at least 10 characters."
      />
      <CardContent className="space-y-5 px-6 py-6 sm:px-8">
        <Form {...form}>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="admin@tripmate.test"
                      className="h-11"
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Super Admin" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 10 characters"
                      className="h-11"
                      disabled={busy}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ActionError message={error} />
            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy ? "Creating…" : "Create admin account"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Site identity ---------------- */

const siteSchema = z.object({
  title: z.string().trim().min(1, "Enter a site name"),
  logoUrl: z.string().trim(),
  faviconUrl: z.string().trim(),
});
type SiteValues = z.infer<typeof siteSchema>;

function SitePanel({ steps, siteRow, onSiteSaved, onAdvance, refresh }: PanelProps & { siteRow: SiteSetting | null; onSiteSaved: (s: SiteSetting) => void }) {
  const [editing, setEditing] = useState(!steps.site.configured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SiteValues>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      title: siteRow?.title ?? "",
      logoUrl: siteRow?.logoUrl ?? "",
      faviconUrl: siteRow?.faviconUrl ?? "",
    },
  });

  if (steps.site.configured && !editing) {
    return (
      <Card>
        <CardHead step="Step 3 of 7" title="Site identity" description="Public name and branding." />
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div>
            <p className="text-sm font-medium">{siteRow?.title ?? "Site configured"}</p>
            <p className="text-sm text-muted-foreground">
              {siteRow?.logoUrl ? `Logo ${siteRow.logoUrl}` : "No logo set"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button type="button" onClick={onAdvance} size="lg">
              Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cancelEdit = () => setEditing(!steps.site.configured);

  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      const merged: SiteSetting = {
        title: values.title,
        logoUrl: values.logoUrl,
        faviconUrl: values.faviconUrl,
        searchEngineVisibility: siteRow?.searchEngineVisibility ?? true,
        phone: siteRow?.phone ?? "",
        email: siteRow?.email ?? "",
        address: siteRow?.address ?? "",
      };
      const res = await wizardSetSetting({ key: "site", value: merged });
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      onSiteSaved(merged);
      await refresh();
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <Card>
      <CardHead step="Step 3 of 7" title="Site identity" description="Name and branding shown across the public site." />
      <CardContent className="space-y-5 px-6 py-6 sm:px-8">
        <Form {...form}>
          <form onSubmit={submit} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site name</FormLabel>
                  <FormControl>
                    <Input placeholder="TripMate" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="/logo.svg" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormDescription>Absolute URL or a path like /logo.svg.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="faviconUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favicon URL</FormLabel>
                  <FormControl>
                    <Input placeholder="/favicon.svg" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ActionError message={error} />
            <div className={cn(footer, "justify-between !px-0 !py-0")}>
              {steps.site.configured ? (
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy ? "Saving…" : "Save & continue"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Storage ---------------- */

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

const r2Labels: Record<(typeof R2_ENV_KEYS)[number], { label: string; secret: boolean; hint?: string }> = {
  R2_ACCOUNT_ID: { label: "Account ID", secret: false },
  R2_ACCESS_KEY_ID: { label: "Access Key ID", secret: false },
  R2_SECRET_ACCESS_KEY: { label: "Secret Access Key", secret: true },
  R2_BUCKET_NAME: { label: "Bucket name", secret: false },
  R2_PUBLIC_URL: { label: "Public URL", secret: false, hint: "e.g. https://cdn.example.com" },
};

type R2Field = (typeof R2_ENV_KEYS)[number];

function StoragePanel({ steps, envWritable, onAdvance, refresh }: PanelProps) {
  const storage = steps.storage;
  const [driver, setDriver] = useState<"local" | "r2">(storage.driver ?? "local");
  const [creds, setCreds] = useState<Record<R2Field, string>>({
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "",
    R2_PUBLIC_URL: "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const setCred = (k: R2Field, v: string) => {
    setCreds((c) => ({ ...c, [k]: v }));
    setNotice(null);
  };

  // Radio selection only flips the local UI state — the driver is NEVER
  // persisted on selection. Under envWritable it lands on "Save & continue"
  // after a successful probe; under !envWritable it lands only once the
  // operator's externally-added keys pass the copy-block Re-check gate (so R2
  // is validated before it can read as configured). Local is zero-config, so
  // picking it just falls back to the local summary / save.
  const pickDriver = (next: "local" | "r2") => {
    setDriver(next);
    setNotice(null);
  };

  if (storage.configured && storage.driver !== "r2" && driver === "local") {
    // Configured local — most common seeded path.
    return (
      <Card>
        <CardHead step="Step 3 of 6" title="Storage" description="Where uploaded files live." />
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <HardDrive className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">Local disk</p>
              <p className="text-sm text-muted-foreground">Files are stored on the server’s disk.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setDriver("r2")}>
              Switch to R2
            </Button>
            <Button type="button" onClick={onAdvance} size="lg">
              Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const r2Configured = storage.configured && (storage.driver === "r2" || driver === "r2") && storage.r2Ready;

  // Probe ONLY: writes the submitted creds to env (the probe needs them in
  // process.env) and tests reachability. Never persists the driver and never
  // advances — the user reads the inline result before committing.
  const testConnection = async () => {
    setTesting(true);
    setNotice(null);
    try {
      await wizardWriteEnv(buildR2Env(creds));
      const res = await wizardTestR2();
      const err = resultError(res);
      if (err) {
        setNotice({ kind: "error", text: err });
        return;
      }
      setNotice({ kind: "success", text: "Connection OK — bucket is reachable." });
    } catch (e) {
      setNotice({ kind: "error", text: friendlyError(e) });
    } finally {
      setTesting(false);
    }
  };

  // Write creds → probe → persist driver → advance. A failed probe (ok:false)
  // stays on the step with the error shown and persists nothing.
  const saveAndContinue = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await wizardWriteEnv(buildR2Env(creds));
      const res = await wizardTestR2();
      const err = resultError(res);
      if (err) {
        setNotice({ kind: "error", text: err });
        return;
      }
      const save = await wizardSetSetting({ key: "storage", value: { driver: "r2" } });
      const saveErr = resultError(save);
      if (saveErr) {
        setNotice({ kind: "error", text: saveErr });
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setNotice({ kind: "error", text: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  // !envWritable: the driver choice is only persisted once the operator's
  // externally-added keys have made r2Ready true (the Continue gate below) —
  // R2 is validated before it can ever read as configured.
  const saveR2External = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await wizardSetSetting({ key: "storage", value: { driver: "r2" } });
      const err = resultError(res);
      if (err) {
        setNotice({ kind: "error", text: err });
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setNotice({ kind: "error", text: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const saveLocal = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await wizardSetSetting({ key: "storage", value: { driver: "local" } });
      const err = resultError(res);
      if (err) {
        setNotice({ kind: "error", text: err });
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setNotice({ kind: "error", text: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        step="Step 4 of 7"
        title="Storage"
        description={
          storage.configured && driver === "r2"
            ? "Files are stored in Cloudflare R2."
            : "Where uploaded files live."
        }
      />
      <CardContent className="space-y-6 px-6 py-6 sm:px-8">
        <RadioGroup
          value={driver}
          onValueChange={(v) => void pickDriver(v as "local" | "r2")}
          disabled={busy || testing}
          aria-label="Storage driver"
        >
          <div className="flex items-start gap-3 rounded-md border border-border p-4">
            <RadioGroupItem value="local" id="driver-local" className="mt-1" />
            <Label htmlFor="driver-local" className="font-normal">
              <span className="flex items-center gap-2 font-medium">
                <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Local disk
              </span>
              <span className="text-sm text-muted-foreground">Zero configuration — files live on this server.</span>
            </Label>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border p-4">
            <RadioGroupItem value="r2" id="driver-r2" className="mt-1" />
            <Label htmlFor="driver-r2" className="font-normal">
              <span className="flex items-center gap-2 font-medium">
                <Cloud className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Cloudflare R2
              </span>
              <span className="text-sm text-muted-foreground">Scalable object storage. Requires an API token.</span>
            </Label>
          </div>
        </RadioGroup>

        {driver === "local" ? (
          <div className="flex justify-end">
            <Button type="button" size="lg" onClick={saveLocal} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {busy ? "Saving…" : "Save & continue"}
            </Button>
          </div>
        ) : envWritable ? (
          <>
            <div className="space-y-4">
              {R2_ENV_KEYS.map((k) => (
                <LabeledInput
                  key={k}
                  id={`r2-${k.toLowerCase()}`}
                  label={r2Labels[k].label}
                  type={r2Labels[k].secret ? "password" : "text"}
                  autoComplete="off"
                  value={creds[k]}
                  onValueChange={(v) => setCred(k, v)}
                  disabled={busy || testing}
                  hint={r2Labels[k].hint}
                />
              ))}
            </div>
            <ActionError message={notice?.kind === "error" ? notice.text : null} />
            <ActionSuccess message={notice?.kind === "success" ? notice.text : null} />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={testConnection} disabled={testing || busy}>
                {testing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {testing ? "Testing…" : "Test connection"}
              </Button>
              <Button type="button" size="lg" onClick={saveAndContinue} disabled={busy || testing}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {busy ? "Saving…" : "Save & continue"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {!r2Configured ? (
              <>
                <ExternalEnvBanner />
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Add these keys to your platform env</p>
                  <CopyBlock keys={R2_ENV_KEYS} />
                </div>
                <div className="flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => void refresh()} disabled={busy}>
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Re-check
                  </Button>
                </div>
              </>
            ) : (
              <ActionSuccess message="R2 credentials detected." />
            )}
            <ActionError message={notice?.kind === "error" ? notice.text : null} />
            <div className="flex justify-end pt-2">
              <Button type="button" size="lg" onClick={saveR2External} disabled={!r2Configured || busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function buildR2Env(creds: Record<R2Field, string>): Record<string, string> {
  return {
    R2_ACCOUNT_ID: creds.R2_ACCOUNT_ID.trim(),
    R2_ACCESS_KEY_ID: creds.R2_ACCESS_KEY_ID.trim(),
    R2_SECRET_ACCESS_KEY: creds.R2_SECRET_ACCESS_KEY.trim(),
    R2_BUCKET_NAME: creds.R2_BUCKET_NAME.trim(),
    R2_PUBLIC_URL: creds.R2_PUBLIC_URL.trim(),
  };
}

/* ---------------- SMTP ---------------- */

const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;

const smtpSchema = z.object({
  host: z.string().trim(),
  port: z.coerce.number().int().min(1, "Port must be 1–65535").max(65535, "Port must be 1–65535"),
  user: z.string().trim(),
  pass: z.string(),
  from: z.string().trim(),
});
type SmtpValues = z.infer<typeof smtpSchema>;

function SmtpPanel({ steps, envWritable, onAdvance, refresh }: PanelProps) {
  const smtp = steps.smtp;
  const [editing, setEditing] = useState(!smtp.configured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const form = useForm<SmtpValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: { host: "", port: 587, user: "", pass: "", from: "" },
  });

  if (smtp.configured && !editing) {
    return (
      <Card>
        <CardHead step="Step 5 of 7" title="Email (SMTP)" description="Transactional mail like password resets." />
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div>
            <p className="text-sm font-medium">SMTP configured</p>
            <p className="text-sm text-muted-foreground">Email sending is enabled.</p>
          </div>
          <div className="flex items-center gap-2">
            {envWritable ? (
              <Button type="button" variant="outline" onClick={() => setEditing(true)}>
                Change
              </Button>
            ) : null}
            <Button type="button" onClick={onAdvance} size="lg">
              Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sendTest = async () => {
    const values = form.getValues();
    const valid = await form.trigger();
    if (!valid) return;
    if (!values.host.trim()) {
      setTestResult({ kind: "error", text: "Enter an SMTP host first." });
      return;
    }
    const to = testTo.trim();
    if (!to) {
      setTestResult({ kind: "error", text: "Enter a destination address for the test email." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await wizardTestSmtp({
        host: values.host,
        port: values.port,
        user: values.user || undefined,
        pass: values.pass || undefined,
        from: values.from || undefined,
        to,
      });
      const err = resultError(res);
      if (err) setTestResult({ kind: "error", text: err });
      else setTestResult({ kind: "success", text: `Test email sent to ${to}.` });
    } catch (e) {
      setTestResult({ kind: "error", text: friendlyError(e) });
    } finally {
      setTesting(false);
    }
  };

  const saveAndContinue = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    if (!values.host.trim()) {
      // Nothing configured — treat as skip.
      onAdvance();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await wizardWriteEnv({
        SMTP_HOST: values.host.trim(),
        SMTP_PORT: String(values.port),
        SMTP_USER: values.user.trim(),
        SMTP_PASS: values.pass,
        SMTP_FROM: values.from.trim(),
      });
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        step="Step 5 of 7"
        title="Email (SMTP)"
        description="Used for password resets and notifications. Optional — you can skip and add it later."
      />
      <CardContent className="space-y-5 px-6 py-6 sm:px-8">
        {!envWritable ? <ExternalEnvBanner /> : null}
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.example.com" className="h-11" disabled={busy || testing} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-11" disabled={busy || testing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" className="h-11" disabled={busy || testing} {...field} />
                  </FormControl>
                  <FormDescription>Optional for relays that need no auth.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="pass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" className="h-11" disabled={busy || testing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="no-reply@tripmate.test" className="h-11" disabled={busy || testing} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t border-border pt-4">
              {testOpen ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-56 flex-1">
                    <Label htmlFor="smtp-test-to" className="mb-1.5 block">
                      Send test to
                    </Label>
                    <Input
                      id="smtp-test-to"
                      type="email"
                      className="h-11"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder="you@example.com"
                      disabled={testing}
                    />
                  </div>
                  <Button type="button" onClick={sendTest} disabled={testing || busy}>
                    {testing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {testing ? "Sending…" : "Send test email"}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => setTestOpen(true)} disabled={busy}>
                  Send test email
                </Button>
              )}
              <ActionError message={testResult?.kind === "error" ? testResult.text : null} />
              <ActionSuccess message={testResult?.kind === "success" ? testResult.text : null} />
            </div>

            {!envWritable ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Add these keys to your platform env</p>
                <CopyBlock keys={SMTP_ENV_KEYS} />
              </div>
            ) : null}

            <ActionError message={error} />
            <div className={cn(footer, "justify-between !px-0 !py-0")}>
              <Button type="button" variant="ghost" onClick={onAdvance} disabled={busy}>
                Skip for now
              </Button>
              {envWritable ? (
                <Button type="button" size="lg" onClick={saveAndContinue} disabled={busy || testing}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {busy ? "Saving…" : "Save & continue"}
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => void refresh()} disabled={busy}>
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Re-check
                  </Button>
                  <Button type="button" size="lg" onClick={onAdvance} disabled={!smtp.configured || busy}>
                    Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Meta Pixel ---------------- */

const META_ENV_KEYS = ["META_PIXEL_ID", "META_CAPI_ACCESS_TOKEN"] as const;

const metaSchema = z.object({
  pixelId: z.string().trim(),
  capiToken: z.string().trim(),
});
type MetaValues = z.infer<typeof metaSchema>;

function MetaPanel({ steps, envWritable, onAdvance, refresh }: PanelProps) {
  const meta = steps.meta;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<MetaValues>({ resolver: zodResolver(metaSchema), defaultValues: { pixelId: "", capiToken: "" } });

  if (meta.configured || meta.skipped) {
    return (
      <Card>
        <CardHead step="Step 6 of 7" title="Meta Pixel & CAPI" description="Conversion tracking for the Meta ad account." />
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div>
            <p className="text-sm font-medium">{meta.configured ? "Meta Pixel configured" : "Step skipped"}</p>
            <p className="text-sm text-muted-foreground">
              {meta.configured ? "Conversion events are tracked." : "You can enable it later in admin settings."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={onAdvance} size="lg">
              Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const saveAndContinue = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    if (!envWritable) {
      // Copy-block flow: nothing to save server-side here; Re-check gates advance.
      onAdvance();
      return;
    }
    const payload: Record<string, string> = {};
    if (values.pixelId) payload.META_PIXEL_ID = values.pixelId;
    if (values.capiToken) payload.META_CAPI_ACCESS_TOKEN = values.capiToken;
    setBusy(true);
    setError(null);
    try {
      const res = await wizardWriteEnv(payload);
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await wizardSetSetting({ key: "meta", value: { skipped: true } });
      const err = resultError(res);
      if (err) {
        setError(err);
        return;
      }
      await refresh();
      onAdvance();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        step="Step 6 of 7"
        title="Meta Pixel & CAPI"
        description="Conversion tracking for the Meta ad account. Optional."
      />
      <CardContent className="space-y-5 px-6 py-6 sm:px-8">
        {!envWritable ? <ExternalEnvBanner /> : null}
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="pixelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pixel ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 123456789012345" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capiToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAPI access token</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" className="h-11" disabled={busy} {...field} />
                  </FormControl>
                  <FormDescription>Server-side conversion token. Keep private.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!envWritable ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Add these keys to your platform env</p>
                <CopyBlock keys={META_ENV_KEYS} />
              </div>
            ) : null}

            <ActionError message={error} />
            <div className={cn(footer, "justify-between !px-0 !py-0")}>
              <Button type="button" variant="ghost" onClick={skip} disabled={busy}>
                Skip this step
              </Button>
              {envWritable ? (
                <Button type="button" size="lg" onClick={saveAndContinue} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {busy ? "Saving…" : "Save & continue"}
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => void refresh()} disabled={busy}>
                    <Wrench className="h-4 w-4" aria-hidden="true" />
                    Re-check
                  </Button>
                  <Button type="button" size="lg" onClick={onAdvance} disabled={!meta.configured || busy}>
                    Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Finish ---------------- */

function DonePanel({
  steps,
  selectedMode,
  onFinish,
  finishBusy,
  error,
}: {
  steps: WizardSteps;
  selectedMode: "demo" | "production";
  onFinish: () => void;
  finishBusy: boolean;
  error: string | null;
}) {
  const rows = [
    {
      label: "Installation mode",
      state: selectedMode === "demo" ? ("Demo Showcase" as const) : ("Production Clean" as const),
    },
    { label: "Admin account", state: steps.superadmin.configured ? ("Configured" as const) : ("Not set" as const) },
    { label: "Site identity", state: steps.site.configured ? ("Configured" as const) : ("Not set" as const) },
    { label: "Storage", state: steps.storage.configured ? ("Configured" as const) : ("Not set" as const) },
    { label: "Email (SMTP)", optional: true, state: steps.smtp.configured ? ("Configured" as const) : ("Not set" as const) },
    { label: "Meta Pixel", optional: true, state: steps.meta.configured ? ("Configured" as const) : steps.meta.skipped ? ("Skipped" as const) : ("Not set" as const) },
  ];
  return (
    <Card>
      <CardHead
        step="Step 7 of 7"
        title="Almost done"
        description="Review what’s set up, then finish. Optional steps left blank can be added later in admin."
      />
      <CardContent className="space-y-4 px-6 py-6 sm:px-8">
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <span className="text-sm font-medium">
                {r.label}
                {r.optional ? <span className="ml-2 font-normal text-muted-foreground">(optional)</span> : null}
              </span>
              {r.state === "Configured" || r.state === "Demo Showcase" || r.state === "Production Clean" ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {r.state}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{r.state}</span>
              )}
            </li>
          ))}
        </ul>
        <ActionError message={error} />
        <div className="flex justify-end pt-2">
          <Button type="button" size="lg" onClick={onFinish} disabled={finishBusy}>
            {finishBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {finishBusy ? "Finishing…" : "Finish setup"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Success screen ---------------- */

function SuccessScreen() {
  return (
    <div className="mx-auto max-w-lg text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-success text-success-foreground">
        <Check className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Setup complete</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        TripMate is ready. Sign in with the admin account you just created to open the admin panel.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/login">
          Continue to login <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/* ---------------- Main component ---------------- */

export default function SetupWizard({
  initialStatus,
  initialSite,
}: {
  initialStatus: WizardStatus;
  initialSite: SiteSetting | null;
}) {
  const [status, setStatus] = useState<WizardStatus>(initialStatus);
  const [siteRow, setSiteRow] = useState<SiteSetting | null>(initialSite);
  const [finished, setFinished] = useState(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "production">("demo");
  const [modeConfigured, setModeConfigured] = useState<boolean>(
    initialStatus.steps.superadmin.configured && initialStatus.steps.site.configured,
  );
  const [active, setActive] = useState(() =>
    firstOpenStep(
      initialStatus.steps,
      initialStatus.steps.superadmin.configured && initialStatus.steps.site.configured,
    ),
  );

  const steps = status.steps;

  const refresh = async (): Promise<WizardStatus | null> => {
    try {
      const s = await wizardRecheck();
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  };

  const advance = () => setActive((i) => Math.min(STEP_LABELS.length - 1, i + 1));

  const onSiteSaved = (s: SiteSetting) => setSiteRow(s);

  const finish = async () => {
    setFinishBusy(true);
    setFinishError(null);
    try {
      const res = await wizardComplete({ mode });
      const err = resultError(res);
      if (err) {
        setFinishError(err);
        return;
      }
      setFinished(true);
    } catch (e) {
      setFinishError(friendlyError(e));
    } finally {
      setFinishBusy(false);
    }
  };

  if (finished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <SuccessScreen />
      </main>
    );
  }

  const panelProps: PanelProps = {
    steps,
    envWritable: status.envWritable,
    onAdvance: advance,
    refresh,
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Set up TripMate</h1>
          <p className="mt-1 text-sm text-muted-foreground">One-time configuration before your first sign-in.</p>
        </header>

        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="shrink-0 md:w-60">
            <Rail steps={steps} active={active} modeConfigured={modeConfigured} />
          </aside>
          <section className="min-w-0 flex-1" aria-label="Active setup step">
            {active === 0 ? (
              <ModePanel
                selectedMode={mode}
                onSelectMode={setMode}
                onAdvance={() => {
                  setModeConfigured(true);
                  advance();
                }}
              />
            ) : null}
            {active === 1 ? <AccountPanel {...panelProps} /> : null}
            {active === 2 ? <SitePanel {...panelProps} siteRow={siteRow} onSiteSaved={onSiteSaved} /> : null}
            {active === 3 ? <StoragePanel {...panelProps} /> : null}
            {active === 4 ? <SmtpPanel {...panelProps} /> : null}
            {active === 5 ? <MetaPanel {...panelProps} /> : null}
            {active === 6 ? (
              <DonePanel
                steps={steps}
                selectedMode={mode}
                onFinish={finish}
                finishBusy={finishBusy}
                error={finishError}
              />
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function firstOpenStep(steps: WizardSteps, modeConfigured: boolean): number {
  if (!modeConfigured) return 0;
  if (!steps.superadmin.configured) return 1;
  if (!steps.site.configured) return 2;
  if (!steps.storage.configured) return 3;
  if (!steps.smtp.configured) return 4;
  if (!steps.meta.configured && !steps.meta.skipped) return 5;
  return 6;
}
