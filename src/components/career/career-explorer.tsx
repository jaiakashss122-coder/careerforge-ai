"use client";

import {
  Compass,
  Route,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExperimentBoard } from "@/components/career/experiment-board";
import { RoleProfileBoard } from "@/components/career/role-profile-board";
import { useCareerActions } from "@/components/career/use-career-actions";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldHint, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import {
  MAX_OVERRIDE_REASON_LENGTH,
  MIN_OVERRIDE_REASON_LENGTH,
} from "@/lib/career/action-types";
import {
  EVIDENCE_ADJUSTMENT_MAX,
  buildCareerExplorationModel,
  type CareerConfidence,
  type RankedCareer,
} from "@/lib/career/exploration";
import type {
  CareerExperimentRecord,
  CareerExperimentStatus,
  CareerPreferenceRecord,
} from "@/lib/career/types";
import { CAREER_TRACKS, type CareerTrackSlug } from "@/lib/career/tracks";
import { getTrackExperimentBrief } from "@/lib/assessment/career-fit";
import type { AssessmentSummary } from "@/lib/assessment/types";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import type { Profile } from "@/lib/profile/schema";
import type { ProjectRecord } from "@/lib/projects/types";
import { getLatestAssessment } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const CONFIDENCE_VARIANT: Record<CareerConfidence, BadgeVariant> = {
  assessment_only: "muted",
  one_experiment: "accent",
  experiment_and_project: "success",
};

const EXPERIMENT_VARIANT: Record<CareerExperimentStatus, BadgeVariant> = {
  not_started: "muted",
  in_progress: "accent",
  completed: "success",
};

const EXPERIMENT_STATUS_TEXT: Record<CareerExperimentStatus, string> = {
  not_started: "Not tested",
  in_progress: "Started, not finished",
  completed: "Tested, reflection recorded",
};

function ExplorerSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your career exploration</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function scoreBreakdown(entry: RankedCareer) {
  if (entry.reasons.length === 0) {
    return "Your assessment has no career answers recorded and no experiment has been tested, so this role sits at 0 of 100 and the order below is alphabetical rather than evidence-based.";
  }

  if (!entry.reflection) {
    return `All ${entry.combinedScore} of 100 comes from your assessment answers and your saved target role. Nothing has been tested, so this is a hypothesis.`;
  }

  const sign = entry.evidenceAdjustment >= 0 ? "+" : "−";

  return `Your assessment gives ${entry.fitScore} of 100. Your reflection ${
    entry.evidenceAdjustment >= 0 ? "raises" : "lowers"
  } it by ${sign}${Math.abs(entry.evidenceAdjustment)}, giving ${
    entry.combinedScore
  } of 100. A reflection can only move a score by ${EVIDENCE_ADJUSTMENT_MAX} points in either direction.`;
}

function RankRow({
  entry,
  rank,
}: {
  entry: RankedCareer;
  rank: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-raised/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted">
              {rank} of {CAREER_TRACKS.length}
            </span>
            <Badge variant={CONFIDENCE_VARIANT[entry.confidence]}>
              {entry.confidenceLabel}
            </Badge>
            <Badge variant={EXPERIMENT_VARIANT[entry.experimentStatus ?? "not_started"]}>
              {EXPERIMENT_STATUS_TEXT[entry.experimentStatus ?? "not_started"]}
            </Badge>
            {entry.chosen ? <Badge variant="success">Your choice</Badge> : null}
            {entry.alternative ? (
              <Badge variant="outline">Kept as alternative</Badge>
            ) : null}
            {entry.profileTarget ? (
              <Badge variant="muted">Target role in your profile</Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground">{entry.name}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {entry.family}
          </p>
        </div>
        <div className="w-full max-w-xs shrink-0 space-y-2">
          <p className="text-right text-2xl font-semibold tabular-nums text-foreground">
            {entry.combinedScore}
            <span className="text-sm font-normal text-muted"> / 100</span>
          </p>
          <Progress
            value={entry.combinedScore}
            label={`${entry.name} score ${entry.combinedScore} of 100`}
          />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">{scoreBreakdown(entry)}</p>
      <p className="mt-2 text-sm leading-6 text-muted-strong">
        {entry.confidenceNote}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          {open ? "Hide the evidence" : "Show the evidence"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Why the assessment places it here
            </p>
            {entry.reasons.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                Your assessment has no career answers recorded, so no reason can
                be given for this position.
              </p>
            ) : (
              <ul className="space-y-1 text-sm leading-6 text-muted">
                {entry.reasons.map((reason) => (
                  <li key={reason}>· {reason}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Supporting evidence ({entry.supportingEvidence.length})
            </p>
            {entry.supportingEvidence.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                Nothing beyond the assessment answers yet.
              </p>
            ) : (
              <ul className="space-y-1 text-sm leading-6 text-muted">
                {entry.supportingEvidence.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              The experiment that would test it
            </p>
            {entry.experimentTitle ? (
              <>
                <p className="text-sm leading-6 text-muted-strong">
                  {entry.experimentTitle}
                </p>
                <p className="text-sm leading-6 text-muted">
                  {getTrackExperimentBrief(entry.slug)}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">
                No experiment is defined for this role, so the score cannot be
                tested here.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChoiceCard({
  preference,
  actions,
}: {
  preference: CareerPreferenceRecord | null;
  actions: ReturnType<typeof useCareerActions>;
}) {
  const [specialization, setSpecialization] = useState<CareerTrackSlug | "">(
    preference?.specializationChoice ?? "",
  );
  const [alternative, setAlternative] = useState<CareerTrackSlug | "">(
    preference?.alternativeChoice ?? "",
  );
  const [reason, setReason] = useState(preference?.overrideReason ?? "");

  const trimmedReason = reason.trim();
  const sameRole =
    specialization !== "" && alternative !== "" && specialization === alternative;
  const reasonTooShort = trimmedReason.length < MIN_OVERRIDE_REASON_LENGTH;
  const incomplete =
    specialization === "" || alternative === "" || sameRole || reasonTooShort;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Your own call
        </CardTitle>
        <CardDescription>
          The ranking is a suggestion based on what you have told the workspace.
          You can pick a different specialization and the app keeps your choice
          and your reason visible, above the ranking, even when the numbers
          disagree. Choosing does not change your score, your roadmap, or what
          the experiments record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="specialization-choice">Role you want to work toward</Label>
            <Select
              id="specialization-choice"
              value={specialization}
              onChange={(event) =>
                setSpecialization(event.target.value as CareerTrackSlug | "")
              }
            >
              <option value="">Choose a role</option>
              {CAREER_TRACKS.map((track) => (
                <option key={track.slug} value={track.slug}>
                  {track.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alternative-choice">Second role to keep in view</Label>
            <Select
              id="alternative-choice"
              value={alternative}
              onChange={(event) =>
                setAlternative(event.target.value as CareerTrackSlug | "")
              }
            >
              <option value="">Choose a role</option>
              {CAREER_TRACKS.map((track) => (
                <option key={track.slug} value={track.slug}>
                  {track.name}
                </option>
              ))}
            </Select>
            <FieldHint>
              Two different roles, so the comparison stays meaningful.
            </FieldHint>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="override-reason">Why this choice over the ranking</Label>
          <Textarea
            id="override-reason"
            value={reason}
            maxLength={MAX_OVERRIDE_REASON_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What you know about your own situation that the assessment answers cannot see."
          />
          <FieldHint>
            {trimmedReason.length} of {MAX_OVERRIDE_REASON_LENGTH} characters
            used. At least {MIN_OVERRIDE_REASON_LENGTH} are needed, so the
            reason is still readable to you later.
          </FieldHint>
          {sameRole ? (
            <FieldHint>
              Pick two different roles. Right now both fields hold the same one.
            </FieldHint>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={incomplete || actions.busyId === "choice:save"}
            onClick={() => {
              if (specialization === "" || alternative === "") return;

              void actions.saveChoice({
                specialization,
                alternative,
                reason: trimmedReason,
              });
            }}
          >
            {actions.busyId === "choice:save" ? "Saving…" : "Save my choice"}
          </Button>
          {preference?.specializationChoice ? (
            <Button
              size="sm"
              variant="danger"
              disabled={actions.busyId === "choice:remove"}
              onClick={() => void actions.removeChoice()}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {actions.busyId === "choice:remove"
                ? "Removing…"
                : "Remove my choice"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function CareerExplorer({
  mode,
  initialSummary,
  initialExperiments,
  initialProjects,
  initialPreference,
  initialProfile,
  initialHasAssessment,
}: {
  mode: "preview" | "supabase";
  initialSummary: AssessmentSummary | null;
  initialExperiments: CareerExperimentRecord[];
  initialProjects: ProjectRecord[];
  initialPreference: CareerPreferenceRecord | null;
  initialProfile: Profile | null;
  initialHasAssessment: boolean;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );
  const { profile } = usePreviewProfileSnapshot(initialProfile, previewMode);

  const experiments = previewMode
    ? workspace.careerExperiments
    : initialExperiments;
  const preference = previewMode
    ? workspace.careerPreferences[0] ?? null
    : initialPreference;

  const model = useMemo(
    () =>
      buildCareerExplorationModel({
        summary: previewMode
          ? getLatestAssessment(workspace.assessments)?.summary ?? null
          : initialSummary,
        experiments,
        projects: previewMode ? workspace.projects : initialProjects,
        preference,
        profileTarget: profile?.targetCareerSlug ?? null,
      }),
    [
      experiments,
      initialProjects,
      initialSummary,
      preference,
      previewMode,
      profile,
      workspace,
    ],
  );

  const actions = useCareerActions({ previewMode });

  if (previewMode && !hydrated) {
    return <ExplorerSkeleton />;
  }

  const hasAssessment = previewMode
    ? workspace.assessments.length > 0
    : initialHasAssessment;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Career Explorer"
        title="Test the work before you choose the title"
        description={`Nine adjacent data and AI roles are ranked here, and each one has an experiment you can actually do. ${model.counts.completedCount} of ${model.ranked.length} areas have a finished experiment behind them, ${model.counts.inProgressCount} ${model.counts.inProgressCount === 1 ? "is" : "are"} in progress, and ${model.untestedTrackCount} still rest on assessment answers alone. A score is only a hypothesis until the work is linked.`}
        actions={
          <>
            <Badge variant="muted">
              {model.ranked.length} roles ranked ·{" "}
              {model.completedProjectTracks.length}{" "}
              {model.completedProjectTracks.length === 1 ? "project area" : "project areas"}{" "}
              finished
            </Badge>
            <Link
              href="/projects"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Route aria-hidden="true" className="size-4" />
              Project Lab
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          Experiments, reflections and your recorded choice are stored in this
          browser only, because Supabase is not configured. The same rules still
          run here: nothing counts as tested without a link to the work, and no
          choice changes a score.
        </Alert>
      ) : null}

      {!hasAssessment ? (
        <Alert variant="info" title="The ranking has nothing to work from yet">
          No skills assessment is stored for this account, so all nine roles sit
          at 0 of 100 and the order is alphabetical rather than evidence-based.
          Finish the assessment first, then come back and test the roles you
          want to know more about.
        </Alert>
      ) : null}

      {actions.error ? (
        <Alert variant="danger" title="That change was blocked">
          {actions.error}
        </Alert>
      ) : null}
      {actions.notice ? (
        <Alert variant="success" title="Saved">
          {actions.notice}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass aria-hidden="true" className="size-4" />
            Where your specialization stands
          </CardTitle>
          <CardDescription>{model.stage.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={model.stage.ready ? "success" : "warning"}>
              {model.stage.label}
            </Badge>
            {model.override ? (
              <Badge variant="accent">Your recorded choice is in use</Badge>
            ) : null}
          </div>

          {model.override ? (
            <div className="space-y-1 rounded-xl border border-border bg-surface/40 p-4">
              <p className="text-sm font-semibold text-foreground">
                {model.override.headline}
              </p>
              <p className="text-sm leading-6 text-muted">
                {model.override.detail}
              </p>
            </div>
          ) : null}

          {model.stage.missing.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                Still missing ({model.stage.missing.length})
              </p>
              <ul className="space-y-1 text-sm leading-6 text-muted">
                {model.stage.missing.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Nothing is missing from the evidence set. The decision is still
              yours, and the ranking will move if you record another
              experiment.
            </p>
          )}
        </CardContent>
      </Card>

      <ChoiceCard preference={preference} actions={actions} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4" />
            Ranked roles
          </CardTitle>
          <CardDescription>
            Highest combined score first. A higher number means a better match
            with what you have told the workspace so far, not that the role is
            easier to get or better paid. Open a role to see the reasons, the
            evidence, and the experiment that would test it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {model.ranked.map((entry, index) => (
            <RankRow key={entry.slug} entry={entry} rank={index + 1} />
          ))}
        </CardContent>
      </Card>

      <ExperimentBoard experiments={experiments} actions={actions} />

      <RoleProfileBoard />
    </div>
  );
}
