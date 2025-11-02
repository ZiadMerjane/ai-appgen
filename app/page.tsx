import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import PromptForm from "@/components/PromptForm";

type GenerationInfo = {
  slug: string;
  path: string;
  createdAt: string;
  mtimeMs: number;
};

export default async function Home() {
  const recent = await getRecentGenerations();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-wide text-emerald-200">
            AI AppGen
          </span>
          <h1 className="text-4xl font-semibold text-slate-100 md:text-5xl">
            Describe your app. Download a full-stack Supabase project in minutes.
          </h1>
          <p className="max-w-2xl text-base text-slate-400">
            The planner converts plain-English requirements into a typed spec. The generator scaffolds a
            production-ready Next.js application with CRUD UI, Supabase auth, and SQL migrations.
          </p>
        </header>
        <PromptForm lastGenerations={recent.map(({ mtimeMs, ...rest }) => rest)} />
      </section>
    </main>
  );
}

async function getRecentGenerations(): Promise<GenerationInfo[]> {
  const root = path.join(process.cwd(), "generated");
  let entries: GenerationInfo[] = [];

  try {
    const directoryEntries = await readdir(root, { withFileTypes: true });
    const stats = await Promise.all(
      directoryEntries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const folderPath = path.join(root, entry.name);
          const metadata = await stat(folderPath);
          return {
            slug: entry.name,
            path: folderPath,
            createdAt: new Date(metadata.mtimeMs).toISOString(),
            mtimeMs: metadata.mtimeMs,
          };
        }),
    );

    entries = stats.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 3);
  } catch (error) {
    console.warn("Failed to read generated directory", error);
  }

  return entries;
}
