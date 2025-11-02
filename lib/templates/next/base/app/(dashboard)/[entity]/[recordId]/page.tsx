import { notFound } from "next/navigation";

import EntityForm from "@/components/EntityForm";
import { updateRecordAction } from "@/app/actions";
import { getServerClient } from "@/lib/supabase/server";
import { getEntityBySlug } from "@/lib/spec";

export default async function EditEntityPage({
  params,
}: {
  params: Promise<{ entity: string; recordId: string }>;
}) {
  const { entity: entitySlug, recordId } = await params;
  const entity = getEntityBySlug(entitySlug);

  if (!entity) {
    notFound();
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from(entity.tableName)
    .select("*")
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Edit {entity.singular}</h1>
        <p className="text-sm text-slate-400">Update the selected record and save changes.</p>
      </div>
      <EntityForm
        entity={entity}
        submitAction={updateRecordAction}
        initialValues={data}
        submitLabel={`Update ${entity.singular}`}
      />
    </div>
  );
}
