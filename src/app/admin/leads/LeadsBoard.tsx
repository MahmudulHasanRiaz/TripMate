"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  User,
  UserCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import type { LeadBoardCounts, LeadListItem } from "@/modules/leads/service";
import type { LeadStatus } from "@/modules/leads/validation";
import { LEAD_STATUSES } from "@/modules/leads/validation";
import {
  assignLeadAction,
  changeLeadStatusAction,
  convertLeadAction,
} from "@/modules/leads/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type StaffUser = { id: string; name: string };

type LeadsBoardProps = {
  initialItems: LeadListItem[];
  counts: LeadBoardCounts;
  staffUsers: StaffUser[];
};

const STATUS_TITLES: Record<LeadStatus, string> = {
  new: "New Inquiries",
  contacted: "Contacted",
  qualified: "Qualified",
  negotiating: "Negotiating",
  follow_up: "Follow-up",
  converted: "Converted",
  lost: "Lost / Closed",
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

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - new Date(date).getTime());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function LeadsBoard({ initialItems, counts, staffUsers }: LeadsBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<LeadListItem[]>(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group items by status
  const itemsByStatus: Record<LeadStatus, LeadListItem[]> = {
    new: [],
    contacted: [],
    qualified: [],
    negotiating: [],
    follow_up: [],
    converted: [],
    lost: [],
  };

  for (const item of items) {
    if (itemsByStatus[item.status]) {
      itemsByStatus[item.status].push(item);
    }
  }

  // Move status handler (optimistic with snapshot rollback)
  const handleStatusChange = (leadId: string, targetStatus: LeadStatus) => {
    setErrorMessage(null);
    let snapshot: LeadListItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((item) => (item.id === leadId ? { ...item, status: targetStatus } : item));
    });

    // Server mutation
    startTransition(async () => {
      try {
        const res = await changeLeadStatusAction({ id: leadId, status: targetStatus });
        if (res.ok) {
          router.refresh();
        } else {
          setItems(snapshot);
          setErrorMessage(res.error || "Failed to update lead status.");
        }
      } catch {
        setItems(snapshot);
        setErrorMessage("An unexpected error occurred while moving lead.");
      }
    });
  };

  // Assign handler (optimistic with snapshot rollback)
  const handleAssign = (leadId: string, assigneeId: string | null, assigneeName: string | null) => {
    setErrorMessage(null);
    let snapshot: LeadListItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((item) => (item.id === leadId ? { ...item, assignedToName: assigneeName } : item));
    });

    startTransition(async () => {
      try {
        const res = await assignLeadAction({ id: leadId, assigneeId });
        if (res.ok) {
          router.refresh();
        } else {
          setItems(snapshot);
          setErrorMessage(res.error || "Failed to assign lead.");
        }
      } catch {
        setItems(snapshot);
        setErrorMessage("An unexpected error occurred while assigning lead.");
      }
    });
  };

  // Convert handler (optimistic with snapshot rollback)
  const handleConvert = (leadId: string) => {
    setErrorMessage(null);
    let snapshot: LeadListItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((item) => (item.id === leadId ? { ...item, status: "converted" } : item));
    });

    startTransition(async () => {
      try {
        const res = await convertLeadAction({ id: leadId });
        if (res.ok) {
          router.refresh();
        } else {
          setItems(snapshot);
          setErrorMessage(res.error || "Failed to convert lead.");
        }
      } catch {
        setItems(snapshot);
        setErrorMessage("An unexpected error occurred while converting lead.");
      }
    });
  };

  // Drag & drop handlers (native HTML5, optional enhancement)
  const onDragStart = (id: string) => {
    setDraggedId(id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (targetStatus: LeadStatus) => {
    if (draggedId) {
      handleStatusChange(draggedId, targetStatus);
      setDraggedId(null);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-4 pb-6 pt-1">
        {LEAD_STATUSES.map((status) => {
          const columnItems = itemsByStatus[status] || [];
          const count = counts[status] ?? columnItems.length;

          return (
            <div
              key={status}
              onDragOver={onDragOver}
              onDrop={() => onDrop(status)}
              className="flex w-full md:w-80 shrink-0 flex-col rounded-xl border border-border bg-secondary/20 p-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_BADGE_VARIANTS[status]}
                    className="size-2.5 rounded-full p-0"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {STATUS_TITLES[status]}
                  </span>
                </div>
                <span className="flex size-5 items-center justify-center rounded-full bg-background text-xs font-semibold tabular-nums text-muted-foreground shadow-xs">
                  {count}
                </span>
              </div>

              {/* Column Card List */}
              <div className="flex-1 space-y-3 min-h-[220px]">
                {columnItems.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 p-4 text-center">
                    <User className="size-5 text-muted-foreground/60" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">No leads in this stage</p>
                  </div>
                ) : (
                  columnItems.map((lead) => {
                    const cleanPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
                    const waPhone = lead.phone ? lead.phone.replace(/[^\d]/g, "") : "";

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => onDragStart(lead.id)}
                        className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing"
                      >
                        <div>
                          {/* Top card row: Name + Overflow menu */}
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/admin/leads/${lead.id}` as Route}
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {lead.name.trim() || "Anonymous Inquiry"}
                            </Link>

                            {/* Per-card menu: Move To + Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Lead actions"
                                  className="size-11 min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="size-4" aria-hidden="true" />
                                  <span className="sr-only">Lead actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/leads/${lead.id}` as Route}>
                                    <ExternalLink className="mr-2 size-3.5" aria-hidden="true" />
                                    View Lead Details
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* Move to submenu */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="text-xs">
                                    <ArrowRight className="mr-2 size-3.5" aria-hidden="true" />
                                    Move to Status
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-44">
                                    {LEAD_STATUSES.filter((s) => s !== lead.status).map((target) => (
                                      <DropdownMenuItem
                                        key={target}
                                        onClick={() => handleStatusChange(lead.id, target)}
                                        className="capitalize text-xs"
                                      >
                                        {STATUS_TITLES[target]}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                {/* Assign submenu */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="text-xs">
                                    <UserCheck className="mr-2 size-3.5" aria-hidden="true" />
                                    Assign Staff
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-44">
                                    <DropdownMenuItem
                                      onClick={() => handleAssign(lead.id, null, null)}
                                      className="text-xs text-muted-foreground"
                                    >
                                      Unassigned
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {staffUsers.map((staff) => (
                                      <DropdownMenuItem
                                        key={staff.id}
                                        onClick={() => handleAssign(lead.id, staff.id, staff.name)}
                                        className="text-xs"
                                      >
                                        {staff.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                {lead.status !== "converted" ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleConvert(lead.id)}
                                      className="text-xs text-success focus:text-success"
                                    >
                                      <CheckCircle2 className="mr-2 size-3.5" aria-hidden="true" />
                                      Mark as Converted
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Landing Title and Source Tag */}
                          {lead.landingTitle ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                              {lead.landingTitle}
                            </p>
                          ) : null}

                          {/* Phone & Quick Contact Buttons */}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                              <Phone className="size-3 text-muted-foreground" aria-hidden="true" />
                              <span>{lead.phone || "No phone"}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {cleanPhone ? (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Call lead phone"
                                  title="Call phone"
                                  className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  <a href={`tel:${cleanPhone}`}>
                                    <Phone className="size-4" aria-hidden="true" />
                                  </a>
                                </Button>
                              ) : null}

                              {waPhone ? (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Chat on WhatsApp"
                                  title="Chat on WhatsApp"
                                  className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-success"
                                >
                                  <a
                                    href={`https://wa.me/${waPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle className="size-4" aria-hidden="true" />
                                  </a>
                                </Button>
                              ) : null}

                              {lead.email ? (
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Send email"
                                  title="Send email"
                                  className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  <a href={`mailto:${lead.email}`}>
                                    <Mail className="size-4" aria-hidden="true" />
                                  </a>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                      {/* Footer: Time + Assignee Chip */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" aria-hidden="true" />
                          {formatRelativeTime(lead.createdAt)}
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[10px]",
                            lead.assignedToName
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <User className="size-2.5" aria-hidden="true" />
                          {lead.assignedToName || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
