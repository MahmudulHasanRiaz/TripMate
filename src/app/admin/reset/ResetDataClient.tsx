"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, DatabaseBackup, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { runResetAndReinitialize, type ResetReinitResult } from "@/modules/settings/reset-actions";
import SectionHeader from "@/components/admin/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Danger Zone (§2.5): typed hard verification replaces window.confirm.
 * The operator must type the site title exactly to arm each wipe button.
 */
export default function ResetDataClient({ siteTitle }: { siteTitle: string }) {
  const router = useRouter();
  const [busyMode, setBusyMode] = useState<"demo" | "production" | null>(null);
  const [result, setResult] = useState<ResetReinitResult | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const armed = confirmText.trim() === siteTitle.trim();

  const run = (mode: "demo" | "production") => {
    if (!armed || busyMode !== null) return;
    setBusyMode(mode);
    setResult(null);
    startTransition(async () => {
      const res = await runResetAndReinitialize({ mode });
      setResult(res);
      setBusyMode(null);
      if (res.ok) {
        setConfirmText("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Reset & Re-initialize"
        description="Wipe all demo/live content and media, then seed the database fresh — useful when demo seeding produced imageless or incomplete data. Your admin account is kept."
        icon={Trash2}
        accent="var(--c-orange)"
      />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            Danger zone
          </CardTitle>
          <CardDescription className="text-xs">
            Deletes every business/content row and every stored media object from the connected
            storage (R2 or local), then runs the chosen seeder. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm" className="text-sm">
              Type <span className="font-mono font-semibold">{siteTitle}</span> to confirm
            </Label>
            <Input
              id="reset-confirm"
              type="text"
              autoComplete="off"
              placeholder={siteTitle}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="h-10 max-w-sm"
            />
            {!armed && confirmText.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Keep typing — the buttons arm only on an exact match.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              onClick={() => run("demo")}
              disabled={!armed || busyMode !== null}
              className="gap-2"
            >
              {busyMode === "demo" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <DatabaseBackup className="size-4" aria-hidden="true" />
              )}
              Reset &amp; seed Demo data
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => run("production")}
              disabled={!armed || busyMode !== null}
              className="gap-2 border-destructive/40 text-destructive hover:text-destructive"
            >
              {busyMode === "production" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              Reset to clean (Production)
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <p className="text-xs text-muted-foreground" role="status">
          Working — deleting rows and storage objects, then seeding. This can take a minute.
        </p>
      ) : null}

      {result ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.ok
              ? "border-success/30 bg-success/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role={result.ok ? "status" : "alert"}
        >
          {result.ok ? (
            <>
              <p className="font-semibold">
                Re-initialized with {result.seededMode === "demo" ? "Demo" : "Production"} data.
              </p>
              <p className="mt-1 text-xs">
                Media objects removed: {result.mediaRemoved}
                {result.mediaFailed > 0 ? ` · failed: ${result.mediaFailed}` : ""}. If you chose
                Demo and storage is R2, verify the R2 env vars (STORAGE_DRIVER=r2 + R2_*) were
                present while seeding — otherwise packages will be imageless.
              </p>
            </>
          ) : (
            <p>{result.error || "Reset failed."}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
