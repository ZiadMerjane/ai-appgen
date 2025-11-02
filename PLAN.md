# MVP Plan

## Milestones
- **M1 – Baseline audit & toolchain setup:** validate existing config, ensure pnpm, lint, test tooling ready; document gaps.
- **M2 – Core planner API:** implement zod schema, LLM wrapper, `/app/api/plan` route with deterministic planning and defaults.
- **M3 – Generator pipeline:** scaffold template assets, filesystem helpers, `/app/api/generate` route, CRUD + Supabase + migrations.
- **M4 – Exporter & downloads:** implement `/app/api/export` route with `archiver`, zip streaming, slug collision handling.
- **M5 – Frontend UX & Supabase wiring:** landing page UI, Supabase auth client, connect planner/generator/exporter flows.
- **M6 – Testing & QA:** Vitest suites (schema, generator, component), linting, end-to-end smoke of “Tasks” preset, polish docs.

## Proposed Folder Tree
```
ai-appgen/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ api/
│     ├─ plan/route.ts
│     ├─ generate/route.ts
│     └─ export/route.ts
├─ lib/
│  ├─ llm.ts
│  ├─ spec.ts
│  ├─ fsx.ts
│  └─ templates/
│     └─ next/
│        ├─ base/
│        ├─ components/
│        ├─ supabase/
│        ├─ pages/
│        └─ sql/
├─ generated/
├─ styles/
│  └─ globals.css
├─ supabase/
│  └─ migrations/
├─ tests/
│  ├─ spec.test.ts
│  ├─ generator.test.ts
│  └─ components/
│     └─ PromptForm.test.tsx
├─ DOCS/
│  └─ CHANGELOG.md
├─ postcss.config.mjs
├─ tailwind.config.ts
├─ vitest.config.ts
├─ tsconfig.json
├─ .eslintrc.cjs
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
└─ README.md
```

Waiting for confirmation before proceeding.
