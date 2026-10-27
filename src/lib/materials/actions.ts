"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildSkillProofs, draftFingerprint } from "@/lib/materials/backing";
import {
  deleteMaterialDraftRow,
  saveMaterialDraftRow,
} from "@/lib/materials/repository";
import {
  MAX_DRAFT_LENGTH,
  MIN_DRAFT_LENGTH,
  isMaterialKind,
  type MaterialKind,
} from "@/lib/materials/types";
import type {
  MaterialActionResult,
  RemoveMaterialDraftInput,
  SaveMaterialDraftInput,
} from "@/lib/materials/action-types";
import { getCurrentProfile } from "@/lib/profile/repository";
import { loadServerWorkspace } from "@/lib/workspace/load";

const REVALIDATED_PATHS = ["/materials", "/settings"];

function revalidateMaterials() {
  for (const path of REVALIDATED_PATHS) {
    revalidatePath(path);
  }
}

function firstIssue(error: z.ZodError, fallback: string) {
  return error.issues[0]?.message ?? fallback;
}

const kindSchema = z
  .unknown()
  .refine(
    (value): value is MaterialKind =>
      typeof value === "string" && isMaterialKind(value),
    "That is not one of the three documents this app builds.",
  );

const contentSchema = z
  .string()
  .trim()
  .min(
    MIN_DRAFT_LENGTH,
    `Write at least ${MIN_DRAFT_LENGTH} characters. Below that this app would be saving a title and calling it a document.`,
  )
  .max(
    MAX_DRAFT_LENGTH,
    `That is over ${MAX_DRAFT_LENGTH} characters, which is more than one document of yours should run to.`,
  );

const roleSchema = z
  .string()
  .trim()
  .max(160, "That role name is longer than 160 characters.");

const applicationIdSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}$/i,
    "The role you picked is not one this app can point at.",
  );

export async function saveMaterialDraftAction(
  input: SaveMaterialDraftInput,
): Promise<MaterialActionResult> {
  const kind = kindSchema.safeParse(input.kind);

  if (!kind.success) {
    return { ok: false, message: firstIssue(kind.error, "Pick a document to save.") };
  }

  const content = contentSchema.safeParse(input.content);

  if (!content.success) {
    return {
      ok: false,
      message: firstIssue(content.error, "That draft is not a length this app will save."),
    };
  }

  const targetRole = roleSchema.safeParse(input.targetRole ?? "");

  if (!targetRole.success) {
    return { ok: false, message: firstIssue(targetRole.error, "Check the role name.") };
  }

  const applicationId =
    input.applicationId === null || input.applicationId === ""
      ? { success: true as const, data: null }
      : applicationIdSchema.safeParse(input.applicationId);

  if (!applicationId.success) {
    return {
      ok: false,
      message: firstIssue(
        applicationId.error,
        "The role you picked is not one this app can point at.",
      ),
    };
  }

  // The fingerprint is read from the stored records, never from what the browser
  // sent, so a saved draft cannot claim counts the workspace does not hold.
  const [workspace, profile] = await Promise.all([
    loadServerWorkspace(),
    getCurrentProfile(),
  ]);
  const builtFrom = draftFingerprint({
    workspace,
    proofs: buildSkillProofs({ workspace, profile }),
  });

  const saved = await saveMaterialDraftRow({
    kind: kind.data,
    content: content.data,
    targetRole: targetRole.data,
    applicationId: applicationId.data,
    builtFrom,
  });

  if (!saved.ok) return saved;

  revalidateMaterials();

  return {
    ok: true,
    message:
      "Your wording was saved with a count of what your records held today, so this screen can tell you when they move on. The lines this app generated are kept separately and are rebuilt every time you open the page.",
  };
}

export async function removeMaterialDraftAction(
  input: RemoveMaterialDraftInput,
): Promise<MaterialActionResult> {
  const kind = kindSchema.safeParse(input.kind);

  if (!kind.success) {
    return { ok: false, message: firstIssue(kind.error, "Pick a document to remove.") };
  }

  const removed = await deleteMaterialDraftRow(kind.data);

  if (!removed.ok) return removed;

  revalidateMaterials();

  return {
    ok: true,
    message:
      "Your saved wording was removed. The lines this app generated are still on screen, because they are read from your records every time.",
  };
}
