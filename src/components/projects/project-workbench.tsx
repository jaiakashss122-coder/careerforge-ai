"use client";

import {
  CircleCheck,
  ExternalLink,
  FileText,
  GitBranch,
  ListChecks,
  Lock,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldHint, Input, Label, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { SkillEvidenceRecord } from "@/lib/evidence/types";
import { summariseRubric } from "@/lib/projects/readiness";
import {
  PROJECT_LEVEL_META,
  PROJECT_RUBRIC,
  PROJECT_STATUS_LABELS,
  RUBRIC_SCALE,
  type ProjectRecord,
  type ProjectSelfAssessment,
  type ProjectTemplate,
} from "@/lib/projects/types";
import { getProjectTemplateMilestone } from "@/lib/projects/templates";
import { getSkillName } from "@/lib/skills/catalog";
import { formatMinutes } from "@/lib/utils";
import type { ProjectFeedback } from "./use-project-feedback";

const MILESTONE_STATUS: Record<
  ProjectRecord["milestones"][number]["status"],
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Not submitted", variant: "muted" },
  in_progress: { label: "In progress", variant: "accent" },
  completed: { label: "Submitted", variant: "success" },
};

function isSafeLink(value: string | null) {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value);
}

export function ProjectWorkbench({
  project,
  template,
  evidence,
  actions,
}: {
  project: ProjectRecord;
  template: ProjectTemplate | null;
  evidence: SkillEvidenceRecord[];
  actions: ProjectFeedback;
}) {
  const [artifactUrls, setArtifactUrls] = useState<Record<string, string>>({});
  const [repoDraft, setRepoDraft] = useState(project.repoUrl ?? "");
  const [deploymentDraft, setDeploymentDraft] = useState(
    project.deploymentUrl ?? "",
  );
  const [rubricDraft, setRubricDraft] = useState<
    ProjectSelfAssessment["scores"]
  >(project.selfAssessment?.scores ?? {});
  const [reflection, setReflection] = useState(
    project.selfAssessment?.reflection ?? "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const milestones = project.milestones
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;
  const rubric = summariseRubric({
    version: 1,
    scores: rubricDraft,
    reflection,
    updatedAt: project.selfAssessment?.updatedAt ?? "",
  });
  const busy = actions.busyId;
  const locked = project.status === "completed";

  async function submitMilestone(milestoneId: string, evidenceUrl: string) {
    const ok = await actions.submitMilestone({
      projectId: project.id,
      milestoneId,
      evidenceUrl,
    });

    if (ok) setArtifactUrls((current) => ({ ...current, [milestoneId]: "" }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {template ? (
              <Badge variant="outline">
                {PROJECT_LEVEL_META[template.level].label}
              </Badge>
            ) : null}
            <Badge
              variant={
                project.status === "completed"
                  ? "success"
                  : project.status === "paused"
                    ? "warning"
                    : "accent"
              }
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            {evidence.length > 0 ? (
              <Badge variant="muted">
                {evidence.length} skill {evidence.length === 1 ? "link" : "links"}{" "}
                recorded
              </Badge>
            ) : null}
          </div>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>{project.problemStatement}</CardDescription>
          <Progress
            value={
              milestones.length === 0
                ? 0
                : (completedMilestones / milestones.length) * 100
            }
            label="Submitted milestones"
          />
          <CardDescription>
            {completedMilestones} of {milestones.length} milestones submitted
            with a link to the work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {template ? (
            <div className="space-y-3 text-sm leading-6 text-muted-strong">
              <div>
                <p className="font-semibold text-foreground">Why this project</p>
                <p>{template.motivation}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Data</p>
                <p>{template.datasetGuidance.source}</p>
                <p className="text-muted">{template.datasetGuidance.note}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                  {template.datasetGuidance.alternatives.map((alternative) => (
                    <li key={alternative}>{alternative}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Alert variant="warning" title="No template attached">
              This project was not created from the current template library, so
              milestone guidance and checklists below are limited to what is
              stored on the project itself.
            </Alert>
          )}

          {isSafeLink(project.repoUrl) ||
          isSafeLink(project.deploymentUrl) ? (
            <div className="flex flex-wrap gap-3">
              {isSafeLink(project.repoUrl) ? (
                <a
                  href={project.repoUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#c7d0ff] hover:underline"
                >
                  <GitBranch aria-hidden="true" className="size-4" />
                  Repository
                </a>
              ) : null}
              {isSafeLink(project.deploymentUrl) ? (
                <a
                  href={project.deploymentUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#c7d0ff] hover:underline"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Deployment
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks aria-hidden="true" className="size-4" />
            Milestones
          </CardTitle>
          <CardDescription>
            Ordered on purpose: an earlier step stays open until you link the
            work you produced for it. A milestone is submitted work, not an
            intention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {locked ? (
            <Alert variant="info">
              Reopen the project to change milestones. Reopening withdraws the
              skill evidence recorded from it.
            </Alert>
          ) : null}

          {milestones.length === 0 ? (
            <p className="text-sm text-muted">
              This project has no milestones stored, so it cannot be completed
              or create evidence yet.
            </p>
          ) : null}

          {milestones.map((milestone, index) => {
            const guidance = template
              ? getProjectTemplateMilestone(template.slug, milestone.templateKey ?? "")
              : null;
            const key = `${project.id}:${milestone.id}`;
            const draft = artifactUrls[milestone.id] ?? "";
            const isBusy = busy === `${milestone.id}:complete` ||
              busy === `${milestone.id}:reopen`;

            return (
              <div
                key={milestone.id}
                className="rounded-xl border border-border bg-surface-raised/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {index + 1}. {milestone.title}
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      {milestone.description}
                    </p>
                    {guidance ? (
                      <FieldHint>
                        {guidance.evidenceHint} ·{" "}
                        {formatMinutes(guidance.estimatedMinutes)} typical effort
                      </FieldHint>
                    ) : null}
                  </div>
                  <Badge variant={MILESTONE_STATUS[milestone.status].variant}>
                    {MILESTONE_STATUS[milestone.status].label}
                  </Badge>
                </div>

                {milestone.status === "completed" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {isSafeLink(milestone.evidenceUrl) ? (
                      <a
                        href={milestone.evidenceUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c7d0ff] hover:underline"
                      >
                        <CircleCheck aria-hidden="true" className="size-3.5" />
                        {milestone.evidenceUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-muted">
                        Submitted, but no readable link is stored.
                      </span>
                    )}
                    {!locked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy || busy !== null}
                        onClick={() =>
                          void actions.reopenMilestone({
                            projectId: project.id,
                            milestoneId: milestone.id,
                          })
                        }
                      >
                        <RotateCcw aria-hidden="true" className="size-3.5" />
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="min-w-56 flex-1 space-y-1.5">
                      <Label htmlFor={key}>
                        Link the work you produced for this step
                      </Label>
                      <Input
                        id={key}
                        value={draft}
                        placeholder="https://github.com/you/project/commit/…"
                        disabled={locked || isBusy}
                        onChange={(event) =>
                          setArtifactUrls((current) => ({
                            ...current,
                            [milestone.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={
                        locked ||
                        busy !== null ||
                        draft.trim().length === 0
                      }
                      onClick={() => void submitMilestone(milestone.id, draft.trim())}
                    >
                      {isBusy ? "Saving…" : "Mark submitted"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden="true" className="size-4" />
            Repository and deployment
          </CardTitle>
          <CardDescription>
            A repository link is required before the project can be completed.
            Deployment stays optional — only if you actually ship it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${project.id}:repo`}>Repository URL</Label>
              <Input
                id={`${project.id}:repo`}
                value={repoDraft}
                placeholder="https://github.com/your-name/your-project"
                onChange={(event) => setRepoDraft(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${project.id}:deployment`}>
                Deployment URL (optional)
              </Label>
              <Input
                id={`${project.id}:deployment`}
                value={deploymentDraft}
                placeholder="https://your-app.example.com"
                onChange={(event) => setDeploymentDraft(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={
                busy !== null ||
                (repoDraft.trim() === (project.repoUrl ?? "") &&
                  deploymentDraft.trim() === (project.deploymentUrl ?? ""))
              }
              onClick={() =>
                void actions.saveLinks({
                  projectId: project.id,
                  repoUrl: repoDraft,
                  deploymentUrl: deploymentDraft,
                })
              }
            >
              <Save aria-hidden="true" className="size-3.5" />
              {busy === `${project.id}:links` ? "Saving…" : "Save links"}
            </Button>
            <FieldHint className="flex-1">
              Links are stored exactly as typed and must start with http:// or
              https://.
            </FieldHint>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion and evidence</CardTitle>
          <CardDescription>
            Evidence is created from submitted work only, and stays marked
            unverified until something outside this app confirms it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.status === "completed" ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-muted-strong">
                Completed {project.completedAt ? `on ${project.completedAt.slice(0, 10)}` : "in this browser"} and
                recorded as project evidence for:
              </p>
              {evidence.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {evidence.map((entry) => (
                    <li key={entry.id}>
                      <Badge variant="muted">
                        {getSkillName(entry.skillSlug)} · unverified
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  No evidence rows are attached to this project right now.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void actions.reopen(project.id)}
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reopen project
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-1.5 text-sm leading-6 text-muted">
                <li>
                  {completedMilestones === milestones.length &&
                  milestones.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <CircleCheck aria-hidden="true" className="size-3.5" />
                      All milestones submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <TriangleAlert aria-hidden="true" className="size-3.5" />
                      {milestones.length - completedMilestones} milestone
                        {milestones.length - completedMilestones === 1
                          ? ""
                          : "s"}{" "}
                      still open
                    </span>
                  )}
                </li>
                <li>
                  {isSafeLink(project.repoUrl) ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <CircleCheck aria-hidden="true" className="size-3.5" />
                      Repository linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Lock aria-hidden="true" className="size-3.5" />
                      No repository link yet — save one above
                    </span>
                  )}
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  disabled={
                    busy !== null ||
                    milestones.length === 0 ||
                    completedMilestones < milestones.length ||
                    !isSafeLink(project.repoUrl)
                  }
                  onClick={() => void actions.complete(project.id)}
                >
                  {busy === `${project.id}:complete`
                    ? "Recording…"
                    : "Complete and record evidence"}
                </Button>
                {project.status === "in_progress" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void actions.setStatus(project.id, "paused")}
                  >
                    Pause project
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      void actions.setStatus(project.id, "in_progress")
                    }
                  >
                    {busy === `${project.id}:status`
                      ? "Saving…"
                      : "Mark in progress"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <FieldHint>
            Reopening withdraws the evidence rows created from this project, so
            your numbers always match work you actually finished.
          </FieldHint>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={busy !== null}
                onClick={() => void actions.remove(project.id)}
              >
                {busy === `${project.id}:delete`
                  ? "Deleting…"
                  : "Yes, delete it"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Delete project
            </Button>
          )}
        </CardFooter>
      </Card>

      {project.status === "completed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Self-assessed rubric</CardTitle>
            <CardDescription>
              Six criteria, scored 0–3 by you. This is a reflection on the work
              you finished — it is stored separately from your assessment scores
              and never counted as proof that you have mastered a skill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PROJECT_RUBRIC.map((criterion) => (
              <div
                key={criterion.key}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-raised/30 p-3.5"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {criterion.label}
                  </p>
                  <FieldHint>{criterion.description}</FieldHint>
                </div>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={`${criterion.label} score`}
                >
                  {RUBRIC_SCALE.map((option) => {
                    const selected = rubricDraft[criterion.key] === option.value;

                    return (
                      <Button
                        key={option.value}
                        size="sm"
                        variant={selected ? "primary" : "outline"}
                        className="min-w-20 px-2.5"
                        aria-pressed={selected}
                        disabled={busy !== null}
                        onClick={() =>
                          setRubricDraft((current) => ({
                            ...current,
                            [criterion.key]: option.value,
                          }))
                        }
                      >
                        {option.value} · {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor={`${project.id}:reflection`}>
                What would you do differently next time?
              </Label>
              <Textarea
                id={`${project.id}:reflection`}
                value={reflection}
                maxLength={2000}
                placeholder="One paragraph in your own words. This is what you will reuse in interviews."
                onChange={(event) => setReflection(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                disabled={busy !== null || !rubric.completed}
                onClick={() =>
                  void actions.saveRubric({
                    projectId: project.id,
                    scores: rubricDraft,
                    reflection,
                  })
                }
              >
                {busy === `${project.id}:rubric` ? "Saving…" : "Save rubric"}
              </Button>
              <FieldHint className="flex-1">
                {rubric.completed
                  ? `Your total: ${rubric.total} of ${rubric.maxTotal} (${rubric.percent}%). Saved scores stay editable.`
                  : `Score all ${PROJECT_RUBRIC.length} criteria to save. ${rubric.scored.length} of ${PROJECT_RUBRIC.length} chosen.`}
              </FieldHint>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {template ? (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio guidance</CardTitle>
            <CardDescription>
              Kept with the project so the checklist is where you actually need
              it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailsBlock
              title="Folder structure"
              items={template.folderStructure}
            />
            <DetailsBlock
              title="Testing checklist"
              items={template.testingChecklist}
            />
            <DetailsBlock title="Metrics to report" items={template.metrics} />
            <DetailsBlock
              title="Interview questions this invites"
              items={template.interviewQuestions}
            />
            <DetailsBlock
              title="Before you publish"
              items={template.portfolioChecklist}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DetailsBlock({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  if (items.length === 0) return null;

  return (
    <details className="rounded-xl border border-border/70 bg-surface-raised/30 p-3.5">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {title}
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
