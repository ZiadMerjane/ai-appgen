"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildInsertPayload, buildUpdatePayload } from "@/lib/forms";
import { getServerClient } from "@/lib/supabase/server";
import { getEntityBySlug } from "@/lib/spec";

export async function createRecordAction(formData: FormData) {
  const entitySlug = String(formData.get("entity"));
  const entity = getEntityBySlug(entitySlug);

  if (!entity) {
    throw new Error(`Unknown entity: ${entitySlug}`);
  }

  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const payload = buildInsertPayload(entity, formData, user!.id);
  const { error } = await supabase.from(entity.tableName).insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${entity.slug}`);
  redirect(`/${entity.slug}`);
}

export async function updateRecordAction(formData: FormData) {
  const entitySlug = String(formData.get("entity"));
  const entity = getEntityBySlug(entitySlug);
  const recordId = String(formData.get("id"));

  if (!entity) {
    throw new Error(`Unknown entity: ${entitySlug}`);
  }

  if (!recordId) {
    throw new Error("Missing record id");
  }

  const supabase = getServerClient();
  const payload = buildUpdatePayload(entity, formData);
  const { error } = await supabase
    .from(entity.tableName)
    .update(payload)
    .eq("id", recordId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${entity.slug}`);
  redirect(`/${entity.slug}`);
}

export async function deleteRecordAction(formData: FormData) {
  const entitySlug = String(formData.get("entity"));
  const entity = getEntityBySlug(entitySlug);
  const recordId = String(formData.get("id"));

  if (!entity) {
    throw new Error(`Unknown entity: ${entitySlug}`);
  }

  if (!recordId) {
    throw new Error("Missing record id");
  }

  const supabase = getServerClient();
  const { error } = await supabase.from(entity.tableName).delete().eq("id", recordId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/${entity.slug}`);
}
