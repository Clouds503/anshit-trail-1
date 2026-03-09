# Clouds Trail Website

Production website for Clouds Trail, built with React + Vite + Supabase.

## Tech Stack

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- Supabase (Database, Auth, Edge Functions)

## Local Development

1. Create a local env file from the template:

```sh
cp .env.example .env
```

2. Configure environment variables in `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

3. Install dependencies:

```sh
npm install
```

4. Start development server:

```sh
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Supabase

- Edge functions are in `supabase/functions/`
- SQL migrations are in `supabase/migrations/`
- Project settings are in `supabase/config.toml`
- Required edge function secret for image generation: `GEMINI_API_KEY`

## Repository Policy

- `.env` is local-only and should not be committed.
- Use npm as the package manager for this repo (`package-lock.json` is the source of truth).
