"use client";

import {
  ArrowRight,
  CircleCheck,
  FolderKanban,
  Lock,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProjectWorkbench } from "@/components/projects/project-workbench";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import type { SkillEvidenceRecord } from "@/lib/evidence/types";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import type { Profile } from "@/lib/profile/schema";
import {
  buildReadinessContext,
  evaluateProjectReadiness,
  PREREQUISITE_PERCENT_THRESHOLD,
  recommendProjects,
  type ProjectReadinessContext,
} from "@/lib/projects/readiness";
import {
  PROJECT_TEMPLATES,
  getProjectTemplate,
  getTemplateEstimatedMinutes,
} from "@/lib/projects/templates";
import {
  PROJECT_LEVELS,
  PROJECT_LEVEL_META,
  PROJECT_STATUS_LABELS,
  type ProjectLevel,
  type ProjectReadiness,
  type ProjectRecord,
  type ProjectStatus,
} from "@/lib/projects/types";
import { getActiveRoadmap, getLatestAssessment } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { formatMinutes } from "@/lib/utils";
import { useProjectFeedback } from "./use-project-feedback";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const LEVEL_VARIANT: Record<ProjectLevel, BadgeVariant> = {
  foundation: "success",
  core: "accent",
  applied: "outline",
  advanced: "warning",
};

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  planned: "muted",
  in_progress: "accent",
  completed: "success",
  paused: "warning",
};

function LabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your projects</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

export function ProjectLab({
  mode,
  initialProjects,
  initialEvidence,
  initialReadinessContext,
  initialProfile,
  initialHasAssessment,
}: {
  mode: "preview" | "supabase";
  initialProjects: ProjectRecord[];
  initialEvidence: SkillEvidenceRecord[];
  initialReadinessContext: ProjectReadinessContext | null;
  initialProfile: Profile | null;
  initialHasAssessment: boolean;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );
  const { profile } = usePreviewProfileSnapshot(initialProfile, previewMode);

  const weeklyHours = profile?.weeklyHours ?? 10;
  const projects = previewMode ? workspace.projects : initialProjects;
  const evidence = previewMode ? workspace.evidence : initialEvidence;
  const hasAssessment = previewMode
    ? workspace.assessments.length > 0
    : initialHasAssessment;

  const readinessContext = useMemo(() => {
    if (previewMode) {
      return buildReadinessContext({
        assessment: getLatestAssessment(workspace.assessments)?.summary ?? null,
        roadmap: getActiveRoadmap(workspace.roadmaps),
        projects: workspace.projects,
        weeklyHours,
      });
    }

    return (
      initialReadinessContext ??
      buildReadinessContext({
        assessment: null,
        roadmap: null,
        projects: initialProjects,
        weeklyHours,
      })
    );
  }, [
    initialProjects,
    initialReadinessContext,
    previewMode,
    weeklyHours,
    workspace,
  ]);

  const libraryReadiness = useMemo(() => {
    const bySlug: Record<string, ProjectReadiness> = {};

    for (const template of PROJECT_TEMPLATES) {
      bySlug[template.slug] = evaluateProjectReadiness(template, readinessContext);
    }

    return bySlug;
  }, [readinessContext]);

  const [levelFilter, setLevelFilter] = useState<"all" | ProjectLevel>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const actions = useProjectFeedback({ previewMode, weeklyHours });

  if (previewMode && !hydrated) {
    return <LabSkeleton />;
  }

  const startedSlugs = new Set(
    projects
      .map((project) => project.templateSlug)
      .filter((slug): slug is string => typeof slug === "string"),
  );
  const everythingLocked = Object.values(libraryReadiness).every(
    (readiness) => readiness.locked,
  );
  const recommendations = recommendProjects(readinessContext, { limit: 3 });
  const library = PROJECT_TEMPLATES.filter(
    (template) => levelFilter === "all" || template.level === levelFilter,
  );
  const visibleProjects = projects.filter(
    (project) => statusFilter === "all" || project.status === statusFilter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Project Lab"
        title="Projects that produce evidence, not screenshots"
        description={`Ten starter projects with ordered steps, links to the work you actually produced, and a rubric — six criteria you score yourself on. Advanced work stays locked until its prerequisites have real evidence behind them. Everything here is ranked against the ${weeklyHours} hours a week you said you have.`}
        actions={
          <>
            <Badge variant="muted">
              {projects.length} started ·{" "}
              {projects.filter((project) => project.status === "completed")
                .length}{" "}
              completed
            </Badge>
            <Link
              href="/roadmap"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Route aria-hidden="true" className="size-4" />
              Roadmap
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          Projects are stored in this browser only, because Supabase is not
          configured. The same prerequisite rules still run — nothing is
          unlocked by guessing.
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

      {everythingLocked && projects.length === 0 ? (
        <Alert variant="info" title="Nothing unlocked yet">
          Every template below is honestly locked because no prerequisite has
          demonstrated evidence behind it. A prerequisite is met by a scored
          assessment section at {PREREQUISITE_PERCENT_THRESHOLD}% or higher, a
          completed roadmap task covering that skill, or an earlier project that
          used it. Your degree and your confidence are not accepted as
          substitutes.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4" />
            Recommended next
          </CardTitle>
          <CardDescription>
            Ranked by unlocked prerequisites, match with your suggested career
            directions, the skills your assessment flagged as gaps, and the time
            you really have. A higher fit score means a better match right now,
            not a more impressive project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted">
              Every template is already in your lab, so there is nothing left to
              recommend.
            </p>
          ) : (
            recommendations.map((recommendation) => (
              <TemplateRow
                key={recommendation.templateSlug}
                templateSlug={recommendation.templateSlug}
                reasons={recommendation.reasons}
                fitScore={recommendation.fitScore}
                readiness={recommendation.readiness}
                started={startedSlugs.has(recommendation.templateSlug)}
                busy={actions.busyId === `start:${recommendation.templateSlug}`}
                onStart={() => void actions.start(recommendation.templateSlug)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban aria-hidden="true" className="size-4" />
                Project library
              </CardTitle>
              <CardDescription>
                A template is a project brief written out in advance: the goal,
                the dataset to use, and the steps. Starting one creates your own
                copy with its own milestones, links, and evidence, and the
                template itself never changes. {PROJECT_TEMPLATES.length}{" "}
                templates, each with motivation, dataset guidance, milestones,
                folder structure, a testing checklist, metrics, and interview
                questions.
              </CardDescription>
            </div>
            <div className="w-full space-y-1.5 sm:w-56">
              <Label htmlFor="project-level-filter">Level</Label>
              <Select
                id="project-level-filter"
                value={levelFilter}
                onChange={(event) =>
                  setLevelFilter(
                    event.target.value === "all"
                      ? "all"
                      : (event.target.value as ProjectLevel),
                  )
                }
              >
                <option value="all">All levels</option>
                {PROJECT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {PROJECT_LEVEL_META[level].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {library.map((template) => (
            <TemplateRow
              key={template.slug}
              templateSlug={template.slug}
              reasons={[]}
              readiness={libraryReadiness[template.slug]}
              started={startedSlugs.has(template.slug)}
              busy={actions.busyId === `start:${template.slug}`}
              onStart={() => void actions.start(template.slug)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Your projects</CardTitle>
              <CardDescription>
                Milestones, links, rubric, and the evidence each finished
                project created.
              </CardDescription>
            </div>
            <div className="w-full space-y-1.5 sm:w-56">
              <Label htmlFor="project-status-filter">Status</Label>
              <Select
                id="project-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value === "all"
                      ? "all"
                      : (event.target.value as ProjectStatus),
                  )
                }
              >
                <option value="all">Every status</option>
                {(["planned", "in_progress", "paused", "completed"] as const).map(
                  (status) => (
                    <option key={status} value={status}>
                      {PROJECT_STATUS_LABELS[status]}
                    </option>
                  ),
                )}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No projects started yet"
              description="Pick a recommended project above. Starting one is reversible and records no evidence — nothing counts until you submit milestones and link a repository."
              action={
                hasAssessment ? (
                  <Link
                    href="/roadmap"
                    className={buttonStyles({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Review your roadmap
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/assessment"
                    className={buttonStyles({ size: "sm" })}
                  >
                    Take the assessment
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                )
              }
            />
          ) : null}

          {projects.length > 0 && visibleProjects.length === 0 ? (
            <p className="text-sm text-muted">
              No project has that status right now. Change the filter to see the
              others.
            </p>
          ) : null}

          {visibleProjects.map((project) => {
            const template = getProjectTemplate(project.templateSlug);
            const submitted = project.milestones.filter(
              (milestone) => milestone.status === "completed",
            ).length;
            const projectEvidence = evidence.filter(
              (entry) =>
                entry.sourceType === "project" && entry.sourceId === project.id,
            );
            const isOpen = openProjectId === project.id;

            return (
              <div
                key={project.id}
                className="rounded-2xl border border-border bg-surface/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {template ? (
                        <Badge variant={LEVEL_VARIANT[template.level]}>
                          {PROJECT_LEVEL_META[template.level].label}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Custom project</Badge>
                      )}
                      <Badge variant={STATUS_VARIANT[project.status]}>
                        {PROJECT_STATUS_LABELS[project.status]}
                      </Badge>
                      {projectEvidence.length > 0 ? (
                        <Badge variant="muted">
                          {projectEvidence.length} evidence{" "}
                          {projectEvidence.length === 1 ? "row" : "rows"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {project.title}
                    </p>
                    <Progress
                      value={
                        project.milestones.length === 0
                          ? 0
                          : (submitted / project.milestones.length) * 100
                      }
                      label={`Milestones submitted for ${project.title}`}
                      className="max-w-md"
                    />
                    <FieldHint>
                      {submitted} of {project.milestones.length} milestones
                      submitted ·{" "}
                      {template
                        ? `${formatMinutes(getTemplateEstimatedMinutes(template))} of guided work in the template`
                        : "no template attached to this project"}
                    </FieldHint>
                  </div>
                  <Button
                    variant={isOpen ? "secondary" : "primary"}
                    size="sm"
                    aria-label={
                      isOpen
                        ? `Close the details for ${project.title}`
                        : `Open the milestones, links, and rubric for ${project.title}`
                    }
                    onClick={() => setOpenProjectId(isOpen ? null : project.id)}
                  >
                    {isOpen ? "Close" : "Open project"}
                    <ArrowRight
                      aria-hidden="true"
                      className={isOpen ? "size-3.5 -rotate-90" : "size-3.5"}
                    />
                  </Button>
                </div>

                {isOpen ? (
                  <div className="border-t border-border/70 p-4 sm:p-5">
                    <ProjectWorkbench
                      project={project}
                      template={template}
                      evidence={projectEvidence}
                      actions={actions}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex-col items-start gap-1">
          <FieldHint>
            Evidence rules: a milestone only counts once you link the work you
            produced for it, a project only completes with every milestone
            submitted and a repository linked, and reopening withdraws the
            evidence rows it created.
          </FieldHint>
        </CardFooter>
      </Card>
    </div>
  );
}

function TemplateRow({
  templateSlug,
  reasons,
  fitScore,
  readiness,
  started,
  busy,
  onStart,
}: {
  templateSlug: string;
  reasons: string[];
  fitScore?: number;
  readiness: ProjectReadiness;
  started: boolean;
  busy: boolean;
  onStart: () => void;
}) {
  const template = getProjectTemplate(templateSlug);

  if (!template) return null;

  const blockers = readiness.lockReasons;
  const blockerSet = new Set(blockers);
  const supportingReasons = reasons.filter((reason) => !blockerSet.has(reason));

  return (
    <div className="rounded-xl border border-border bg-surface-raised/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={LEVEL_VARIANT[template.level]}>
              {PROJECT_LEVEL_META[template.level].label}
            </Badge>
            {readiness.locked ? (
              <Badge variant="outline">
                <Lock aria-hidden="true" className="size-3" />
                Locked
              </Badge>
            ) : (
              <Badge variant="success">
                <CircleCheck aria-hidden="true" className="size-3" />
                Unlocked
              </Badge>
            )}
            {typeof fitScore === "number" ? (
              <Badge variant="muted">Fit {fitScore}</Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {template.title}
          </p>
          <p className="text-sm leading-6 text-muted">{template.summary}</p>
          <FieldHint>
            {template.estimatedHours} estimated hours ·{" "}
            {readiness.timeFit.estimatedWeeks}{" "}
            {readiness.timeFit.estimatedWeeks === 1 ? "week" : "weeks"} at{" "}
            {readiness.timeFit.weeklyHours} hours a week
          </FieldHint>
        </div>

        <Button
          size="sm"
          variant={readiness.locked ? "outline" : "primary"}
          disabled={started || busy || readiness.locked}
          onClick={onStart}
        >
          {started
            ? "Already started"
            : busy
              ? "Starting…"
              : readiness.locked
                ? "Locked"
                : "Start project"}
          <span className="sr-only">: {template.title}</span>
        </Button>
      </div>

      {supportingReasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-muted">
          {supportingReasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden="true" className="text-[#9aa7c7]">
                •
              </span>
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      {readiness.locked && blockers.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-warning">
          {blockers.join(" ")} Unlock it by finishing the matching roadmap tasks
          or the earlier projects in this library.
        </p>
      ) : null}

      {readiness.prerequisites.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {readiness.prerequisites.map((prerequisite) => (
            <Badge
              key={prerequisite.skillSlug}
              variant={prerequisite.met ? "success" : "warning"}
              title={prerequisite.reason}
            >
              {prerequisite.skillName}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
