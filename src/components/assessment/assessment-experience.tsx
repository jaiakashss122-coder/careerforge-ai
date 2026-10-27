"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import {
  evaluateAssessment,
  getAssessmentProgress,
  getProbeQuestion,
  isOptionAnswer,
  orderQuestionOptions,
} from "@/lib/assessment/engine";
import { createAssessmentRecord } from "@/lib/assessment/record";
import {
  CAREER_ACTIVITY_QUESTION,
  CAREER_STYLE_QUESTION,
  CONSTRAINT_CHOICE_QUESTIONS,
  CONSTRAINT_HOURS_QUESTION,
  INTEREST_OPTIONS,
  INTEREST_QUESTIONS,
} from "@/lib/assessment/questions";
import type {
  AssessmentAnswers,
  AssessmentRecord,
} from "@/lib/assessment/types";
import { ASSESSMENT_DISCLAIMER } from "@/lib/assessment/types";
import {
  clearAssessmentDraft,
  getAssessmentDraftSnapshot,
  parseAssessmentDraft,
  saveAssessmentDraft,
  subscribeToAssessmentDraft,
  type AssessmentDraft,
} from "@/lib/preview/assessment-draft";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import {
  getPreviewWorkspaceSnapshot,
  parsePreviewWorkspace,
  savePreviewAssessment,
  savePreviewRoadmap,
} from "@/lib/preview/workspace-store";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { createInitialRoadmap } from "@/lib/roadmap/initial";
import {
  getActiveRoadmap,
  getLatestAssessment,
} from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { submitAssessmentAction } from "@/lib/workspace/actions";
import { cn } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const SECTION_ORDER = ["programming", "sql", "data-science", "software-development"];

function AssessmentSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading the assessment</span>
      <div className="h-3 w-28 animate-pulse rounded-full bg-surface-raised" />
      <div className="h-9 w-96 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function getDraftProgress(draft: AssessmentDraft | null) {
  if (!draft) return null;
  return getAssessmentProgress(draft.answers);
}

export function AssessmentExperience({
  mode,
  initialLatest,
}: {
  mode: "preview" | "supabase";
  initialLatest: AssessmentRecord | null;
}) {
  const router = useRouter();
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );
  const { profile: previewProfile } = usePreviewProfileSnapshot(
    null,
    previewMode,
  );

  const latest = previewMode
    ? getLatestAssessment(workspace.assessments)
    : initialLatest;

  const [active, setActive] = useState(false);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [startedAt, setStartedAt] = useState("");
  const draftSnapshot = useSyncExternalStore(
    subscribeToAssessmentDraft,
    getAssessmentDraftSnapshot,
    () => null,
  );
  const draft = useMemo(
    () => parseAssessmentDraft(draftSnapshot),
    [draftSnapshot],
  );
  const [probeChoice, setProbeChoice] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [confidenceChoice, setConfidenceChoice] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [careerConfirmed, setCareerConfirmed] = useState(false);
  const [constraintsConfirmed, setConstraintsConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedStart, setConfirmedStart] = useState(false);

  const draftProgress = useMemo(() => getDraftProgress(draft), [draft]);

  const progress = useMemo(() => getAssessmentProgress(answers), [answers]);
  const engineStep = progress.current;

  if (previewMode && !hydrated) {
    return <AssessmentSkeleton />;
  }

  if (!active) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Adaptive assessment"
          title="A short, honest skills screen"
          description="Thirteen adaptive technical probes across four areas, plus confidence, career interests, and study constraints. Answers save in this browser as you go."
          actions={
            <>
              <Badge variant="accent">
                <ClipboardCheck aria-hidden="true" className="size-3.5" />
                About 15–25 minutes
              </Badge>
              {latest ? (
                <Badge variant="muted">
                  Last completed{" "}
                  {new Date(latest.completedAt).toLocaleDateString()}
                </Badge>
              ) : null}
            </>
          }
        />

        {previewMode ? (
          <Alert variant="warning" title="Local preview mode">
            Your assessment, roadmap, and sessions will be stored in this
            browser only. No account is created and no study activity is
            simulated.
          </Alert>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card className="panel-highlight">
            <CardHeader>
              <CardTitle>
                {latest ? "Retake the assessment" : "Start your starting point"}
              </CardTitle>
              <CardDescription>
                {latest
                  ? "A retake adds new evidence. It does not erase your previous results or completed tasks, and it does not auto-advance you."
                  : "The result drives your initial roadmap. It scores demonstrated answers separately from how confident you feel."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  "Python basics, functions, collections, and debugging",
                  "SQL filtering, aggregation, joins, and subqueries",
                  "Statistics, probability, cleaning, pandas, and EDA",
                  "Git, command line, APIs, testing, and project structure",
                  "Career interests and preferred working style",
                  "Weekly hours and environment constraints",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5 text-xs leading-5 text-muted-strong"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <Alert variant="info" title="What this is not">
                {ASSESSMENT_DISCLAIMER}
              </Alert>

              <div className="flex flex-wrap gap-3 pt-1">
                {draft && draftProgress && draftProgress.completedSteps > 0 ? (
                  <>
                    <Button
                      onClick={() => {
                        setAnswers(draft.answers);
                        setStartedAt(draft.startedAt);
                        setCareerConfirmed(false);
                        setConstraintsConfirmed(false);
                        setProbeChoice(null);
                        setConfidenceChoice(null);
                        setActive(true);
                        setConfirmedStart(true);
                      }}
                    >
                      Resume saved answers
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        clearAssessmentDraft();
                      }}
                    >
                      Discard saved answers
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      const now = new Date().toISOString();
                      clearAssessmentDraft();
                      setAnswers({});
                      setStartedAt(now);
                      setCareerConfirmed(false);
                      setConstraintsConfirmed(false);
                      setProbeChoice(null);
                      setConfidenceChoice(null);
                      setActive(true);
                      setConfirmedStart(true);
                      saveAssessmentDraft({}, now);
                    }}
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    {latest ? "Start a retake" : "Start the assessment"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How scoring works</CardTitle>
              <CardDescription>
                Every probe has a core question and one adaptive follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  title: "Both correct",
                  body: "Short-screen intermediate evidence. It still needs a project before it counts as mastery.",
                },
                {
                  title: "Core only",
                  body: "Basic evidence: the concept landed, the application question did not.",
                },
                {
                  title: "Follow-up only",
                  body: "Foundational evidence. The plan starts with a remedial lesson.",
                },
                {
                  title: "Confidence separate",
                  body: "Your self-rating is compared with demonstrated answers and flagged when they disagree.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background/40 p-3.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
              <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                <Lock
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-muted"
                />
                Assessment scores are recalculated on the server before saving;
                the browser cannot submit a made-up score.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const current = (() => {
    if (engineStep.kind === "career") {
      return { kind: "career" as const };
    }
    if (engineStep.kind === "constraints") {
      return careerConfirmed
        ? { kind: "constraints" as const }
        : { kind: "career" as const };
    }
    if (engineStep.kind === "review") {
      if (!careerConfirmed) return { kind: "career" as const };
      if (!constraintsConfirmed) return { kind: "constraints" as const };
      return { kind: "review" as const };
    }
    return engineStep;
  })();

  const careerComplete =
    INTEREST_QUESTIONS.every((question) =>
      isOptionAnswer(INTEREST_OPTIONS, answers[question.key]),
    ) &&
    isOptionAnswer(CAREER_STYLE_QUESTION.options, answers[CAREER_STYLE_QUESTION.key]) &&
    isOptionAnswer(CAREER_ACTIVITY_QUESTION.options, answers[CAREER_ACTIVITY_QUESTION.key]);

  const hoursValue = answers[CONSTRAINT_HOURS_QUESTION.key] ?? "";
  const parsedHours = Number(hoursValue);
  const hoursValid =
    Number.isInteger(parsedHours) &&
    parsedHours >= CONSTRAINT_HOURS_QUESTION.min &&
    parsedHours <= CONSTRAINT_HOURS_QUESTION.max;

  const constraintsComplete =
    hoursValid &&
    CONSTRAINT_CHOICE_QUESTIONS.every((question) =>
      isOptionAnswer(question.options, answers[question.key]),
    );

  function setAnswer(key: string, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    saveAssessmentDraft(next, startedAt);
  }

  async function handleSubmit() {
    setError(null);
    setPending(true);

    try {
      if (previewMode) {
        const evaluation = evaluateAssessment(answers, previewProfile);
        if (!evaluation.ok) {
          setError(evaluation.message);
          return;
        }

        const completedAt = new Date().toISOString();
        const record = createAssessmentRecord({
          type: latest ? "retake" : "initial",
          evaluation: evaluation.evaluation,
          startedAt,
          completedAt,
        });

        savePreviewAssessment(record);

        if (!latest) {
          const currentWorkspace = parsePreviewWorkspace(
            getPreviewWorkspaceSnapshot(),
          );
          if (!getActiveRoadmap(currentWorkspace.roadmaps)) {
            try {
              const roadmap = createInitialRoadmap({
                assessmentId: record.id,
                summary: record.summary,
                weeklyHours: record.summary.constraints.weeklyHours,
                now: completedAt,
              });
              savePreviewRoadmap(roadmap, false);
            } catch (roadmapError) {
              console.error(
                "Local roadmap generation failed:",
                roadmapError instanceof Error
                  ? roadmapError.message
                  : "unknown error",
              );
            }
          }
        }

        clearAssessmentDraft();
        router.push(`/assessment/results/${record.id}`);
        return;
      }

      const result = await submitAssessmentAction({ answers, startedAt });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      clearAssessmentDraft();
      router.push(`/assessment/results/${result.record.id}`);
      router.refresh();
    } catch {
      setError(
        "Something went wrong while submitting. Your answers are still saved in this browser.",
      );
    } finally {
      setPending(false);
    }
  }

  const sectionMeta =
    current.kind === "probe" || current.kind === "confidence"
      ? SECTION_ORDER.indexOf(current.section) + 1
      : 5;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="accent">Assessment in progress</Badge>
            <span className="text-xs text-muted">
              Step {progress.stepNumber} of {progress.totalSteps}
            </span>
          </div>
          <span className="text-xs text-muted">
            {previewMode ? "Saving locally" : "Saving to your account"} · answers
            autosave
          </span>
        </div>
        <Progress
          value={progress.percent}
          label="Assessment progress"
        />
        <div className="flex flex-wrap gap-2 text-[0.6875rem] text-muted">
          {[
            "Programming",
            "SQL",
            "Data science",
            "Software",
            "Preferences",
            "Review",
          ].map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-2.5 py-1",
                index + 1 === sectionMeta || (current.kind === "review" && index === 5)
                  ? "border-primary/30 bg-primary/10 text-[#c7d0ff]"
                  : "border-border bg-surface/50",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {error ? (
        <Alert variant="danger" title="Check your answers">
          {error}
        </Alert>
      ) : null}

      {current.kind === "probe" ? (() => {
        const question = getProbeQuestion(current.probe, answers);
        const selected =
          probeChoice?.key === question.key ? probeChoice.value : undefined;
        const orderedOptions = orderQuestionOptions(
          question.key,
          question.options,
        );

        return (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">
                  {current.section} · probe {current.probeIndex + 1} of{" "}
                  {current.sectionProbeCount}
                </Badge>
                <Badge variant="muted">
                  {question.difficulty === "core"
                    ? "Core concept"
                    : question.difficulty === "application"
                      ? "Application"
                      : "Foundation"}
                </Badge>
              </div>
              <CardTitle className="text-lg leading-7">
                {question.prompt}
              </CardTitle>
              <CardDescription>Concept: {question.concept}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.code ? (
                <pre className="overflow-x-auto rounded-xl border border-border bg-background/70 p-4 text-xs leading-6 text-muted-strong">
                  <code>{question.code}</code>
                </pre>
              ) : null}

              <fieldset className="space-y-2">
                <legend className="sr-only">Choose one answer</legend>
                {orderedOptions.map((option) => {
                  const checked = selected === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-muted-strong hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name={question.key}
                        value={option.value}
                        checked={checked}
                        onChange={() =>
                          setProbeChoice({
                            key: question.key,
                            value: option.value,
                          })
                        }
                        className="mt-1 size-4 shrink-0 accent-[#7c8cff]"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="mt-0.5 block text-xs leading-5 text-muted">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted">
                  You will see whether this was right at the end, not now.
                </p>
                <Button
                  disabled={!selected}
                  onClick={() => {
                    if (selected) setAnswer(question.key, selected);
                  }}
                >
                  Continue
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })() : null}

      {current.kind === "confidence" ? (() => {
        const selected =
          confidenceChoice?.key === current.question.key
            ? confidenceChoice.value
            : answers[current.question.key];
        return (
          <Card>
            <CardHeader>
              <Badge variant="muted" className="w-fit">
                Confidence check
              </Badge>
              <CardTitle className="text-lg leading-7">
                {current.question.prompt}
              </CardTitle>
              <CardDescription>{current.question.help}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset className="grid gap-2 sm:grid-cols-5">
                <legend className="sr-only">Confidence level</legend>
                {current.question.options.map((option) => {
                  const checked = selected === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "cursor-pointer rounded-xl border p-3 text-center text-xs transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-muted hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name={current.question.key}
                        value={option.value}
                        checked={checked}
                        onChange={() =>
                          setConfidenceChoice({
                            key: current.question.key,
                            value: option.value,
                          })
                        }
                        className="sr-only"
                      />
                      <span className="block text-base font-semibold">
                        {option.value}
                      </span>
                      <span className="mt-1 block leading-4">{option.label}</span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted">
                  Confidence is stored separately and never counted as
                  demonstrated knowledge.
                </p>
                <Button
                  disabled={!selected}
                  onClick={() => {
                    if (selected) setAnswer(current.question.key, selected);
                  }}
                >
                  Continue
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })() : null}

      {current.kind === "career" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="muted">Career preferences</Badge>
              <span className="text-xs text-muted">
                1 = low interest, 5 = strong interest
              </span>
            </div>
            <CardTitle className="text-lg leading-7">
              What kind of work would you test first?
            </CardTitle>
            <CardDescription>
              These ratings shape which two career tracks the roadmap
              experiments with in weeks 11–12. They are not skill scores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {INTEREST_QUESTIONS.map((question) => (
              <fieldset key={question.key} className="space-y-2">
                <legend className="text-sm leading-6 text-muted-strong">
                  {question.prompt}
                </legend>
                <div className="grid grid-cols-5 gap-2">
                  {INTEREST_OPTIONS.map((option) => {
                    const checked = answers[question.key] === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "cursor-pointer rounded-lg border py-2 text-center text-sm transition-colors",
                          checked
                            ? "border-primary/40 bg-primary/10 font-semibold text-foreground"
                            : "border-border bg-background/40 text-muted hover:border-border-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name={question.key}
                          value={option.value}
                          checked={checked}
                          onChange={() => setAnswer(question.key, option.value)}
                          className="sr-only"
                        />
                        {option.value}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {[CAREER_STYLE_QUESTION, CAREER_ACTIVITY_QUESTION].map((question) => (
              <fieldset key={question.key} className="space-y-2">
                <legend className="text-sm leading-6 text-muted-strong">
                  {question.prompt}
                </legend>
                <p className="text-xs leading-5 text-muted">{question.help}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option) => {
                    const checked = answers[question.key] === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition-colors",
                          checked
                            ? "border-primary/35 bg-primary/10 text-foreground"
                            : "border-border bg-background/40 text-muted-strong hover:border-border-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name={question.key}
                          value={option.value}
                          checked={checked}
                          onChange={() => setAnswer(question.key, option.value)}
                          className="mt-1 size-4 shrink-0 accent-[#7c8cff]"
                        />
                        <span className="space-y-0.5">
                          <span className="block font-medium">{option.label}</span>
                          {option.description ? (
                            <span className="block text-xs leading-5 text-muted">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
              <p className="text-xs text-muted">
                {careerComplete
                  ? "Preferences complete."
                  : "Rate every interest and choose both options to continue."}
              </p>
              <Button
                disabled={!careerComplete}
                onClick={() => setCareerConfirmed(true)}
              >
                Continue
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {current.kind === "constraints" ? (
        <Card>
          <CardHeader>
            <Badge variant="muted" className="w-fit">
              Constraints
            </Badge>
            <CardTitle className="text-lg leading-7">
              What does the plan have to fit?
            </CardTitle>
            <CardDescription>
              The generator sizes tasks to your weekly hours and records these
              limits in the roadmap instead of pretending they do not exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="weekly-hours">
                {CONSTRAINT_HOURS_QUESTION.prompt}
              </Label>
              <Input
                id="weekly-hours"
                type="number"
                inputMode="numeric"
                min={CONSTRAINT_HOURS_QUESTION.min}
                max={CONSTRAINT_HOURS_QUESTION.max}
                value={hoursValue}
                onChange={(event) =>
                  setAnswer(CONSTRAINT_HOURS_QUESTION.key, event.target.value)
                }
                aria-describedby="weekly-hours-help"
              />
              <FieldHint id="weekly-hours-help">
                {CONSTRAINT_HOURS_QUESTION.help}
              </FieldHint>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {CONSTRAINT_CHOICE_QUESTIONS.map((question) => (
                <div key={question.key} className="space-y-2">
                  <Label htmlFor={`constraint-${question.key}`}>
                    {question.prompt}
                  </Label>
                  <Select
                    id={`constraint-${question.key}`}
                    value={answers[question.key] ?? ""}
                    onChange={(event) =>
                      setAnswer(question.key, event.target.value)
                    }
                  >
                    <option value="" disabled>
                      Choose one
                    </option>
                    {question.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <FieldHint>{question.help}</FieldHint>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
              <p className="text-xs text-muted">
                {constraintsComplete
                  ? "All constraint answers are valid."
                  : "Enter whole weekly hours within 1–60 and choose all three options."}
              </p>
              <Button
                disabled={!constraintsComplete}
                onClick={() => {
                  setConstraintsConfirmed(true);
                }}
              >
                Review answers
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {current.kind === "review" ? (
        <Card className="panel-highlight">
          <CardHeader>
            <Badge variant="success" className="w-fit">
              Ready to submit
            </Badge>
            <CardTitle className="text-lg leading-7">
              Review before scoring
            </CardTitle>
            <CardDescription>
              Submitting scores the technical answers, stores your preferences,
              and builds an initial roadmap from the top two recommended tracks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  label: "Technical probes",
                  value: "13 answered",
                },
                { label: "Confidence ratings", value: "4 sections" },
                { label: "Career interests", value: "6 ratings + 2 choices" },
                {
                  label: "Constraints",
                  value: `${answers[CONSTRAINT_HOURS_QUESTION.key] ?? "—"} hours/week`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3.5 py-3 text-sm"
                >
                  <span className="text-muted">{item.label}</span>
                  <span className="font-medium text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <Alert variant="info" title="Scoring is not a certification">
              {ASSESSMENT_DISCLAIMER}
            </Alert>

            <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
              <Button onClick={handleSubmit} disabled={pending}>
                <ShieldCheck aria-hidden="true" className="size-4" />
                {pending ? "Scoring and saving…" : "Submit and see results"}
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  clearAssessmentDraft();
                  setAnswers({});
                  setCareerConfirmed(false);
                  setConstraintsConfirmed(false);
                  setProbeChoice(null);
                  setConfidenceChoice(null);
                  setActive(false);
                  setConfirmedStart(false);
                  setError(null);
                }}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Start over
              </Button>
            </div>

            {confirmedStart ? (
              <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                <Timer aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Started{" "}
                {new Date(startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . The completed duration is recorded only as assessment metadata,
                not study time.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {current.kind !== "review" ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Answers save in this browser as you go. Leaving this page does not lose
          progress, and nothing is marked complete until you submit.
        </p>
      ) : null}
    </div>
  );
}
