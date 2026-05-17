"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import EventCreateModal from "./EventCreateModal";
import type { AdminOrganization } from "@/lib/admin/types";

export default function CreateEventButton({
  organizations,
}: {
  organizations: AdminOrganization[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Novi event</Button>
      <EventCreateModal
        open={open}
        onClose={() => setOpen(false)}
        organizations={organizations}
      />
    </>
  );
}
