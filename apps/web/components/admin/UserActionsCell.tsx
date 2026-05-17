"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserEditModal from "./UserEditModal";
import type { AdminUser } from "@/lib/admin/types";

export default function UserActionsCell({ user }: { user: AdminUser }) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>Uredi</Button>
      <UserEditModal user={user} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
