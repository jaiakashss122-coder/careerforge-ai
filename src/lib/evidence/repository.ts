import {
  isEvidenceLevel,
  isEvidenceSourceType,
  type SkillEvidenceRecord,
} from "@/lib/evidence/types";
import type { UserSkillEvidenceRow } from "@/lib/supabase/database.types";
import { getAuthenticatedContext } from "@/lib/workspace/server";

async function loadSkillSlugs(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>>["supabase"],
) {
  const { data, error } = await supabase.from("skills").select("id, slug");

  if (error) {
    console.error("Skill lookup failed:", error.code);
    return new Map<string, string>();
  }

  return new Map((data ?? []).map((skill) => [skill.id, skill.slug]));
}

function evidenceRowToRecord(
  row: UserSkillEvidenceRow,
  slugById: Map<string, string>,
): SkillEvidenceRecord | null {
  const skillSlug = slugById.get(row.skill_id);

  if (!skillSlug) {
    console.warn(`Evidence row references unknown skill: ${row.skill_id}`);
    return null;
  }

  if (
    !isEvidenceSourceType(row.source_type) ||
    !isEvidenceLevel(row.evidence_level)
  ) {
    console.warn(`Evidence row has unknown lane: ${row.source_type}`);
    return null;
  }

  return {
    id: row.id,
    skillSlug,
    sourceType: row.source_type,
    sourceId: row.source_id,
    evidenceLevel: row.evidence_level,
    score: row.score,
    verified: row.verified,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listSkillEvidenceRecords(): Promise<
  SkillEvidenceRecord[]
> {
  const context = await getAuthenticatedContext();
  if (!context) return [];

  const [{ data: rows, error }, slugById] = await Promise.all([
    context.supabase
      .from("user_skill_evidence")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false }),
    loadSkillSlugs(context.supabase),
  ]);

  if (error) {
    console.error("Skill evidence lookup failed:", error.code);
    throw new Error("Your skill evidence could not be loaded.");
  }

  return (rows ?? []).flatMap((row) => {
    const record = evidenceRowToRecord(row, slugById);
    return record ? [record] : [];
  });
}

export async function countSkillEvidenceRecords() {
  const context = await getAuthenticatedContext();
  if (!context) return 0;

  const { count, error } = await context.supabase
    .from("user_skill_evidence")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId);

  if (error) {
    console.error("Skill evidence count failed:", error.code);
    return 0;
  }

  return count ?? 0;
}
