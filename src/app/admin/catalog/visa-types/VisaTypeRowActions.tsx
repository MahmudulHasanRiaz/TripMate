"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Edit, Trash2, Loader2, Power } from "lucide-react";
import type { VisaType } from "@/modules/catalog/visa-service";
import {
  deleteVisaTypeAction,
  saveVisaTypeAction,
} from "@/modules/catalog/visa-actions";
import VisaTypeFormDialog from "./VisaTypeFormDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function VisaTypeRowActions({ type }: { type: VisaType }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = () => {
    startTransition(async () => {
      const res = await saveVisaTypeAction({
        id: type.id,
        name: type.name,
        slug: type.slug,
        description: type.description,
        icon: type.icon,
        sortOrder: type.sortOrder,
        isActive: !type.isActive,
      });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to delete visa type "${type.name}"? If any services reference it, deletion will be blocked.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteVisaTypeAction(type.id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2">
            <Edit className="size-4" /> Edit Type
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive} className="gap-2">
            <Power className="size-4" />
            {type.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Delete Type
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VisaTypeFormDialog
        type={type}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
