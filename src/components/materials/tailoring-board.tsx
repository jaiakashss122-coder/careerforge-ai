"use client";

import { Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExportText } from "@/components/materials/export-text";
import { MaterialBlocks } from "@/components/materials/material-blocks";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint, Label, Select } from "@/components/ui/input";
import type { SkillProof } from "@/lib/materials/backing";
import { tailorToPosting } from "@/lib/materials/tailoring";
import { renderBlocksAsText } from "@/lib/materials/text";
import { RESUME_LISTABLE_PERCENT } from "@/lib/materials/types";
import {
  MIN_JOB_DESCRIPTION_LENGTH,
  type JobApplicationRecord,
} from "@/lib/interview/types";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

/**
 * Writing for one posting. The interview screen already compares a pasted
 * posting against your records; this turns the same reading into the two lists
 * that actually go into an application — what you may write, and what you must
 * leave out.
 */
export function TailoringBoard({
  workspace,
  proofs,
  applications,
}: {
  workspace: WorkspaceSnapshot;
  proofs: SkillProof[];
  applications: JobApplicationRecord[];
}) {
  const [applicationId, setApplicationId] = useState("");
  const [generatedOn] = useState(() => new Date().toISOString());

  const selectable = applications.filter(
    (application) =>
      application.description.trim().length >= MIN_JOB_DESCRIPTION_LENGTH,
  );

  const tailoring = useMemo(
    () => {
      const application = applications.find(
        (entry) => entry.id === applicationId,
      );

      if (
        !application ||
        application.description.trim().length < MIN_JOB_DESCRIPTION_LENGTH
      ) {
        return null;
      }

      return tailorToPosting({
        workspace,
        proofs,
        postingText: application.description,
        application,
      });
    },
    [applicationId, applications, workspace, proofs],
  );

  const exportText = useMemo(
    () =>
      tailoring
        ? renderBlocksAsText({
            title: `Application wording for ${tailoring.target.label}`,
            blocks: tailoring.blocks,
            generatedOn,
          })
        : "",
    [tailoring, generatedOn],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target aria-hidden="true" className="size-4" />
          Written for one posting
        </CardTitle>
        <CardDescription>
          Pick a saved role that carries its posting text. This app matches that
          text against the {RESUME_LISTABLE_PERCENT}-of-100 line it uses
          everywhere else, and lists what you may write for this job and what you
          must not. It does not decide whether you should apply, and it has not
          checked that the role exists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {selectable.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No saved role here carries posting text yet"
            description={
              applications.length === 0
                ? "Nothing is saved on the roles tracker yet. Save a role with the responsibilities and requirements pasted into it, and this screen gains a posting to write against."
                : `${applications.length} ${
                    applications.length === 1 ? "role is" : "roles are"
                  } saved, and none of them carries posting text long enough to compare. Open a saved role on the interview screen and paste its requirements.`
            }
            action={
              <Link
                href="/interview"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Go to the roles you are tracking
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tailoring-application">
                Write for which saved role
              </Label>
              <Select
                id="tailoring-application"
                value={applicationId}
                onChange={(event) => setApplicationId(event.target.value)}
              >
                <option value="">Choose a saved role</option>
                {selectable.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.roleTitle} at {application.company}
                  </option>
                ))}
              </Select>
              <FieldHint>
                {selectable.length} of {applications.length} saved{" "}
                {applications.length === 1 ? "role" : "roles"}{" "}
                {selectable.length === 1 ? "carries" : "carry"} posting text this
                app can read.
              </FieldHint>
            </div>

            {tailoring ? (
              <>
                <div className="space-y-2.5 rounded-2xl border border-border bg-surface-raised/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">
                      {tailoring.counts.claimable} of{" "}
                      {tailoring.counts.postingSkills} skills named by this
                      posting can be written
                    </Badge>
                    <Badge variant="danger">
                      {tailoring.counts.heldBack} cannot be backed by your records
                    </Badge>
                    <Badge variant="muted">
                      {tailoring.counts.untested} of those have no record at all
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-strong">
                    {tailoring.summary}
                  </p>
                </div>

                <MaterialBlocks blocks={tailoring.blocks} />

                <ExportText
                  text={exportText}
                  label={`Text to copy for ${tailoring.target.label}`}
                  characterNote={`${exportText.length} characters. This comparison has no saved wording of its own — copy what you want into the résumé box above, or into your own document, and keep the two lists here beside it while you write.`}
                />
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Nothing is shown until a role is chosen, because the reading is
                different for every posting and this app will not guess which one
                you mean.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
