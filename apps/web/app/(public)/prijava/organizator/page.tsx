"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
import Logo from "@/components/Logo";
import { toast } from "@/components/Toaster";
import { loginAction } from "@/lib/auth/actions";
import { IDLE, type AuthState } from "@/lib/auth/types";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function PrijavaOrganizatorPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    loginAction,
    IDLE,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Prijava uspješna", state.message);
      router.replace(state.redirectTo);
      router.refresh();
    } else if (state.status === "error") {
      toast.error("Prijava nije uspjela", state.error);
    }
  }, [state, router]);

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
        <div className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[320px] w-[320px] rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-6 lg:grid-cols-2 lg:gap-14">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <div className="animate-fade-up">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Za organizatore
              </p>
              <h1 className="font-display mt-2 text-2xl font-extrabold text-neutral md:text-3xl">
                Upravljaj svojim eventima
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Prijavi se u Creator Hub i nastavi stvarati nezaboravna iskustva.
              </p>
            </div>

            <div className="animate-fade-up delay-100 mt-5 rounded-2xl border border-border bg-surface-white p-5 shadow-sm md:p-6">
              <GoogleButton
                label="Nastavi s Google računom"
                onClick={handleGoogle}
                loading={googleLoading}
              />

              <div className="my-4 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium tracking-wider text-text-muted uppercase">
                  ili
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form action={formAction} className="space-y-3">
                <input type="hidden" name="redirectTo" value="/onboarding?role=organizer" />
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-neutral"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="ime@organizacija.hr"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-neutral transition-all focus:border-accent focus:bg-surface-white focus:outline-none focus:ring-4 focus:ring-accent/15"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-neutral"
                    >
                      Lozinka
                    </label>
                  </div>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-12 text-sm text-neutral transition-all focus:border-accent focus:bg-surface-white focus:outline-none focus:ring-4 focus:ring-accent/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-text-muted transition-colors hover:text-primary"
                    >
                      {showPassword ? "Sakrij" : "Prikaži"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-neutral hover:shadow-xl hover:shadow-primary/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? "Prijavljivanje..." : "Prijavi se"}
                </button>
              </form>
            </div>

            <p className="animate-fade-up delay-200 mt-4 text-center text-sm text-text-muted">
              Nemaš profil organizatora?{" "}
              <Link
                href="/registracija/organizator"
                className="font-semibold text-secondary transition-colors hover:text-primary"
              >
                Registriraj se ovdje
              </Link>
            </p>
          </div>

          <div className="animate-fade-up delay-200 hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-white shadow-xl">
              <div className="relative z-10">
                <h2 className="font-display text-2xl leading-tight font-extrabold md:text-3xl">
                  Najveći sustav za
                  <br />
                  <span className="text-accent">studentske evente.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Od malih klupskih večeri do velikih koncerata. Noir vam pruža
                  alate za ticketing, promociju i analitiku.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">📈</div>
                    <p className="text-xs text-white/80">Prodaja u realnom vremenu</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">🎫</div>
                    <p className="text-xs text-white/80">Digitalno skeniranje ulaznica</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">💰</div>
                    <p className="text-xs text-white/80">Brza isplata sredstava</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
