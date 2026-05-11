# Noir — Frontend (Next.js)

Ovo je frontend aplikacija projekta Noir, izgrađena pomoću Next.js frameworka (App Router). Noir je moderna platforma za prodaju ulaznica i otkrivanje događaja.

## 🚀 Tehnološki Stog

- **Framework:** [Next.js 15](https://nextjs.org/) (TypeScript)
- **Stilizacija:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Animacije:** [Framer Motion](https://www.framer.com/motion/)
- **Autentikacija:** [Supabase Auth](https://supabase.com/auth)
- **Komunikacija s backendom:** Next.js Server Actions & Fetch API

## 🛠️ Postavljanje i Pokretanje

### 1. Preduvjeti

- Node.js (verzija 20+)
- npm ili pnpm

### 2. Konfiguracija (Environment Variables)

Kreirajte `.env.local` datoteku u `/apps/web` direktoriju i dodajte sljedeće varijable (pogledajte `.env.example` za referencu):

```bash
# Supabase konfiguracija (dobivena iz Supabase dashboarda)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# URL backend API-ja
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. Instalacija i razvoj

```bash
# Instalacija ovisnosti (iz korijena projekta)
npm install

# Pokretanje razvojnog servera
npm run dev --filter=web
```

Aplikacija će biti dostupna na [http://localhost:3000](http://localhost:3000).

## 🏗️ Arhitektura

- **`app/`**: Sadrži rute aplikacije (Next.js App Router).
  - `(public)/`: Javne stranice (Landing, Eventi, Prijava).
  - `api/`: Lokalni API route handleri.
- **`components/`**: Višekratne UI komponente (Navbar, Modali, Kartice).
- **`lib/`**: Zajednička logika, klijenti (Supabase) i TypeScript tipovi.
- **`public/`**: Statički resursi (slike, fontovi).

## 📝 Bilješke o razvoju

- **Server Actions:** Za sve mutacije (prijava, registracija) koristimo Server Actions u `lib/auth/actions.ts`.
- **RBAC:** Provjera prava pristupa vrši se primarno na backendu, dok frontend prilagođava UI na temelju uloga dobivenih kroz `/api/me`.
