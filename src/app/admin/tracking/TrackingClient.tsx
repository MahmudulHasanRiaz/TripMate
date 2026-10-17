"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Code,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { MetaConfigStatus } from "@/modules/tracking/actions";
import { getMetaConfigStatus, saveMetaConfig } from "@/modules/tracking/actions";
import type {
  TrackingEventCounts,
  TrackingEventView,
} from "@/modules/tracking/service";
import { CAPIC_EVENT_NAMES } from "@/modules/tracking/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TrackingClientProps = {
  initialStatus: MetaConfigStatus | null;
  statusError?: string | null;
  events: TrackingEventView[];
  totalEvents: number;
  counts: TrackingEventCounts;
  currentPage: number;
  totalPages: number;
  currentEventName: string;
  currentCapiStatus: string;
  currentSearch: string;
};

const CAPI_STATUS_BADGES: Record<string, "success" | "destructive" | "secondary" | "info"> = {
  sent: "success",
  error: "destructive",
  meta_not_configured: "secondary",
  pending: "info",
};

export default function TrackingClient({
  initialStatus,
  statusError: initialStatusError,
  events,
  counts,
  currentPage,
  totalPages,
  currentEventName,
  currentCapiStatus,
  currentSearch,
}: TrackingClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Config State
  const [status, setStatus] = useState<MetaConfigStatus | null>(initialStatus);
  const [statusError, setStatusError] = useState<string | null>(initialStatusError || null);
  const [pixelId, setPixelId] = useState(initialStatus?.pixelId || "");
  const [capiAccessToken, setCapiAccessToken] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Non-writable copy-block state (Vercel/Portainer)
  const [copyBlock, setCopyBlock] = useState<{ instruction: string; lines: string[] } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Response payload inspection modal
  const [activeJsonPayload, setActiveJsonPayload] = useState<{
    title: string;
    json: Record<string, unknown> | null;
  } | null>(null);

  // Filter state
  const [search, setSearch] = useState(currentSearch);

  // Re-check config status
  const handleRecheckStatus = () => {
    setStatusError(null);
    startTransition(async () => {
      try {
        const res = await getMetaConfigStatus();
        if (res.ok) {
          setStatus(res.status);
          setPixelId(res.status.pixelId || "");
          setCopyBlock(null);
          setSaveSuccess("Configuration status refreshed!");
          setTimeout(() => setSaveSuccess(null), 3000);
        } else {
          setStatusError(res.error || "Failed to fetch status");
        }
      } catch {
        setStatusError("Server communication error");
      }
    });
  };

  // Save config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);
    setCopyBlock(null);

    startTransition(async () => {
      try {
        const res = await saveMetaConfig({
          pixelId,
          capiAccessToken,
          testEventCode,
        });

        if (res.ok) {
          if ("copyBlock" in res && res.copyBlock) {
            setCopyBlock(res.copyBlock);
            setSaveSuccess("Environment is read-only. Please apply the configuration variables below.");
          } else if ("status" in res && res.status) {
            setStatus(res.status);
            setPixelId(res.status.pixelId || "");
            setCapiAccessToken("");
            setTestEventCode("");
            setSaveSuccess("Meta tracking settings saved successfully!");
            setTimeout(() => setSaveSuccess(null), 3500);
          }
        } else {
          setSaveError(res.error || "Failed to save configuration");
        }
      } catch {
        setSaveError("An unexpected error occurred while saving.");
      }
    });
  };

  const handleCopyLines = async () => {
    if (!copyBlock || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(copyBlock.lines.join("\n"));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const navigateFilters = (nextSearch: string, nextEvent: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) params.set("search", nextSearch);
    else params.delete("search");

    if (nextEvent && nextEvent !== "all") params.set("eventName", nextEvent);
    else params.delete("eventName");

    if (nextStatus && nextStatus !== "all") params.set("capiStatus", nextStatus);
    else params.delete("capiStatus");

    params.delete("page");
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const makePageParams = (delta: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(Math.min(totalPages, Math.max(1, currentPage + delta))));
    return params.toString();
  };

  return (
    <div className="space-y-6">
      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pixel Status */}
        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meta Pixel ID
            </CardTitle>
            <Activity className="size-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="pt-0">
            {status?.pixelConfigured ? (
              <div className="space-y-1">
                <Badge variant="success" className="text-xs font-medium gap-1">
                  <Check className="size-3" aria-hidden="true" />
                  Active
                </Badge>
                <p className="font-mono tabular-nums text-xs text-foreground truncate mt-1">
                  {status.pixelId}
                </p>
              </div>
            ) : (
              <div>
                <Badge variant="secondary" className="text-xs font-medium">
                  Needs Config
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Browser tracking disabled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CAPI Token Status */}
        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CAPI Access Token
            </CardTitle>
            <Key className="size-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="pt-0">
            {status?.capiTokenSet ? (
              <div className="space-y-1">
                <Badge variant="success" className="text-xs font-medium gap-1">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  Configured
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Server CAPI active</p>
              </div>
            ) : (
              <div>
                <Badge variant="secondary" className="text-xs font-medium">
                  Not Configured
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Events logged as unconfigured</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Event Code Status */}
        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Test Event Code
            </CardTitle>
            <Code className="size-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="pt-0">
            {status?.testCodeSet ? (
              <div className="space-y-1">
                <Badge variant="info" className="text-xs font-medium">
                  Testing Active
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Payloads routed to Test Events</p>
              </div>
            ) : (
              <div>
                <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                  Production Mode
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Direct live delivery</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Writable Status */}
        <Card className="rounded-xl border border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Environment Storage
            </CardTitle>
            <Server className="size-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent className="pt-0">
            {status?.envWritable ? (
              <div className="space-y-1">
                <Badge variant="success" className="text-xs font-medium">
                  Direct File Write
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Local .env writable</p>
              </div>
            ) : (
              <div>
                <Badge variant="secondary" className="text-xs font-medium">
                  External / Read-Only
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Vercel / Container env</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {statusError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{statusError}</span>
        </div>
      ) : null}

      {/* Explainer Banner */}
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground flex items-start gap-3 shadow-xs">
        <Info className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">Server-Side Conversion Tracking (CAPI)</p>
          <p className="mt-1 text-xs leading-relaxed">
            When a visitor submits an inquiry on any published landing page, TripMate hashes the lead&apos;s contact details and immediately registers a <strong>Lead</strong> event with Meta Conversions API from the server. This bypasses ad-blockers and iOS tracking limitations.
          </p>
        </div>
      </div>

      {/* Configuration Form Card */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Meta API Configuration</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Manage your Meta Pixel ID and Conversions API system user access token.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRecheckStatus}
              disabled={isPending}
              className="h-9 px-3.5 gap-1.5 text-xs font-semibold rounded-lg"
            >
              <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} aria-hidden="true" />
              Re-check Status
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {saveSuccess ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>{saveSuccess}</span>
            </div>
          ) : null}

          {saveError ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{saveError}</span>
            </div>
          ) : null}

          {/* Copy block for external / non-writable environments */}
          {copyBlock ? (
            <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {copyBlock.instruction || "Copy and paste these environment variables:"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLines}
                  className="h-8 px-3 text-xs gap-1 rounded-md"
                >
                  {copiedCode ? (
                    <>
                      <Check className="size-3 text-success" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" aria-hidden="true" />
                      Copy Lines
                    </>
                  )}
                </Button>
              </div>
              <pre className="rounded-lg bg-card p-3 font-mono text-xs text-foreground overflow-x-auto border border-border">
                {copyBlock.lines.join("\n")}
              </pre>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleRecheckStatus}
                  className="h-9 px-3.5 text-xs font-semibold rounded-lg"
                >
                  I&apos;ve added them — Re-check
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="meta-pixel-id" className="text-[13px] font-medium text-foreground">
                  Meta Pixel ID
                </Label>
                <Input
                  id="meta-pixel-id"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="h-10 text-sm rounded-lg font-mono border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to remove or disable Pixel tracking.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-test-code" className="text-[13px] font-medium text-foreground">
                  Test Event Code (Optional)
                </Label>
                <Input
                  id="meta-test-code"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                  placeholder="e.g. TEST12345"
                  className="h-10 text-sm rounded-lg font-mono border-border"
                />
                <p className="text-xs text-muted-foreground">
                  From Meta Events Manager &rarr; Test Events tab. Leave empty in production.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-capi-token" className="text-[13px] font-medium text-foreground">
                  CAPI Access Token
                </Label>
                {status?.capiTokenSet ? (
                  <span className="text-xs text-success font-medium flex items-center gap-1">
                    <Check className="size-3" aria-hidden="true" />
                    Token securely configured
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <Input
                  id="meta-capi-token"
                  type={showToken ? "text" : "password"}
                  value={capiAccessToken}
                  onChange={(e) => setCapiAccessToken(e.target.value)}
                  placeholder={status?.capiTokenSet ? "Enter new token to replace..." : "EAAB..."}
                  className="h-10 text-sm rounded-lg pr-10 font-mono border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-0 top-0 bottom-0 size-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">Toggle token visibility</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tokens are stored securely in environment storage and never echoed back to the browser.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending} className="h-10 px-5 text-sm font-semibold rounded-lg">
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Save Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Events Audit Log Table Card */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Tracking Events Log</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Audit record of server CAPI and browser interactions.
              </CardDescription>
            </div>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-6 text-xs font-medium tabular-nums">
                Total: {counts.total}
              </Badge>
              {counts.byStatus.map((st) => (
                <Badge
                  key={String(st.status)}
                  variant={CAPI_STATUS_BADGES[st.status || ""] || "secondary"}
                  className="h-6 text-xs font-medium capitalize tabular-nums"
                >
                  {st.status || "unrecorded"}: {st.count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Table Filters */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search source URL or identifiers..."
                className="pl-9 h-10 text-sm rounded-lg border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    navigateFilters(search.trim(), currentEventName, currentCapiStatus);
                  }
                }}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={currentEventName || "all"}
                onValueChange={(val) => navigateFilters(search.trim(), val, currentCapiStatus)}
              >
                <SelectTrigger className="h-10 text-sm rounded-lg border-border">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All events</SelectItem>
                  {CAPIC_EVENT_NAMES.map((en) => (
                    <SelectItem key={en} value={en} className="text-sm">
                      {en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={currentCapiStatus || "all"}
                onValueChange={(val) => navigateFilters(search.trim(), currentEventName, val)}
              >
                <SelectTrigger className="h-10 text-sm rounded-lg border-border">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All CAPI statuses</SelectItem>
                  <SelectItem value="sent" className="text-sm">Sent (ok)</SelectItem>
                  <SelectItem value="meta_not_configured" className="text-sm">Meta Not Configured</SelectItem>
                  <SelectItem value="error" className="text-sm">Error</SelectItem>
                  <SelectItem value="pending" className="text-sm">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source URL</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CAPI Status</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground border border-border">
                          <Activity className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">No tracking events found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            No events logged yet. Submitting a landing page form will record Lead events here.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt) => (
                    <TableRow key={evt.id} className="min-h-[52px] border-border hover:bg-muted/40 transition-colors">
                      <TableCell className="px-4 py-3.5">
                        <Badge variant="outline" className="font-mono text-xs font-medium">
                          {evt.eventName}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 max-w-xs truncate text-xs font-mono text-muted-foreground">
                        {evt.sourceUrl || "—"}
                      </TableCell>

                      <TableCell className="px-4 py-3.5">
                        <Badge
                          variant={CAPI_STATUS_BADGES[evt.capiStatus || ""] || "secondary"}
                          className="capitalize text-xs font-medium"
                        >
                          {evt.capiStatus || "unrecorded"}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-xs font-mono tabular-nums text-muted-foreground">
                        {new Date(evt.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveJsonPayload({
                              title: `${evt.eventName} CAPI Response`,
                              json: evt.capiResponse || evt.fbParams || null,
                            })
                          }
                          className="h-8 px-2.5 text-xs font-mono text-muted-foreground hover:text-foreground rounded-md"
                        >
                          View JSON
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm tabular-nums text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  className={cn("h-9 min-h-[36px] px-3.5 text-sm font-medium rounded-lg", currentPage <= 1 && "pointer-events-none opacity-50")}
                >
                  <Link href={`/admin/tracking?${makePageParams(-1)}` as Route}>Previous</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  className={cn("h-9 min-h-[36px] px-3.5 text-sm font-medium rounded-lg", currentPage >= totalPages && "pointer-events-none opacity-50")}
                >
                  <Link href={`/admin/tracking?${makePageParams(1)}` as Route}>Next</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* JSON Payload Inspection Dialog */}
      <Dialog open={activeJsonPayload !== null} onOpenChange={() => setActiveJsonPayload(null)}>
        <DialogContent className="max-w-xl rounded-xl border border-border bg-card shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground font-mono">
              {activeJsonPayload?.title || "Event Payload"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Raw response returned from Meta Conversions API or internal logger.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-muted/40 p-4 font-mono text-xs text-foreground border border-border">
            {activeJsonPayload?.json
              ? JSON.stringify(activeJsonPayload.json, null, 2)
              : "No response payload stored for this event."}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
