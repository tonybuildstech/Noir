"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createEventAction } from "@/app/admin/actions";
import type { AdminOrganization, AdminEventCreatePayload, EventStatus } from "@/lib/admin/types";

function slugify(str: string): string {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY: AdminEventCreatePayload = {
  name: "", slug: "", description: "", cover_image_url: "",
  is_free: false, status: "draft", organizer_org_id: "",
  event_date: "", location_name: "", ticket_price: undefined,
};

export default function EventCreateModal({
  open,
  onClose,
  organizations,
}: {
  open: boolean;
  onClose: () => void;
  organizations: AdminOrganization[];
}) {
  const [form, setForm]              = useState<AdminEventCreatePayload>(EMPTY);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof AdminEventCreatePayload>(
    key: K, value: AdminEventCreatePayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
  }

  function handleClose() {
    setForm(EMPTY);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AdminEventCreatePayload = {
      ...form,
      event_date: form.event_date || undefined,
      location_name: form.location_name || undefined,
      ticket_price: form.is_free ? undefined : form.ticket_price,
    };
    startTransition(async () => {
      const result = await createEventAction(payload);
      if (result.ok) {
        toast.success("Event kreiran", form.name);
        handleClose();
      } else {
        toast.error("Kreiranje nije uspjelo", result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novi event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cr-name">Naziv *</Label>
            <Input
              id="cr-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-slug">Slug *</Label>
            <Input
              id="cr-slug"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              Auto-generiran iz naziva. Mora biti jedinstven.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-org">Organizacija *</Label>
            <Select
              value={form.organizer_org_id}
              onValueChange={(v) => set("organizer_org_id", v)}
            >
              <SelectTrigger id="cr-org">
                <SelectValue placeholder="Odaberi organizaciju…" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cr-date">Datum i vrijeme</Label>
              <Input
                id="cr-date"
                type="datetime-local"
                value={form.event_date ?? ""}
                onChange={(e) => set("event_date", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cr-location">Lokacija</Label>
              <Input
                id="cr-location"
                value={form.location_name ?? ""}
                onChange={(e) => set("location_name", e.target.value)}
                placeholder="npr. Tvornica kulture"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cr-free"
              checked={form.is_free}
              onCheckedChange={(v) => set("is_free", !!v)}
            />
            <Label htmlFor="cr-free">Besplatan event</Label>
          </div>

          {!form.is_free && (
            <div className="space-y-1">
              <Label htmlFor="cr-price">Cijena ulaznice (€)</Label>
              <Input
                id="cr-price"
                type="number"
                min="0"
                step="0.01"
                value={form.ticket_price ?? ""}
                onChange={(e) => set("ticket_price", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cr-desc">Opis</Label>
            <Textarea
              id="cr-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cr-cover">URL naslovne slike</Label>
            <Input
              id="cr-cover"
              value={form.cover_image_url}
              onChange={(e) => set("cover_image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Odustani
            </Button>
            <Button type="submit" disabled={isPending || !form.organizer_org_id}>
              {isPending ? "Kreiranje…" : "Kreiraj event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
