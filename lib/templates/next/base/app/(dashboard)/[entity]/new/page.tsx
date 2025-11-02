import { notFound } from "next/navigation";

import EntityForm from "@/components/EntityForm";
import { createRecordAction } from "@/app/actions";
import { appSpec, getEntityBySlug } from "@/lib/spec";

export async function generateStaticParams() {
  return appSpec.entities.map((entity) => ({ entity: entity.slug }));
}

export default async function NewEntityPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity: entitySlug } = await params;
  const entity = getEntityBySlug(entitySlug);

  if (!entity) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Create {entity.singular}</h1>
        <p className="text-sm text-slate-400">Fill in the fields below and submit to store in Supabase.</p>
      </div>
      <EntityForm
        entity={entity}
        submitAction={createRecordAction}
        initialValues={null}
        submitLabel={`Create ${entity.singular}`}
      />
    </div>
  );
}
