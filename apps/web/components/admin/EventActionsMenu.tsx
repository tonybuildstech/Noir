"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteEventAction } from "@/app/admin/actions";
import EventEditModal from "./EventEditModal";
import type { AdminEvent } from "@/lib/admin/types";

export default function EventActionsMenu({ event }: { event: AdminEvent }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteEventAction(event.id);
      if (result.ok) {
        toast.success("Event obrisan", event.name);
        setConfirmOpen(false);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending}>
            {isPending
              ? <Loader2 className="size-4 animate-spin" />
              : <MoreHorizontal className="size-4" />}
            <span className="sr-only">Akcije</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Uredi
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => { setDeleteError(null); setConfirmOpen(true); }}
          >
            Obriši
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EventEditModal
        event={event}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => { if (!o) { setConfirmOpen(false); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši event?</AlertDialogTitle>
            <AlertDialogDescription>
              Trajno briše <strong>{event.name}</strong> i sve njegove izvedbe. Akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Odustani</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Brisanje…" : "Obriši"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
