# AI AppGen

AI AppGen turns a plain-English prompt into a production-ready Next.js + Supabase project. The workflow is split into planner, generator, and exporter APIs with a landing page that orchestrates the pipeline.

## Quickstart

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create `.env.local` with the variables listed below.
3. Run the development server:
   ```bash
   pnpm dev
   ```
4. Open `http://localhost:3000` and describe the app you want to scaffold.

## Environment Variables

Create `.env.local` (gitignored) with:

```env
# LLM provider
AI_PROVIDER=local          # or "openai"
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Supabase (used by generated apps)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Generated projects include their own `.env.example` with the same keys plus an optional `SUPABASE_SERVICE_ROLE_KEY` for migrations.

> ℹ️ Switching to OpenAI: set `AI_PROVIDER=openai`, provide `OPENAI_API_KEY`, and choose an `OPENAI_MODEL` such as `gpt-4o-mini`.

## Sample Prompts

- `Tasks app with title + done`
- `CRM dashboard with companies, contacts, and deals`
- `Recipe manager with ingredients, steps, and categories`

The planner is deterministic (temperature 0) and returns a validated JSON spec. The generator converts the spec into a Next.js app inside `/generated/<slug>` and the exporter streams a ZIP from that folder.

## Common Commands

- `pnpm dev` – Next.js dev server
- `pnpm lint` – ESLint (flat config)
- `pnpm test` – Vitest suites (schema, generator, components, exporter)
- `pnpm build` / `pnpm start` – production build & serve

## Common Errors

- **Missing env vars** – Ensure `.env.local` is populated; the exporter and generator rely on Supabase keys even if you use local mode.
- **Planner returns non-JSON** – Verify the configured LLM provider respects the prompt; fallback `local` provider uses a heuristic planner.
- **Download fails (413)** – Generated folder must stay under 200MB to zip through the exporter.

## Deploying AI AppGen (Vercel)

1. Install dependencies locally and confirm `pnpm dev` works.
2. In Vercel, create a new project pointing at this repo.
3. Configure environment variables:
   - `AI_PROVIDER`
   - `OPENAI_API_KEY` / `OPENAI_MODEL` (when using OpenAI)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. The `/api/plan`, `/api/generate`, `/api/export`, and `/api/gh` routes are pinned to the Node runtime (`runtime = "nodejs"`). Vercel will honour this automatically—just verify the setting remains enabled after deployment.

## Deploying Generated Apps

1. Copy the generated folder to a new repo (or use the GitHub commands surfaced in the UI).
2. Set environment variables on your hosting platform (e.g., Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Apply the SQL migration found under `supabase/migrations/0001_init.sql`:
   - Run it through the Supabase SQL Editor **or**
   - Use the Supabase CLI: `supabase db push`
4. Deploy the app; the generated project already includes owner-scoped RLS policies and Supabase auth helpers.

## Directory Structure

- `app/` – App Router UI and API routes (`/api/plan`, `/api/generate`, `/api/export`)
- `lib/` – Planner schemas, LLM wrapper, filesystem helpers, generator templates
- `generated/` – Output projects (ignored by Git)
- `tests/` – Vitest suites covering schema, generator, exporter, and UI components
- `DOCS/CHANGELOG.md` – Milestone log

## Example Workflow

1. Enter a prompt on the landing page and run **Plan** to preview the JSON spec.
2. Click **Generate** to scaffold the app under `/generated/<slug>`.
3. Download the ZIP or open the folder locally to continue development.

Happy hacking!
