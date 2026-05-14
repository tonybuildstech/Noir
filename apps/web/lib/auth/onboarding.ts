"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BACKEND_API_URL } from "./config";
import type { OnboardingRequest, TagListResponse } from "../typescript/api-types";

export type OnboardingResult =
  | { status: "success" }
  | { status: "error"; error: string };

/**
 * Fetches tags from the backend. Server-side only so we use a single
 * cached request per page render.
 */
export async function fetchTags(
  category?: "genre" | "event_type",
): Promise<TagListResponse> {
  const url = new URL(`${BACKEND_API_URL}/tags`);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return { items: [], total: 0 };
  return (await res.json()) as TagListResponse;
}

/**
 * Server action — submits the onboarding payload to the backend and
 * lets the caller decide whether to navigate. We don't redirect here
 * so the client can show success toast first.
 */
export async function submitOnboardingAction(
  payload: OnboardingRequest,
): Promise<OnboardingResult> {
  if (!payload.city?.trim()) {
    return { status: "error", error: "Unesi svoj grad." };
  }
  if (!payload.date_of_birth) {
    return { status: "error", error: "Unesi datum rođenja." };
  }

  const supabase = await supabaseServer();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return { status: "error", error: "Sesija je istekla. Prijavi se ponovno." };
  }

  try {
    const res = await fetch(`${BACKEND_API_URL}/profiles/me/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      const message =
        typeof detail?.detail === "string"
          ? detail.detail
          : "Spremanje nije uspjelo. Pokušaj ponovno.";
      return { status: "error", error: message };
    }

    return { status: "success" };
  } catch {
    return {
      status: "error",
      error: "Greška u komunikaciji s poslužiteljem.",
    };
  }
}
