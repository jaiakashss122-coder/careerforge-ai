import {
  isDraftBuiltFrom,
  isMaterialKind,
  MATERIAL_KIND_META,
  type DraftBuiltFrom,
  type MaterialDraftRecord,
  type MaterialKind,
} from "@/lib/materials/types";
import type { ApplicationMaterialRow } from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

type WriteResult = { ok: true } | { ok: false; message: string };

function rowToRecord(row: ApplicationMaterialRow): MaterialDraftRecord | null {
  // A kind this app no longer recognises is dropped rather than shown: the
  // screen would have no heading for it and no save path back to the database.
  if (!isMaterialKind(row.kind)) return null;

  const builtFrom: DraftBuiltFrom | null = isDraftBuiltFrom(row.built_from)
    ? row.built_from
    : null;

  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    targetRole: row.target_role === "" ? null : row.target_role,
    applicationId: row.application_id,
    // A fingerprint that does not parse is reported as missing, never guessed at,
    // because a wrong "saved when you had 2 projects" is worse than none.
    builtFrom,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMaterialDraftRecords(): Promise<MaterialDraftRecord[]> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("application_materials")
    .select("*")
    .eq("user_id", context.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Application material lookup failed:", error.code);
    throw new Error("Your saved drafts could not be loaded.");
  }

  return (data ?? []).flatMap((row) => {
    const record = rowToRecord(row);
    return record ? [record] : [];
  });
}

/**
 * Saves the learner's own words for one document. One row per kind, so a second
 * save replaces the first rather than leaving two versions of the same résumé
 * with nothing on screen to say which one a reviewer would be sent.
 */
export async function saveMaterialDraftRow({
  kind,
  content,
  targetRole,
  applicationId,
  builtFrom,
}: {
  kind: MaterialKind;
  content: string;
  targetRole: string;
  applicationId: string | null;
  builtFrom: DraftBuiltFrom;
}): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to save your own wording." };
  }

  if (applicationId) {
    // The foreign key alone would accept a row owned by anyone, so the saved
    // role is checked against this account before it is referenced.
    const { data: owned } = await context.supabase
      .from("job_applications")
      .select("id")
      .eq("user_id", context.userId)
      .eq("id", applicationId)
      .maybeSingle();

    if (!owned) {
      return {
        ok: false,
        message: "The role you picked is not saved on this account.",
      };
    }
  }

  const { data, error } = await context.supabase
    .from("application_materials")
    .upsert(
      {
        user_id: context.userId,
        kind,
        content,
        target_role: targetRole,
        application_id: applicationId,
        built_from: builtFrom,
      },
      { onConflict: "user_id,kind" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Application material save failed:", error.code);
    return { ok: false, message: "Your wording could not be saved." };
  }

  if (!data) {
    return { ok: false, message: "Your wording could not be saved." };
  }

  return { ok: true };
}

export async function deleteMaterialDraftRow(
  kind: MaterialKind,
): Promise<WriteResult> {
  const context = await getAuthenticatedContext();
  if (!context) {
    return { ok: false, message: "Sign in to remove a saved draft." };
  }

  const { data, error } = await context.supabase
    .from("application_materials")
    .delete()
    .eq("user_id", context.userId)
    .eq("kind", kind)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Application material delete failed:", error.code);
    return { ok: false, message: "That saved draft could not be removed." };
  }

  if (!data) {
    return {
      ok: false,
      message: `You have no saved ${MATERIAL_KIND_META[kind].label} draft on this account.`,
    };
  }

  return { ok: true };
}
