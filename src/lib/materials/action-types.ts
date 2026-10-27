export type MaterialActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type SaveMaterialDraftInput = {
  kind: unknown;
  content: unknown;
  targetRole: unknown;
  applicationId: unknown;
};

export type RemoveMaterialDraftInput = {
  kind: unknown;
};
