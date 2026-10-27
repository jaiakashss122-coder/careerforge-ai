"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Info,
  Lock,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint, Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  CAREER_TRACKS,
  getCareerTrack,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import { createId } from "@/lib/id";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import {
  savePreviewRoadmap,
} from "@/lib/preview/workspace-store";
import { generateRoadmap } from "@/lib/roadmap/generate";
import { getInitialFocusTracks } from "@/lib/roadmap/initial";
import type { AssessmentRecord } from "@/lib/assessment/types";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import {
  getActiveRoadmap,
  getAssessmentById,
  getLatestAssessment,
} from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { createRoadmapAction } from "@/lib/workspace/actions";
import { cn, formatHours } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function RoadmapBuilder({
  mode,
  initialAssessment,
  initialRoadmap,
  preferredAssessmentId,
}: {
  mode: "preview" | "supabase";
  initialAssessment: AssessmentRecord | null;
  initialRoadmap: LearningRoadmap | null;
  preferredAssessmentId: string | null;
}) {
  const router = useRouter();
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );

  if (previewMode && !hydrated) {
    return (
      <div className="space-y-5" aria-busy="true">
        <span className="sr-only">Loading your assessment</span>
        <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
    );
  }

  const assessment = previewMode
    ? (preferredAssessmentId
        ? getAssessmentById(workspace.assessments, preferredAssessmentId)
        : null) ?? getLatestAssessment(workspace.assessments)
    : initialAssessment;

  const activeRoadmap = previewMode
    ? getActiveRoadmap(workspace.roadmaps)
    : initialRoadmap;

  if (!assessment) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Roadmap builder"
          title="Build a plan from evidence"
          description="The roadmap generator uses a completed assessment. It will not invent a starting point from your degree or confidence ratings."
        />
        <EmptyState
          icon={Route}
          title="No completed assessment yet"
          description="Take the short adaptive assessment first. Its demonstrated score, gaps, and career signals are the inputs for your initial plan."
          action={
            <Link href="/assessment" className={buttonStyles({ size: "sm" })}>
              Take the assessment
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <RoadmapBuilderForm
      mode={mode}
      assessment={assessment}
      activeRoadmap={activeRoadmap}
      onCreated={(roadmap) => {
        if (previewMode) {
          router.push("/roadmap");
        } else {
          router.push(`/roadmap`);
        }
        router.refresh();
        return roadmap;
      }}
    />
  );
}

function RoadmapBuilderForm({
  mode,
  assessment,
  activeRoadmap,
  onCreated,
}: {
  mode: "preview" | "supabase";
  assessment: AssessmentRecord;
  activeRoadmap: LearningRoadmap | null;
  onCreated: (roadmap: LearningRoadmap) => void;
}) {
  const previewMode = mode === "preview";
  const suggested = useMemo(
    () => getInitialFocusTracks(assessment.summary),
    [assessment.summary],
  );
  const [firstTrack, setFirstTrack] = useState<CareerTrackSlug>(suggested[0]);
  const [secondTrack, setSecondTrack] =
    useState<CareerTrackSlug>(suggested[1]);
  const [weeklyHours, setWeeklyHours] = useState(
    assessment.summary.constraints.weeklyHours,
  );
  const [startDate, setStartDate] = useState(today());
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracksValid = firstTrack !== secondTrack;
  const hoursValid =
    Number.isInteger(weeklyHours) && weeklyHours >= 1 && weeklyHours <= 60;
  const totalHours = hoursValid ? weeklyHours * 13 : 0;
  const canSubmit =
    tracksValid && hoursValid && (!activeRoadmap || replaceConfirmed);

  function chooseTrack(slot: "first" | "second", value: CareerTrackSlug) {
    if (slot === "first") {
      setFirstTrack(value);
      if (value === secondTrack) {
        const alternative = CAREER_TRACKS.find(
          (track) => track.slug !== value,
        )?.slug;
        if (alternative) setSecondTrack(alternative);
      }
    } else {
      setSecondTrack(value);
      if (value === firstTrack) {
        const alternative = CAREER_TRACKS.find(
          (track) => track.slug !== value,
        )?.slug;
        if (alternative) setFirstTrack(alternative);
      }
    }
  }

  async function handleGenerate() {
    setError(null);

    if (!tracksValid) {
      setError("Choose two different career tracks.");
      return;
    }
    if (!hoursValid) {
      setError("Enter whole weekly hours between 1 and 60.");
      return;
    }
    if (activeRoadmap && !replaceConfirmed) {
      setError(
        "Confirm that replacing the active roadmap is intentional before generating.",
      );
      return;
    }

    setPending(true);

    try {
      if (previewMode) {
        const roadmap = generateRoadmap({
          roadmapId: createId(),
          assessmentId: assessment.id,
          summary: assessment.summary,
          focusTracks: [firstTrack, secondTrack],
          weeklyHours,
          startDate,
          idFactory: createId,
        });
        const saved = savePreviewRoadmap(roadmap, replaceConfirmed);
        if (!saved.ok) {
          setError(saved.message);
          return;
        }
        onCreated(roadmap);
        return;
      }

      const result = await createRoadmapAction({
        assessmentId: assessment.id,
        focusTracks: [firstTrack, secondTrack],
        weeklyHours,
        startDate,
        replaceExisting: replaceConfirmed,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onCreated(result.roadmap);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "The roadmap could not be generated.",
      );
    } finally {
      setPending(false);
    }
  }

  const recommended = assessment.summary.careerRecommendations.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roadmap builder"
        title="Choose two tracks to test"
        description="Weeks 1–10 build shared foundations and applied data skills. Weeks 11–12 run one experiment per chosen track. Week 13 is a checkpoint, not an automatic promotion."
        actions={
          <>
            <Badge variant="accent">
              <Route aria-hidden="true" className="size-3.5" />
              13 weeks · {formatHours(totalHours)} hours
            </Badge>
            <Link
              href="/assessment"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Assessment result
            </Link>
          </>
        }
      />

      {activeRoadmap ? (
        <Alert variant="warning" title="An active roadmap already exists">
          Generating a new plan archives{" "}
          <span className="font-semibold">{activeRoadmap.title}</span>. Completed
          tasks and recorded sessions are kept, but the archived plan no longer
          drives your dashboard. Nothing is deleted.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Career tracks</CardTitle>
              </div>
              <CardDescription>
                Pick exactly two. Weeks 11–12 will include a concrete experiment
                and evidence requirement for each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["first", "First experiment", firstTrack],
                    ["second", "Second experiment", secondTrack],
                  ] as const
                ).map(([slot, label, value]) => (
                  <div key={slot} className="space-y-2">
                    <Label htmlFor={`track-${slot}`}>{label}</Label>
                    <select
                      id={`track-${slot}`}
                      value={value}
                      onChange={(event) =>
                        chooseTrack(slot, event.target.value as CareerTrackSlug)
                      }
                      className="h-11 w-full rounded-xl border border-border-strong bg-background/60 px-3 text-sm text-foreground focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20 [&>option]:bg-surface"
                    >
                      {CAREER_TRACKS.map((track) => (
                        <option
                          key={track.slug}
                          value={track.slug}
                          disabled={
                            track.slug ===
                            (slot === "first" ? secondTrack : firstTrack)
                          }
                        >
                          {track.name}
                        </option>
                      ))}
                    </select>
                    <FieldHint>
                      {getCareerTrack(value)?.family ?? "Career track"}
                    </FieldHint>
                  </div>
                ))}
              </div>

              {!tracksValid ? (
                <p className="text-xs leading-5 text-danger">
                  Choose two different tracks so both experiments are distinct.
                </p>
              ) : null}

              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Suggested from your assessment
                </p>
                <div className="mt-3 space-y-2">
                  {recommended.map((track) => (
                    <div
                      key={track.slug}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-muted-strong">
                        {track.name}
                        <span className="ml-1.5 text-muted">
                          {track.family}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">{track.fitScore}% fit</span>
                        <button
                          type="button"
                          onClick={() => chooseTrack("first", track.slug)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[0.625rem] transition-colors",
                            firstTrack === track.slug
                              ? "border-primary/40 bg-primary/10 text-[#c7d0ff]"
                              : "border-border text-muted hover:border-border-strong hover:text-foreground",
                          )}
                        >
                          1st
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseTrack("second", track.slug)}
                          className={cn(
                            "rounded-md border px-2 py-1 text-[0.625rem] transition-colors",
                            secondTrack === track.slug
                              ? "border-primary/40 bg-primary/10 text-[#c7d0ff]"
                              : "border-border text-muted hover:border-border-strong hover:text-foreground",
                          )}
                        >
                          2nd
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.6875rem] leading-5 text-muted">
                  Fit scores reflect interests and this short screen only. They
                  are hypotheses to test, not suitability verdicts.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Time and start date</CardTitle>
              </div>
              <CardDescription>
                Tasks are sized to your weekly target. Unfinished work can be
                rescheduled without resetting progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="builder-hours">Weekly study hours</Label>
                <Input
                  id="builder-hours"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={weeklyHours}
                  onChange={(event) =>
                    setWeeklyHours(Number(event.target.value))
                  }
                />
                <FieldHint>
                  Assessment constraint:{" "}
                  {assessment.summary.constraints.weeklyHours} hours. You can
                  adjust it here.
                </FieldHint>
              </div>
              <div className="space-y-2">
                <Label htmlFor="builder-start">Start date</Label>
                <Input
                  id="builder-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <FieldHint>
                  The plan ends approximately 13 weeks after this date.
                </FieldHint>
              </div>
            </CardContent>
          </Card>

          {activeRoadmap ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm text-muted-strong">
              <input
                type="checkbox"
                checked={replaceConfirmed}
                onChange={(event) => setReplaceConfirmed(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[#7c8cff]"
              />
              <span>
                I understand this archives the active roadmap. Previous
                assessment results, completed tasks, and recorded sessions stay
                saved.
              </span>
            </label>
          ) : null}

          {error ? (
            <Alert variant="danger" title="The plan was not created">
              {error}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerate} disabled={!canSubmit || pending}>
              <Sparkles aria-hidden="true" className="size-4" />
              {pending ? "Generating the plan…" : "Generate my 13-week roadmap"}
            </Button>
            <Link
              href="/roadmap"
              className={buttonStyles({ variant: "ghost" })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>What gets generated</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-muted">
              {[
                {
                  icon: Route,
                  title: "41 ordered tasks",
                  body: "Learning, practice, project, experiment, review, and checkpoint work across 13 weeks.",
                },
                {
                  icon: Lock,
                  title: "Explicit prerequisites",
                  body: "Advanced tasks stay locked until the earlier task is genuinely completed.",
                },
                {
                  icon: Clock3,
                  title: `${formatHours(weeklyHours * 60)} minutes per week`,
                  body: "The generator distributes exactly your target across each week's tasks.",
                },
                {
                  icon: Target,
                  title: "Two career experiments",
                  body: `Weeks 11 and 12 test ${getCareerTrack(firstTrack)?.name ?? firstTrack} and ${getCareerTrack(secondTrack)?.name ?? secondTrack} with concrete evidence.`,
                },
                {
                  icon: RefreshCw,
                  title: "Week 13 checkpoint",
                  body: "Review the evidence, then choose a specialization and the next plan.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-2.5">
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-[#b8c3ff]"
                    />
                    <div>
                      <p className="font-medium text-muted-strong">
                        {item.title}
                      </p>
                      <p>{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info aria-hidden="true" className="size-4 text-[#b8c3ff]" />
                <CardTitle>Honesty rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs leading-5 text-muted">
              <p className="flex items-start gap-2">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-success"
                />
                Missing prerequisites are shown, never auto-completed.
              </p>
              <p className="flex items-start gap-2">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-success"
                />
                Sessions record real time only when you start and finish them.
              </p>
              <p className="flex items-start gap-2">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-success"
                />
                Rescheduling moves work; it does not shame you or reset progress.
              </p>
              <p className="flex items-start gap-2">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-warning"
                />
                This plan cannot promise readiness or employment.
              </p>
            </CardContent>
          </Card>

          {previewMode ? (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted">
              <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              Preview mode generates and stores this plan in this browser. It is
              not uploaded anywhere.
            </p>
          ) : (
            <p className="flex items-start gap-2 text-xs leading-5 text-muted">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-success"
              />
              The server re-checks ownership of the assessment and saves the
              plan under row-level security.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
