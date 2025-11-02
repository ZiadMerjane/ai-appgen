"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

import type { GeneratedSpec } from "@/lib/spec";

type Props = {
  entities: GeneratedSpec["entities"];
  children: React.ReactNode;
};

export default function AppShell({ entities, children }: Props) {
  const pathname = usePathname();
  const session = useSession();
  const supabase = useSupabaseClient();

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-white">
            Dashboard
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            {entities.map((entity) => {
              const href = `/${entity.slug}`;
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={entity.slug}
                  href={href}
                  className={active ? "text-white" : "hover:text-white"}
                >
                  {entity.plural}
                </Link>
              );
            })}
          </nav>
          {session ? (
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
