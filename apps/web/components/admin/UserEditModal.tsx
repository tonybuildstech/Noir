"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateUserAction } from "@/app/admin/actions";
import type { AdminUser, AdminUserUpdatePayload } from "@/lib/admin/types";

export default function UserEditModal({
  user,
  open,
  onClose,
}: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
}) {
  const [firstName, setFirstName]    = useState(user.first_name ?? "");
  const [lastName, setLastName]      = useState(user.last_name ?? "");
  const [city, setCity]              = useState(user.city ?? "");
  const [phone, setPhone]            = useState(user.phone ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setCity(user.city ?? "");
    setPhone(user.phone ?? "");
  }, [user.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const patch: AdminUserUpdatePayload = { first_name: firstName, last_name: lastName, city, phone };
    startTransition(async () => {
      const result = await updateUserAction(user.id, patch);
      if (result.ok) {
        toast.success("Korisnik ažuriran", `${firstName} ${lastName}`.trim());
        onClose();
      } else {
        toast.error("Ažuriranje nije uspjelo", result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Uredi korisnika</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="u-first">Ime</Label>
              <Input id="u-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-last">Prezime</Label>
              <Input id="u-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-city">Grad</Label>
            <Input id="u-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-phone">Telefon</Label>
            <Input id="u-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Spremanje…" : "Spremi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
