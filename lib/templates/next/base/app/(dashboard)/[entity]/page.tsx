import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import EntityTable from "@/components/EntityTable";
import { getServerClient } from "@/lib/supabase/server";
import { appSpec, getEntityBySlug } from "@/lib/spec";

export async function generateStaticParams() {
  return appSpec.entities.map((entity) => ({ entity: entity.slug }));
}

export default async function EntityListPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity: entitySlug } = await params;
  const entity = getEntityBySlug(entitySlug);

  if (!entity) {
    notFound();
  }

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from(entity.tableName)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{entity.plural}</h1>
          <p className="text-sm text-slate-400">Manage records stored in Supabase.</p>
        </div>
        <Link
          href={`/${entity.slug}/new`}
          className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
        >
          New {entity.singular}
        </Link>
      </div>
      <EntityTable entity={entity} records={data ?? []} />
    </div>
  );
}
