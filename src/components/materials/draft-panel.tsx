"use client";

import { ScrollText, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  draftRemoveKey,
  draftSaveKey,
  type MaterialsActions,
} from "@/components/materials/use-materials-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { describeDraftFingerprint, draftDrift } from "@/lib/materials/backing";
import { formatMaterialDay } from "@/lib/materials/text";
import {
  MAX_DRAFT_LENGTH,
  MATERIAL_KIND_META,
  MIN_DRAFT_LENGTH,
  type DraftBuiltFrom,
  type MaterialDraftRecord,
  type MaterialKind,
} from "@/lib/materials/types";
import {
  MIN_JOB_DESCRIPTION_LENGTH,
  type JobApplicationRecord,
} from "@/lib/interview/types";

export function DraftPanel({
  kind,
  draft,
  applications,
  currentFingerprint,
  generatedText,
  actions,
}: {
  kind: MaterialKind;
  draft: MaterialDraftRecord | null;
  applications: JobApplicationRecord[];
  currentFingerprint: DraftBuiltFrom;
  generatedText: string;
  actions: MaterialsActions;
}) {
  const meta = MATERIAL_KIND_META[kind];
  const [content, setContent] = useState(draft?.content ?? "");
  const [targetRole, setTargetRole] = useState(draft?.targetRole ?? "");
  const [applicationId, setApplicationId] = useState(draft?.applicationId ?? "");

  const used = content.trim().length;
  const tooShort = used > 0 && used < MIN_DRAFT_LENGTH;
  const busySave = actions.busyId === draftSaveKey(kind);
  const busyRemove = actions.busyId === draftRemoveKey(kind);
  const reportsHere =
    actions.messageKey === draftSaveKey(kind) ||
    actions.messageKey === draftRemoveKey(kind);
  const selectable = applications.filter(
    (application) => application.description.trim().length >= MIN_JOB_DESCRIPTION_LENGTH,
  );
  const drift = draft?.builtFrom
    ? draftDrift({ saved: draft.builtFrom, current: currentFingerprint })
    : [];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/60 p-4">
      <div className="space-y-1.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScrollText aria-hidden="true" className="size-4" />
          Your own wording for the {meta.sentenceLabel}
        </h3>
        <p className="text-sm leading-6 text-muted">
          This box holds only what you typed. The app never writes into it, and it
          keeps one version per document, so saving again replaces what is in
          there. {draft
            ? `You last saved on ${
                formatMaterialDay(draft.updatedAt) ?? "a date this app cannot read"
              }.`
            : "Nothing is saved here yet."}
        </p>
      </div>

      {draft ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised/40 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">
              {draft.content.trim().length} characters saved
            </Badge>
            <Badge variant="muted">
              First saved{" "}
              {formatMaterialDay(draft.createdAt) ?? "a date this app cannot read"}
            </Badge>
            {draft.targetRole ? (
              <Badge variant="outline">Written for {draft.targetRole}</Badge>
            ) : null}
          </div>

          {draft.builtFrom ? (
            <>
              <p className="text-xs leading-5 text-muted-strong">
                {describeDraftFingerprint(draft.builtFrom)}
              </p>
              {drift.length > 0 ? (
                <div className="space-y-1.5 rounded-lg border-l-2 border-warning/70 bg-warning/8 py-2 pl-3 pr-2">
                  <p className="text-xs font-semibold text-foreground">
                    Your records have moved since you saved this
                  </p>
                  <ul className="space-y-1">
                    {drift.map((line, index) => (
                      <li
                        key={`drift-${index}`}
                        className="text-xs leading-5 text-muted-strong"
                      >
                        · {line}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs leading-5 text-muted">
                    Read the generated sections above against this list before you
                    send the saved wording anywhere.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted">
                  Nothing in your records has changed since this was saved, so the
                  counts above still describe what is on file.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs leading-5 text-warning">
              No count of your records was stored with this draft, so this screen
              cannot say what your workspace held when you saved it. The numbers
              are not guessed — read the sections above before sending this text.
            </p>
          )}

          <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background/40 p-3 text-sm leading-6 text-foreground">
            {draft.content}
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor={`draft-content-${kind}`}>
          Edit the wording you want to keep
        </Label>
        <Textarea
          id={`draft-content-${kind}`}
          value={content}
          rows={10}
          maxLength={MAX_DRAFT_LENGTH}
          className="min-h-52 font-mono text-xs leading-5"
          onChange={(event) => setContent(event.target.value)}
          placeholder={`Type your own version, or insert the text this app generated and change it. Example of what belongs here: one line about a project you finished, in your own words, with the link you stored for it.`}
        />
        <FieldHint>
          {used} of {MAX_DRAFT_LENGTH} characters used.
          {used === 0
            ? ` Nothing has been typed yet, so there is nothing to save.`
            : tooShort
              ? ` At least ${MIN_DRAFT_LENGTH} characters are needed before this app will call it a document rather than a title — ${MIN_DRAFT_LENGTH - used} more to go.`
              : " Long enough to be a document, so this app will store it."}
        </FieldHint>
        <Button
          size="sm"
          variant="ghost"
          className="h-auto max-w-full justify-start whitespace-normal py-2 text-left leading-5"
          disabled={content.trim() === generatedText.trim()}
          onClick={() => setContent(generatedText)}
        >
          Put the text this app generated into this box
        </Button>
        <FieldHint>
          That button replaces what is in the box with the generated lines. It
          saves nothing by itself — the wording stays yours until you press save.
        </FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`draft-role-${kind}`}>
            The role this wording was written for
          </Label>
          <Input
            id={`draft-role-${kind}`}
            value={targetRole}
            maxLength={160}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="Exactly as the posting titles it, or leave it empty"
          />
          <FieldHint>
            Text you typed. It is stored so a draft you wrote for one job is not
            mistaken later for the one you sent somewhere else.
          </FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`draft-application-${kind}`}>
            Link it to a saved role
          </Label>
          <Select
            id={`draft-application-${kind}`}
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
          >
            <option value="">Not linked to a saved role</option>
            {selectable.map((application) => (
              <option key={application.id} value={application.id}>
                {application.roleTitle} at {application.company}
              </option>
            ))}
          </Select>
          <FieldHint>
            {selectable.length === 0
              ? `No saved role here carries enough posting text to link to, so the list is empty. Save a posting with its text on the interview screen first.`
              : `${selectable.length} of ${applications.length} saved ${
                  applications.length === 1 ? "role" : "roles"
                } ${
                  selectable.length === 1 ? "carries" : "carry"
                } enough posting text to be offered here. Deleting the saved role later does not delete this wording.`}
          </FieldHint>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={busySave || tooShort || used === 0}
          onClick={() =>
            void actions.saveDraft({ kind, content, targetRole, applicationId })
          }
        >
          {busySave
            ? "Saving…"
            : draft
              ? "Replace my saved wording"
              : "Save my wording"}
        </Button>
        {draft ? (
          <Button
            size="sm"
            variant="danger"
            disabled={busyRemove}
            onClick={() => {
              if (
                window.confirm(
                  `Remove your saved ${meta.sentenceLabel} wording? The generated lines above stay, but what you typed here cannot be brought back.`,
                )
              ) {
                void actions.removeDraft(kind).then((ok) => {
                  if (ok) setContent("");
                });
              }
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {busyRemove ? "Removing…" : "Remove my saved wording"}
          </Button>
        ) : null}
      </div>

      {reportsHere && actions.error ? (
        <Alert variant="danger" title="That draft was not saved">
          {actions.error}
        </Alert>
      ) : null}
      {reportsHere && actions.notice ? (
        <Alert variant="success" title="What happened when you saved">
          {actions.notice}
        </Alert>
      ) : null}

      {tooShort ? (
        <FieldHint>
          Saving is blocked until the box holds at least {MIN_DRAFT_LENGTH}{" "}
          characters, because below that this app would be storing a heading and
          calling it a document.
        </FieldHint>
      ) : null}
    </div>
  );
}
