"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  removeMaterialDraftAction,
  saveMaterialDraftAction,
} from "@/lib/materials/actions";
import type { MaterialKind } from "@/lib/materials/types";
import {
  removePreviewMaterialDraft,
  savePreviewMaterialDraft,
} from "@/lib/preview/workspace-store";

type Outcome = { ok: boolean; message?: string };

/** What the editor holds before it is saved. Both text fields start empty, not null. */
export type MaterialDraftInput = {
  kind: MaterialKind;
  content: string;
  targetRole: string;
  applicationId: string;
};

export type MaterialsActions = {
  busyId: string | null;
  /** Which save or removal produced `error` and `notice`, so only that panel reports it. */
  messageKey: string | null;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  saveDraft: (input: MaterialDraftInput) => Promise<boolean>;
  removeDraft: (kind: MaterialKind) => Promise<boolean>;
};

export const draftSaveKey = (kind: MaterialKind) => `draft:save:${kind}`;
export const draftRemoveKey = (kind: MaterialKind) => `draft:remove:${kind}`;

export function useMaterialsActions({
  previewMode,
}: {
  previewMode: boolean;
}): MaterialsActions {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(
    async (
      key: string,
      action: () => Outcome | Promise<Outcome>,
    ): Promise<boolean> => {
      setBusyId(key);
      setMessageKey(key);
      setError(null);
      setNotice(null);

      try {
        const result = await action();

        if (!result.ok) {
          setError(result.message ?? "That draft could not be saved.");
          return false;
        }

        setNotice(result.message ?? null);
        if (!previewMode) router.refresh();
        return true;
      } catch {
        setError(
          "Your wording was not saved. Reload the page and try again — nothing in this app writes over a draft it could not read.",
        );
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [previewMode, router],
  );

  const clearMessages = useCallback(() => {
    setMessageKey(null);
    setError(null);
    setNotice(null);
  }, []);

  const saveDraft = useCallback(
    (input: MaterialDraftInput) =>
      run(draftSaveKey(input.kind), () =>
        previewMode
          ? savePreviewMaterialDraft({
              kind: input.kind,
              content: input.content,
              targetRole:
                input.targetRole.trim() === "" ? null : input.targetRole.trim(),
              applicationId:
                input.applicationId === "" ? null : input.applicationId,
            })
          : saveMaterialDraftAction(input),
      ),
    [previewMode, run],
  );

  const removeDraft = useCallback(
    (kind: MaterialKind) =>
      run(draftRemoveKey(kind), () =>
        previewMode
          ? removePreviewMaterialDraft(kind)
          : removeMaterialDraftAction({ kind }),
      ),
    [previewMode, run],
  );

  return {
    busyId,
    messageKey,
    error,
    notice,
    clearMessages,
    saveDraft,
    removeDraft,
  };
}
