"use client";

import { useState, useEffect, useTransition } from "react";
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
import { updateEventAction } from "@/app/admin/actions";
import type { AdminEvent, AdminEventUpdatePayload, EventStatus } from "@/lib/admin/types";

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "draft",            label: "Skica" },
  { value: "pending_venue",    label: "Čeka prostor" },
  { value: "venue_confirmed",  label: "Prostor potvrđen" },
  { value: "published",        label: "Objavljen" },
  { value: "cancelled",        label: "Otkazan" },
  { value: "completed",        label: "Završen" },
];

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

export default function EventEditModal({
  event,
  open,
  onClose,
}: {
  event: AdminEvent;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName]               = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [coverUrl, setCoverUrl]       = useState(event.cover_image_url ?? "");
  const [status, setStatus]           = useState<EventStatus>(event.status);
  const [isFree, setIsFree]           = useState(event.is_free);
  const [eventDate, setEventDate]     = useState(toDatetimeLocal(event.event_date));
  const [location, setLocation]       = useState(event.location_name ?? "");
  const [price, setPrice]             = useState<number | "">(event.ticket_price ?? "");
  const [isPending, startTransition]  = useTransition();

  useEffect(() => {
    setName(event.name);
    setDescription(event.description ?? "");
    setCoverUrl(event.cover_image_url ?? "");
    setStatus(event.status);
    setIsFree(event.is_free);
    setEventDate(toDatetimeLocal(event.event_date));
    setLocation(event.location_name ?? "");
    setPrice(event.ticket_price ?? "");
  }, [event.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const patch: AdminEventUpdatePayload = {
      name,
      description,
      cover_image_url: coverUrl,
      status,
      is_free: isFree,
      event_date: eventDate || undefined,
      location_name: location || undefined,
      ticket_price: isFree ? undefined : (price === "" ? undefined : Number(price)),
    };
    startTransition(async () => {
      const result = await updateEventAction(event.id, patch);
      if (result.ok) {
        toast.success("Event ažuriran", name);
        onClose();
      } else {
        toast.error("Ažuriranje nije uspjelo", result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uredi event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ev-name">Naziv</Label>
            <Input
              id="ev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ev-date">Datum i vrijeme</Label>
              <Input
                id="ev-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ev-location">Lokacija</Label>
              <Input
                id="ev-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="npr. Tvornica kulture"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ev-free"
              checked={isFree}
              onCheckedChange={(v) => setIsFree(!!v)}
            />
            <Label htmlFor="ev-free">Besplatan event</Label>
          </div>

          {!isFree && (
            <div className="space-y-1">
              <Label htmlFor="ev-price">Cijena ulaznice (€)</Label>
              <Input
                id="ev-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="ev-desc">Opis</Label>
            <Textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ev-cover">URL naslovne slike</Label>
            <Input
              id="ev-cover"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Odustani
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Spremanje…" : "Spremi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
