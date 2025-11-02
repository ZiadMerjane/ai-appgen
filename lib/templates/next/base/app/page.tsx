import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerClient } from "@/lib/supabase/server";
import { getPrimaryEntity, appSpec } from "@/lib/spec";

export default async function Home() {
  const supabase = getServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const primary = getPrimaryEntity();

  if (session && primary) {
    redirect(`/${primary.slug}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="max-w-xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold">{appSpec.name}</h1>
        <p className="text-slate-400">
          Sign in to manage your data. Once authenticated you will access generated CRUD pages for each entity.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-in"
            className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
