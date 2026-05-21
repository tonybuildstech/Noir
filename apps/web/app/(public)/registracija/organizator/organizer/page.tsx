"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
import Logo from "@/components/Logo";
import { toast } from "@/components/Toaster";
import { registerAction } from "@/lib/auth/actions";
import { IDLE, type AuthState } from "@/lib/auth/types";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function RegistracijaOrganizatorPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    registerAction,
    IDLE,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Račun kreiran", state.message);
      router.replace(state.redirectTo);
      router.refresh();
    } else if (state.status === "error") {
      toast.error("Registracija nije uspjela", state.error);
    }
  }, [state, router]);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthColors = ["bg-border", "bg-red-400", "bg-amber-400", "bg-secondary", "bg-accent"];

  async function handleGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding?role=organizer`,
      },
    });
    if (error) {
      const msg = "Greška kod Google prijave. Pokušaj ponovno.";
      setGoogleError(msg);
      toast.error("Google prijava", msg);
      setGoogleLoading(false);
    }
  }

  const error = (state.status === "error" ? state.error : null) ?? googleError;

  return (
    <div className="noise-bg relative min-h-screen overflow-hidden">
      <div className="absolute top-5 left-6 z-20 md:top-6 md:left-10">
        <Logo href="/" height={28} />
      </div>

      <main className="relative flex min-h-screen items-center py-14 md:py-10">
        <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -bottom-32 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-6 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 hidden lg:order-1 lg:block">
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-white shadow-xl">
              <div className="relative z-10">
                <h2 className="font-display text-2xl leading-tight font-extrabold md:text-3xl">
                  Postani dio
                  <br />
                  <span className="text-accent">Noir mreže.</span>
                </h2>
                <p className="mt-3 text-sm text-white/70">
                  Pridružite se platformi koja povezuje najbolje organizatore s tisućama studenata.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "Provizija", val: "0%" },
                    { label: "Isplata", val: "24h" },
                    { label: "Korisnika", val: "10k+" },
                    { label: "Podrška", val: "24/7" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xl font-extrabold text-white">{s.val}</p>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0">
            <div className="animate-fade-up">
              <p className="text-xs font-semibold tracking-widest text-secondary uppercase">
                Registracija organizatora
              </p>
              <h1 className="font-display mt-2 text-2xl font-extrabold text-neutral md:text-3xl">
                Započni prodaju ulaznica
              </h1>
            </div>

            <div className="animate-fade-up delay-100 mt-4 rounded-2xl border border-border bg-surface-white p-5 shadow-sm md:p-6">
              <GoogleButton
                label="Registriraj se s Googleom"
                onClick={handleGoogle}
                loading={googleLoading}
              />

              <div className="my-4 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium tracking-wider text-text-muted uppercase">ili</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form action={formAction} className="space-y-3">
                <input type="hidden" name="redirectTo" value="/onboarding?role=organizer" />
                <div className="grid grid-cols-2 gap-3">
                  <input name="firstName" required placeholder="Ime" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-accent focus:outline-none" />
                  <input name="lastName" required placeholder="Prezime" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-accent focus:outline-none" />
                </div>
                <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-accent focus:outline-none" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Lozinka (min 8 znakova)"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <input
                  name="password_confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Potvrdi lozinku"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm focus:border-accent focus:outline-none"
                />

                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="acceptTerms" required className="mt-1" />
                  <span className="text-[10px] text-text-muted leading-tight">
                    Slažem se s uvjetima poslovanja za organizatore.
                  </span>
                </label>

                {error && <div className="text-red-600 text-xs">{error}</div>}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral transition-all disabled:opacity-50"
                >
                  {pending ? "Kreiranje..." : "Otvori račun organizatora"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
