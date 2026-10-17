"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  ExternalLink,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  User,
  UserCheck,
} from "lucide-react";
import type { LeadListItem } from "@/modules/leads/service";
import type { LeadStatus } from "@/modules/leads/validation";
import { LEAD_STATUSES } from "@/modules/leads/validation";
import { assignLeadAction, changeLeadStatusAction } from "@/modules/leads/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type StaffUser = { id: string; name: string };

type LeadsListProps = {
  items: LeadListItem[];
  total: number;
  page: number;
  totalPages: number;
  staffUsers: StaffUser[];
  makePageParams: (delta: number) => string;
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

export default function LeadsList({
  items,
  page,
  totalPages,
  staffUsers,
  makePageParams,
}: LeadsListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    startTransition(async () => {
      const res = await changeLeadStatusAction({ id: leadId, status });
      if (res.ok) router.refresh();
    });
  };

  const handleAssign = (leadId: string, assigneeId: string | null) => {
    startTransition(async () => {
      const res = await assignLeadAction({ id: leadId, assigneeId });
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Landing Page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No leads found matching current filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((lead) => {
                const cleanPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
                const waPhone = lead.phone ? lead.phone.replace(/[^\d]/g, "") : "";

                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link
                        href={`/admin/leads/${lead.id}` as Route}
                        className="font-medium text-foreground hover:underline"
                      >
                        {lead.name.trim() || "Anonymous Inquiry"}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{lead.phone}</span>
                        {lead.email ? <span>&bull; {lead.email}</span> : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {lead.landingTitle || "Direct"}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={STATUS_BADGE_VARIANTS[lead.status]}
                        className="capitalize text-xs"
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3" aria-hidden="true" />
                        {lead.assignedToName || "Unassigned"}
                      </span>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cleanPhone ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <a href={`tel:${cleanPhone}`} title="Call phone">
                              <Phone className="size-3.5" aria-hidden="true" />
                            </a>
                          </Button>
                        ) : null}

                        {waPhone ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-success"
                          >
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-3.5" aria-hidden="true" />
                            </a>
                          </Button>
                        ) : null}

                        {lead.email ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <a href={`mailto:${lead.email}`} title="Send email">
                              <Mail className="size-3.5" aria-hidden="true" />
                            </a>
                          </Button>
                        ) : null}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7">
                              <MoreVertical className="size-3.5" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/leads/${lead.id}` as Route}>
                                <ExternalLink className="mr-2 size-3.5" aria-hidden="true" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-xs">
                                <ArrowRight className="mr-2 size-3.5" aria-hidden="true" />
                                Move Status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-40">
                                {LEAD_STATUSES.filter((s) => s !== lead.status).map((target) => (
                                  <DropdownMenuItem
                                    key={target}
                                    onClick={() => handleStatusChange(lead.id, target)}
                                    className="capitalize text-xs"
                                  >
                                    {target}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-xs">
                                <UserCheck className="mr-2 size-3.5" aria-hidden="true" />
                                Assign Staff
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-44">
                                <DropdownMenuItem
                                  onClick={() => handleAssign(lead.id, null)}
                                  className="text-xs text-muted-foreground"
                                >
                                  Unassigned
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {staffUsers.map((staff) => (
                                  <DropdownMenuItem
                                    key={staff.id}
                                    onClick={() => handleAssign(lead.id, staff.id)}
                                    className="text-xs"
                                  >
                                    {staff.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/admin/leads?${makePageParams(-1)}` as Route}>Previous</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            >
              <Link href={`/admin/leads?${makePageParams(1)}` as Route}>Next</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
