"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  PlusCircle,
  Save,
  UserCheck,
} from "lucide-react";
import type { LeadDetail } from "@/modules/leads/service";
import type { LeadStatus } from "@/modules/leads/validation";
import { LEAD_STATUSES } from "@/modules/leads/validation";
import {
  assignLeadAction,
  changeLeadStatusAction,
  convertLeadAction,
  logFollowUpAction,
  updateLeadNoteAction,
} from "@/modules/leads/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type StaffUser = { id: string; name: string };

type LeadDetailClientProps = {
  lead: LeadDetail;
  staffUsers: StaffUser[];
};

const STATUS_BADGE_VARIANTS: Record<
  LeadStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  new: "secondary",
  contacted: "info",
  qualified: "default",
  negotiating: "warning",
  follow_up: "info",
  converted: "success",
  lost: "destructive",
};

export default function LeadDetailClient({ lead, staffUsers }: LeadDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status);
  const [currentAssignee, setCurrentAssignee] = useState<string | null>(lead.assignedTo);
  const [isConverted, setIsConverted] = useState<boolean>(Boolean(lead.convertedOrderId || lead.status === "converted"));
  const [noteText, setNoteText] = useState(lead.notes || "");
  const [noteNotice, setNoteNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotice, setFollowUpNotice] = useState<string | null>(null);

  const cleanPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
  const waPhone = lead.phone ? lead.phone.replace(/[^\d]/g, "") : "";

  // Change status
  const handleStatusChange = (newStatus: LeadStatus) => {
    setErrorMessage(null);
    setCurrentStatus(newStatus);
    startTransition(async () => {
      try {
        const res = await changeLeadStatusAction({ id: lead.id, status: newStatus });
        if (res.ok) router.refresh();
        else {
          setCurrentStatus(lead.status);
          setErrorMessage(res.error || "Failed to update lead status.");
        }
      } catch {
        setCurrentStatus(lead.status);
        setErrorMessage("An unexpected error occurred while updating status.");
      }
    });
  };

  // Change assignee
  const handleAssignChange = (newAssigneeId: string) => {
    setErrorMessage(null);
    const assigneeId = newAssigneeId === "unassigned" ? null : newAssigneeId;
    setCurrentAssignee(assigneeId);
    startTransition(async () => {
      try {
        const res = await assignLeadAction({ id: lead.id, assigneeId });
        if (res.ok) router.refresh();
        else {
          setCurrentAssignee(lead.assignedTo);
          setErrorMessage(res.error || "Failed to assign lead.");
        }
      } catch {
        setCurrentAssignee(lead.assignedTo);
        setErrorMessage("An unexpected error occurred while assigning lead.");
      }
    });
  };

  // Convert lead
  const handleConvertLead = () => {
    setErrorMessage(null);
    setIsConverted(true);
    setCurrentStatus("converted");
    startTransition(async () => {
      try {
        const res = await convertLeadAction({ id: lead.id });
        if (res.ok) router.refresh();
        else {
          setIsConverted(Boolean(lead.convertedOrderId || lead.status === "converted"));
          setCurrentStatus(lead.status);
          setErrorMessage(res.error || "Failed to convert lead.");
        }
      } catch {
        setIsConverted(Boolean(lead.convertedOrderId || lead.status === "converted"));
        setCurrentStatus(lead.status);
        setErrorMessage("An unexpected error occurred while converting lead.");
      }
    });
  };

  // Log follow-up (§2.6): increments count, sets next date, timeline event.
  const handleLogFollowUp = () => {
    setErrorMessage(null);
    setFollowUpNotice(null);
    startTransition(async () => {
      try {
        const res = await logFollowUpAction({
          id: lead.id,
          note: followUpNote,
          nextFollowUpAt: followUpDate ? new Date(followUpDate).toISOString() : null,
        });
        if (res.ok) {
          setFollowUpNotice("Follow-up logged.");
          setFollowUpNote("");
          setFollowUpDate("");
          setTimeout(() => setFollowUpNotice(null), 2500);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to log follow-up.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while logging follow-up.");
      }
    });
  };

  // Save internal note
  const handleSaveNote = () => {
    setErrorMessage(null);
    setNoteNotice(null);
    startTransition(async () => {
      try {
        const res = await updateLeadNoteAction({ id: lead.id, note: noteText });
        if (res.ok) {
          setNoteNotice("Note saved.");
          setTimeout(() => setNoteNotice(null), 2500);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to save note.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving note.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-10 rounded-lg">
            <Link href={"/admin/leads" as Route} aria-label="Back to leads">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {lead.name.trim() || "Anonymous Inquiry"}
              </h2>
              <Badge variant={STATUS_BADGE_VARIANTS[currentStatus]} className="capitalize text-xs font-medium px-2.5 py-0.5">
                {currentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted on{" "}
              <span className="tabular-nums">
                {new Date(lead.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Contact Buttons */}
        <div className="flex items-center gap-2">
          {cleanPhone ? (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-lg px-3.5 gap-1.5 text-sm font-medium shadow-xs">
              <a href={`tel:${cleanPhone}`}>
                <Phone className="size-4 text-primary" aria-hidden="true" />
                Call
              </a>
            </Button>
          ) : null}

          {waPhone ? (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-lg px-3.5 gap-1.5 text-sm font-medium shadow-xs">
              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4 text-success" aria-hidden="true" />
                WhatsApp
              </a>
            </Button>
          ) : null}

          {lead.email ? (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-lg px-3.5 gap-1.5 text-sm font-medium shadow-xs">
              <a href={`mailto:${lead.email}`}>
                <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                Email
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage ? (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Profile + Submitted Data */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Contact &amp; Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Full Name</Label>
                  <p className="mt-1 font-medium text-foreground text-sm">
                    {lead.name || "—"}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Phone Number</Label>
                  <p className="mt-1 font-mono font-medium text-foreground text-sm">
                    {lead.phone || "—"}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Email</Label>
                  <p className="mt-1 font-medium text-foreground">
                    {lead.email || "—"}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Source / Campaign</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {lead.source}
                    </Badge>
                    {lead.landingTitle ? (
                      <span className="font-medium text-foreground truncate">
                        {lead.landingTitle}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {lead.message ? (
                <div className="border-t border-border/60 pt-4">
                  <Label className="text-[11px] text-muted-foreground">Message / Request</Label>
                  <p className="mt-1.5 rounded-lg bg-secondary/40 p-3 text-foreground leading-relaxed">
                    {lead.message}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Form Data Rows Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                Submitted Form Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.formData && Object.keys(lead.formData).length > 0 ? (
                <div className="divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden">
                  {Object.entries(lead.formData).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 text-xs bg-card hover:bg-muted/20"
                    >
                      <span className="font-mono text-muted-foreground uppercase tracking-wider text-[11px]">
                        {key.replace(/[_-]/g, " ")}
                      </span>
                      <span className="font-medium text-foreground sm:text-right max-w-md break-words">
                        {String(value) || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4">No additional form data submitted.</p>
              )}
            </CardContent>
          </Card>

          {/* Event Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="size-4 text-primary" aria-hidden="true" />
                Audit Timeline ({lead.events.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No timeline events recorded.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {lead.events.map((event) => {
                    let EventIcon = PlusCircle;
                    let iconColor = "text-muted-foreground";
                    let eventLabel = event.type.replace(/_/g, " ");
                    let payloadText: string | null = null;

                    if (event.type === "created") {
                      EventIcon = PlusCircle;
                      iconColor = "text-primary";
                      eventLabel = "Lead Created";
                      const src =
                        event.payload && "source" in event.payload
                          ? String(event.payload.source)
                          : lead.source;
                      payloadText = `Created from source: ${src}`;
                    } else if (event.type === "assigned") {
                      EventIcon = UserCheck;
                      iconColor = "text-info";
                      eventLabel = "Lead Assigned";
                      const name =
                        event.payload && "assigneeName" in event.payload && event.payload.assigneeName
                          ? String(event.payload.assigneeName)
                          : null;
                      payloadText = name ? `Assigned to ${name}` : "Unassigned";
                    } else if (event.type === "status" || event.type === "status_change") {
                      EventIcon = ArrowRight;
                      iconColor = "text-warning";
                      eventLabel = "Status Changed";
                      const to = event.payload && "to" in event.payload ? String(event.payload.to) : "";
                      const from = event.payload && "from" in event.payload ? String(event.payload.from) : "";
                      const note = event.payload && "note" in event.payload ? String(event.payload.note) : "";
                      payloadText = to
                        ? `Status changed to ${to}${from ? ` (from ${from})` : ""}${note ? ` — ${note}` : ""}`
                        : "Status updated";
                    } else if (event.type === "note") {
                      EventIcon = MessageSquare;
                      iconColor = "text-accent-text";
                      eventLabel = "Internal Note";
                      payloadText =
                        event.payload && "note" in event.payload ? String(event.payload.note) : "";
                    } else if (event.type === "follow_up") {
                      EventIcon = Phone;
                      iconColor = "text-info";
                      eventLabel = `Follow-up${event.payload && "count" in event.payload ? ` #${String(event.payload.count)}` : ""}`;
                      payloadText =
                        event.payload && "note" in event.payload ? String(event.payload.note) : "";
                    } else if (event.type === "converted") {
                      EventIcon = CheckCircle2;
                      iconColor = "text-success";
                      eventLabel = "Lead Converted";
                      const from = event.payload && "from" in event.payload ? String(event.payload.from) : "";
                      payloadText = from
                        ? `Converted to booking (from ${from})`
                        : "Converted to booking";
                    } else if (event.payload) {
                      payloadText =
                        typeof event.payload === "string"
                          ? event.payload
                          : JSON.stringify(event.payload);
                    }

                    return (
                      <div key={event.id} className="relative">
                        <span
                          className={cn(
                            "absolute -left-[30px] top-0 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-xs",
                            iconColor,
                          )}
                        >
                          <EventIcon className="size-3" aria-hidden="true" />
                        </span>

                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground capitalize">
                              {eventLabel}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {event.actorName || "System / Guest"}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(event.createdAt).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {payloadText ? (
                            <p className="mt-1.5 rounded-md bg-secondary/30 p-2.5 text-foreground leading-relaxed">
                              {payloadText}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sticky Column (4 cols): Actions, Assignee, Notes */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Lead Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Status Select */}
              <div>
                <Label className="text-[13px] font-medium text-foreground">Pipeline Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(val: LeadStatus) => handleStatusChange(val)}
                  disabled={isPending}
                >
                  <SelectTrigger className="mt-1.5 h-10 w-full rounded-lg text-sm border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize text-sm">
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Select */}
              <div>
                <Label className="text-[13px] font-medium text-foreground">Assigned Staff</Label>
                <Select
                  value={currentAssignee || "unassigned"}
                  onValueChange={handleAssignChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="mt-1.5 h-10 w-full rounded-lg text-sm border-border">
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="text-sm text-muted-foreground">
                      Unassigned
                    </SelectItem>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id} className="text-sm">
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Convert Lead to Booking */}
              <div className="space-y-2.5 border-t border-border pt-4">
                <Button asChild className="h-10 w-full rounded-lg gap-2 text-sm font-semibold shadow-xs">
                  <Link href={`/admin/quotations?convertLead=${lead.id}` as Route}>
                    <FileText className="size-4" aria-hidden="true" />
                    Convert to Quotation
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={isConverted || isPending}
                      className={cn(
                        "w-full h-10 rounded-lg text-sm font-semibold gap-2 shadow-xs transition-all",
                        isConverted
                          ? "bg-success/20 text-success hover:bg-success/20 cursor-default"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {isConverted ? "Lead Converted" : "Convert to Booking"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Convert this lead to a booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the lead as converted. The lead will be cleared from active
                        inquiry columns on the board and can be associated with an order.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="h-10 rounded-lg">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConvertLead}
                        className="h-10 rounded-lg bg-primary text-primary-foreground font-semibold"
                      >
                        Confirm conversion
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Internal Operator Notes */}
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Internal Notes</span>
                {noteNotice ? (
                  <span className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {noteNotice}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log internal discussions, requirements, or follow-up notes..."
                rows={5}
                disabled={isPending}
                className="text-sm rounded-lg border-border resize-none"
              />

              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleSaveNote}
                className="w-full h-10 rounded-lg text-sm font-semibold gap-2 shadow-xs"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                Save Internal Note
              </Button>
            </CardContent>
          </Card>

          {/* Follow-ups (§2.6) */}
          <Card className="rounded-xl border border-border bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Follow-ups{lead.followUpCount > 0 ? ` (${lead.followUpCount})` : ""}</span>
                {followUpNotice ? (
                  <span className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {followUpNotice}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.nextFollowUpAt ? (
                <p className="text-sm text-muted-foreground">
                  Next follow-up:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {new Date(lead.nextFollowUpAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </p>
              ) : null}
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="What was discussed? Next step..."
                rows={3}
                disabled={isPending}
                className="text-sm rounded-lg border-border resize-none"
              />
              <div>
                <Label className="text-[13px] font-medium text-foreground">Next follow-up date</Label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  disabled={isPending}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isPending || !followUpNote.trim()}
                onClick={handleLogFollowUp}
                className="w-full h-10 rounded-lg text-sm font-semibold gap-2 shadow-xs"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Phone className="size-4" aria-hidden="true" />
                )}
                Log Follow-up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
