"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import type { PlatformRole } from "@/lib/admin/types";
import { updateUserRoleAction, deleteUserAction } from "@/app/admin/actions";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROLES: { value: PlatformRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "support", label: "Podrška" },
  { value: "finance_admin", label: "Financije" },
  { value: "user", label: "Korisnik" },
];

export default function UserRoleMenu({
  userId,
  current,
  userLabel,
}: {
  userId: string;
  current: PlatformRole;
  userLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function change(role: PlatformRole) {
    if (role === current) return;
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role);
      if (res.ok) {
        toast.success("Uloga ažurirana", `${userLabel} → ${labelFor(role)}`);
      } else {
        toast.error("Promjena nije uspjela", res.error);
      }
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.ok) {
        toast.success("Korisnik obrisan", userLabel);
        setDeleteOpen(false);
      } else {
        setDeleteError(res.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            Uloga
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Platformska uloga</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLES.map((r) => (
            <DropdownMenuItem key={r.value} onClick={() => change(r.value)}>
              <span className="flex-1">{r.label}</span>
              {r.value === current && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => { setDeleteError(null); setDeleteOpen(true); }}
          >
            Obriši korisnika
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!o) { setDeleteOpen(false); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši korisnika?</AlertDialogTitle>
            <AlertDialogDescription>
              Trajno briše <strong>{userLabel}</strong> i njihov auth račun.
              Karte ostaju u sustavu. Ova akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Brisanje…" : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function labelFor(role: PlatformRole) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}
