"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { toast } from "@/components/Toaster";
import { submitOnboardingAction } from "@/lib/auth/onboarding";
import type { TagOut } from "@/lib/typescript/api-types";

type Step = 1 | 2 | 3 | 4 | 5;

const CROATIAN_CITIES = [
  "Zagreb", "Split", "Rijeka", "Osijek", "Zadar", "Pula", "Slavonski Brod",
  "Karlovac", "Varaždin", "Šibenik", "Dubrovnik", "Sisak", "Vinkovci",
  "Velika Gorica", "Vukovar", "Bjelovar", "Koprivnica", "Samobor", "Đakovo", "Čakovec",
];

const MONTHS_HR = [
  "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
  "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
];

const VENUE_TYPES = [
  { value: "club", label: "Klub" },
  { value: "bar", label: "Bar / Kafić" },
  { value: "concert_hall", label: "Koncertna dvorana" },
  { value: "outdoor", label: "Otvoreni prostor" },
  { value: "theater", label: "Kazalište" },
  { value: "other", label: "Ostalo" },
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 100;
const MAX_YEAR = CURRENT_YEAR - 13;

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function OnboardingWizard({
  firstName,
  genres,
  eventTypes,
}: {
  firstName: string | null;
  genres: TagOut[];
  eventTypes: TagOut[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<number>(1);
  const [pending, startTransition] = useTransition();

  // Step 1 — Basic info
  const [city, setCity] = useState("");
  const [day, setDay] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [year, setYear] = useState<number | "">("");
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 — Role selection
  const [roles, setRoles] = useState<Set<string>>(new Set(["visitor"]));
  
  // Step 3 — Organization info
  const [orgName, setOrgName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [orgContact, setOrgContact] = useState("");

  // Step 4 — Venue info (optional)
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueType, setVenueType] = useState("");

  // Step 5 — Interests
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Handle initial role from query param
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "organizer") {
      setRoles(new Set(["visitor", "organizer"]));
    }
  }, [searchParams]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) arr.push(y);
    return arr;
  }, []);

  const days = useMemo(() => {
    const dim = typeof year === "number" && typeof month === "number" ? daysInMonth(year, month) : 31;
    return Array.from({ length: dim }, (_, i) => i + 1);
  }, [year, month]);

  function validateStep1(): string | null {
    if (!city.trim()) return "Odaberi ili unesi svoj grad.";
    if (typeof day !== "number" || typeof month !== "number" || typeof year !== "number")
      return "Unesi cijeli datum rođenja.";
    return null;
  }

  const isBusiness = roles.has("organizer") || roles.has("venue_owner");
  const isVenueOwner = roles.has("venue_owner");

  function next() {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setStep1Error(err); return; }
      setStep1Error(null);
      setStep(2);
    } else if (step === 2) {
      if (isBusiness) setStep(3);
      else setStep(5);
    } else if (step === 3) {
      if (!orgName.trim() && roles.has("organizer")) {
        toast.error("Unesi naziv organizacije.");
        return;
      }
      if (isVenueOwner) setStep(4);
      else setStep(5);
    } else if (step === 4) {
      setStep(5);
    }
  }

  function back() {
    if (step === 5) {
      if (isVenueOwner) setStep(4);
      else if (isBusiness) setStep(3);
      else setStep(2);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  }

  function toggleRole(role: string) {
    if (role === "visitor") return;
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  function toggleTag(slug: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function finish() {
    if (typeof day !== "number" || typeof month !== "number" || typeof year !== "number") return;
    const payload = {
      city: city.trim(),
      date_of_birth: `${year}-${pad(month)}-${pad(day)}`,
      interest_tags: Array.from(selectedTags),
      role_request: Array.from(roles).filter(r => r !== "visitor"),
      organization_name: isBusiness ? orgName.trim() : undefined,
      tax_id: isBusiness ? taxId.trim() : undefined,
      organization_contact: isBusiness ? orgContact.trim() : undefined,
      venue_name: isVenueOwner && venueName.trim() ? venueName.trim() : undefined,
      venue_address: isVenueOwner && venueAddress.trim() ? venueAddress.trim() : undefined,
      venue_type: isVenueOwner && venueType ? venueType : undefined,
    };

    startTransition(async () => {
      const result = await submitOnboardingAction(payload);
      if (result.status === "success") {
        toast.success("Dobrodošao u Noir!", "Profil je spreman.");
        router.replace("/eventi");
      } else {
        toast.error("Spremanje nije uspjelo", result.error);
      }
    });
  }

  // Visual step progress
  const totalSteps = isVenueOwner ? 5 : (isBusiness ? 4 : 3);
  let displayStep = step;
  if (step === 5) displayStep = totalSteps;
  else if (step === 4 && !isVenueOwner) displayStep = 3; // Should not happen with current logic

  return (
    <div className="noise-bg relative min-h-screen overflow-hidden">
      <div className="absolute top-5 left-6 z-20 md:top-6 md:left-10">
        <Logo href="/" height={28} />
      </div>

      <main className="relative flex min-h-screen items-center py-14 md:py-10">
        <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -bottom-32 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-2xl px-6">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold tracking-widest text-secondary uppercase">
              Korak {displayStep} / {totalSteps}
            </p>
            <h1 className="font-display mt-2 text-2xl font-extrabold text-neutral md:text-3xl">
              {step === 1 && (firstName ? `Bok, ${firstName}! Reci nam o sebi.` : "Reci nam o sebi.")}
              {step === 2 && "Koja je tvoja uloga?"}
              {step === 3 && "Podaci o organizaciji"}
              {step === 4 && "Tvoj prvi prostor"}
              {step === 5 && "Što te zanima?"}
            </h1>
            <p className="mt-1.5 text-sm text-text-muted">
              {step === 1 && "Osnovni podaci za personalizaciju iskustva."}
              {step === 2 && "Odaberi kako planiraš koristiti Noir. Možeš odabrati više opcija."}
              {step === 3 && "Ove informacije su potrebne za verifikaciju i kreiranje tvojeg profila organizatora."}
              {step === 4 && "Možeš dodati svoj prvi prostor odmah ili preskočiti i dodati kasnije u Creator Hubu."}
              {step === 5 && "Odaberi interese kako bismo ti predložili najbolje evente."}
            </p>
          </div>

          <div className="animate-fade-up delay-100 mt-6 rounded-2xl border border-border bg-surface-white p-6 shadow-sm md:p-8">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral">Grad</label>
                  <input
                    list="city-options"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="npr. Zagreb"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
                  />
                  <datalist id="city-options">
                    {CROATIAN_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral">Datum rođenja</label>
                  <div className="mt-1 grid grid-cols-3 gap-3">
                    <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
                      <option value="">Dan</option>
                      {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
                      <option value="">Mjesec</option>
                      {MONTHS_HR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-accent focus:outline-none">
                      <option value="">Godina</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {step1Error && <div className="text-red-600 text-xs">{step1Error}</div>}
                <button onClick={next} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-lg hover:bg-neutral transition-all">
                  Dalje →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <RoleCard
                    title="Posjetitelj"
                    description="Želim otkrivati evente i kupovati ulaznice."
                    selected={roles.has("visitor")}
                    disabled={true}
                    onClick={() => {}}
                  />
                  <RoleCard
                    title="Organizator"
                    description="Organiziram koncerte, partije ili festivale."
                    selected={roles.has("organizer")}
                    onClick={() => toggleRole("organizer")}
                    info="Omogućuje kreiranje evenata, prodaju ulaznica i pristup analitici."
                  />
                  <RoleCard
                    title="Vlasnik prostora"
                    description="Iznajmljujem prostor za događaje."
                    selected={roles.has("venue_owner")}
                    onClick={() => toggleRole("venue_owner")}
                    info="Omogućuje listanje prostora u bazi i primanje upita za najam."
                  />
                </div>
                <div className="flex justify-between gap-4">
                  <button onClick={() => setStep(1)} className="rounded-full border border-border px-6 py-3 text-sm font-semibold">Natrag</button>
                  <button onClick={next} className="rounded-full bg-primary px-10 py-3 text-sm font-semibold text-white shadow-lg">Dalje</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral">Naziv organizacije / obrta</label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="npr. Udruga studenata TVZ"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral">OIB (opcionalno)</label>
                    <input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="11-znamenkasti broj"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral">Kontakt (Email ili Mobitel)</label>
                    <input
                      value={orgContact}
                      onChange={(e) => setOrgContact(e.target.value)}
                      placeholder="npr. info@noir.hr"
                      className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-text-muted italic">
                  * Admin će pregledati tvoj zahtjev i odobriti pristup u roku od 24 sata.
                </p>
                <div className="flex justify-between gap-4">
                  <button onClick={() => setStep(2)} className="rounded-full border border-border px-6 py-3 text-sm font-semibold">Natrag</button>
                  <button onClick={next} className="rounded-full bg-primary px-10 py-3 text-sm font-semibold text-white shadow-lg">Dalje</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral">Naziv prostora</label>
                  <input
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="npr. Klub Roko"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral">Adresa prostora</label>
                  <input
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="npr. Jarunska 2"
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral">Tip prostora</label>
                  <select
                    value={venueType}
                    onChange={(e) => setVenueType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="">Odaberi tip...</option>
                    {VENUE_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                  </select>
                </div>
                <div className="flex justify-between gap-4">
                  <button onClick={() => setStep(3)} className="rounded-full border border-border px-6 py-3 text-sm font-semibold">Natrag</button>
                  <div className="flex gap-2">
                    <button onClick={next} className="rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface">Preskoči</button>
                    <button onClick={next} disabled={!venueName || !venueAddress || !venueType} className="rounded-full bg-primary px-10 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">Spremi i dalje</button>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-neutral">Što te zanima?</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {genres.map(t => (
                      <TagChip key={t.id} label={t.name} selected={selectedTags.has(t.slug)} onClick={() => toggleTag(t.slug)} />
                    ))}
                    {eventTypes.map(t => (
                      <TagChip key={t.id} label={t.name} selected={selectedTags.has(t.slug)} onClick={() => toggleTag(t.slug)} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <button onClick={back} className="rounded-full border border-border px-6 py-3 text-sm font-semibold">Natrag</button>
                  <button onClick={finish} disabled={pending} className="rounded-full bg-primary px-10 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                    {pending ? "Spremam..." : "Završi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ title, description, selected, onClick, disabled, info }: {
  title: string; description: string; selected: boolean; onClick: () => void; disabled?: boolean; info?: string;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative group cursor-pointer rounded-2xl border p-5 transition-all ${
        selected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-surface hover:border-accent/40"
      } ${disabled ? "opacity-70 cursor-default" : ""}`}
    >
      {info && (
        <div className="absolute top-3 right-3 text-text-muted hover:text-primary group-hover:block">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="cursor-help">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11h-2v2h2V7zm0 4h-2v4h2v-4z" fill="currentColor" />
            </svg>
            <div className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-neutral p-2 text-[10px] text-white shadow-xl z-30">
              {info}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selected ? "border-accent bg-accent" : "border-border"}`}>
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <h3 className="font-bold text-neutral">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function TagChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        selected ? "border-accent bg-accent/15 text-primary shadow-sm" : "border-border bg-surface text-neutral hover:border-accent/60"
      }`}
    >
      {label}
    </button>
  );
}
