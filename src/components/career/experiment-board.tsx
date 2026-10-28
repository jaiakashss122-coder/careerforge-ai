"use client";

import {
  ChevronDown,
  CircleCheck,
  ExternalLink,
  Play,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  CAREER_EXPERIMENT_COMPLETION_RULE,
  CAREER_EXPERIMENT_DISCLAIMER,
  CAREER_EXPERIMENT_KINDS,
  CAREER_EXPERIMENTS,
  getCareerExperimentKindMeta,
  listCareerExperimentsByKind,
  type CareerExperimentDefinition,
} from "@/lib/career/experiments";
import { MAX_REFLECTION_TEXT_LENGTH } from "@/lib/career/action-types";
import { getCareerTrack } from "@/lib/career/tracks";
import {
  CAREER_EXPERIMENT_STATUS_LABELS,
  MAX_REFLECTION_RATING,
  MIN_REFLECTION_RATING,
  REFLECTION_QUESTIONS,
  type CareerExperimentRecord,
  type CareerExperimentReflection,
  type CareerExperimentStatus,
} from "@/lib/career/types";
import { formatMinutes } from "@/lib/utils";
import type { CareerActions } from "./use-career-actions";

const STATUS_VARIANT: Record<CareerExperimentStatus, BadgeVariant> = {
  not_started: "muted",
  in_progress: "accent",
  completed: "success",
};

const RATING_OPTIONS = Array.from(
  { length: MAX_REFLECTION_RATING - MIN_REFLECTION_RATING + 1 },
  (_, index) => MIN_REFLECTION_RATING + index,
);

function emptyReflection(): CareerExperimentReflection {
  return { interest: 0, difficulty: 0, enjoyment: 0, willingness: 0 };
}

function isComplete(reflection: CareerExperimentReflection) {
  return REFLECTION_QUESTIONS.every(
    (question) => reflection[question.scale] >= MIN_REFLECTION_RATING,
  );
}

function RatingSelect({
  scale,
  label,
  question,
  oneMeans,
  fiveMeans,
  value,
  onChange,
}: {
  scale: string;
  label: string;
  question: string;
  oneMeans: string;
  fiveMeans: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = `reflection-${scale}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs leading-5 text-muted">{question}</p>
      <Select
        id={id}
        value={value === 0 ? "" : String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        <option value="">Choose 1 to 5</option>
        {RATING_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <FieldHint>{oneMeans}</FieldHint>
      <FieldHint>{fiveMeans}</FieldHint>
    </div>
  );
}

function ExperimentRow({
  definition,
  record,
  actions,
}: {
  definition: CareerExperimentDefinition;
  record: CareerExperimentRecord | null;
  actions: CareerActions;
}) {
  const [open, setOpen] = useState(false);
  const [reflection, setReflection] = useState<CareerExperimentReflection>(
    emptyReflection(),
  );
  const [outputUrl, setOutputUrl] = useState("");
  const [reflectionText, setReflectionText] = useState("");

  const track = getCareerTrack(definition.careerSlug);
  const status = record?.status ?? "not_started";
  const startKey = `start:${definition.careerSlug}`;
  const testedKey = `tested:${definition.careerSlug}`;
  const clearKey = `clear:${definition.careerSlug}`;
  const missingRatings = !isComplete(reflection);
  const missingLink = outputUrl.trim().length === 0;

  async function submit() {
    const ok = await actions.markTested({
      careerSlug: definition.careerSlug,
      reflection,
      reflectionText,
      outputUrl,
    });

    if (ok) {
      setReflection(emptyReflection());
      setOutputUrl("");
      setReflectionText("");
      setOpen(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface/40">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold leading-6 text-foreground">
            {definition.title}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            For {track?.name ?? definition.careerSlug} · about{" "}
            {formatMinutes(definition.estimatedMinutes)} of work
          </p>
          <p className="text-sm leading-6 text-muted">{definition.brief}</p>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <Badge variant={STATUS_VARIANT[status]}>
            {CAREER_EXPERIMENT_STATUS_LABELS[status]}
          </Badge>
          <div className="flex flex-wrap justify-end gap-2">
            {status === "not_started" ? (
              <Button
                size="sm"
                disabled={actions.busyId === startKey}
                onClick={() => {
                  setOpen(true);
                  void actions.startExperiment(definition.careerSlug);
                }}
              >
                <Play aria-hidden="true" className="size-4" />
                {actions.busyId === startKey
                  ? "Starting…"
                  : "Start this experiment"}
              </Button>
            ) : null}
            {status === "in_progress" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOpen((current) => !current)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
                {open ? "Hide the reflection form" : "Record what happened"}
              </Button>
            ) : null}
            {status === "completed" ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpen((current) => !current)}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                  {open ? "Hide the result" : "Show the result"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={actions.busyId === clearKey}
                  onClick={() => void actions.clearExperiment(definition.careerSlug)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {actions.busyId === clearKey ? "Clearing…" : "Clear result"}
                </Button>
              </>
            ) : null}
            {status === "in_progress" ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={actions.busyId === clearKey}
                onClick={() => void actions.clearExperiment(definition.careerSlug)}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {actions.busyId === clearKey
                  ? "Clearing…"
                  : "Stop and clear"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-border p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              What you do
            </p>
            <ol className="space-y-1.5 text-sm leading-6 text-muted-strong">
              {definition.steps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="text-muted">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              What to notice while you work
            </p>
            <ul className="space-y-1 text-sm leading-6 text-muted">
              {definition.observe.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm leading-6 text-muted">
            <span className="font-medium text-muted-strong">
              What you keep:
            </span>{" "}
            {definition.output}
          </p>

          {status === "in_progress" ? (
            <div className="space-y-4 rounded-xl border border-border-strong bg-surface/60 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Reflection after the work
                </p>
                <p className="text-xs leading-5 text-muted">
                  Four whole numbers from 1 to 5, plus the link to what you
                  produced. Difficulty is recorded but never added to your
                  score, because finding something hard is not the same as
                  disliking it.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {REFLECTION_QUESTIONS.map((question) => (
                  <RatingSelect
                    key={question.scale}
                    scale={question.scale}
                    label={question.label}
                    question={question.question}
                    oneMeans={question.oneMeans}
                    fiveMeans={question.fiveMeans}
                    value={reflection[question.scale]}
                    onChange={(value) =>
                      setReflection((current) => ({
                        ...current,
                        [question.scale]: value,
                      }))
                    }
                  />
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`link-${definition.careerSlug}`}>
                  Link to the work you produced
                </Label>
                <Input
                  id={`link-${definition.careerSlug}`}
                  type="url"
                  value={outputUrl}
                  onChange={(event) => setOutputUrl(event.target.value)}
                  placeholder="https://github.com/you/your-repo or a link to your notebook"
                />
                <FieldHint>
                  Without this link the experiment stays unfinished. The link is
                  never opened or checked by the app, so it only has the value
                  you and a reader give it.
                </FieldHint>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`notes-${definition.careerSlug}`}>
                  Notes in your own words (optional)
                </Label>
                <Textarea
                  id={`notes-${definition.careerSlug}`}
                  value={reflectionText}
                  maxLength={MAX_REFLECTION_TEXT_LENGTH}
                  onChange={(event) => setReflectionText(event.target.value)}
                  placeholder="Which part held your attention, which part you would rather not repeat, and what you would do differently."
                />
                <FieldHint>
                  {reflectionText.trim().length} of{" "}
                  {MAX_REFLECTION_TEXT_LENGTH} characters used.
                </FieldHint>
              </div>

              {missingRatings || missingLink ? (
                <FieldHint>
                  {missingRatings
                    ? "Answer all four questions first."
                    : "Add the link to the work before saving."}
                </FieldHint>
              ) : null}

              <Button
                size="sm"
                disabled={missingRatings || missingLink || actions.busyId === testedKey}
                onClick={() => void submit()}
              >
                <Save aria-hidden="true" className="size-4" />
                {actions.busyId === testedKey ? "Saving…" : "Mark as tested"}
              </Button>
            </div>
          ) : null}

          {status === "completed" && record?.reflection ? (
            <div className="space-y-3 rounded-xl border border-border-strong bg-surface/60 p-4">
              <p className="text-sm font-semibold text-foreground">
                Recorded on {new Date(record.completedAt ?? record.updatedAt).toLocaleDateString()}
              </p>
              <ul className="space-y-1 text-sm leading-6 text-muted-strong">
                {REFLECTION_QUESTIONS.map((question) => (
                  <li key={question.scale}>
                    {question.label}: {record.reflection?.[question.scale]} of 5
                  </li>
                ))}
              </ul>
              {record.reflectionText ? (
                <p className="text-sm leading-6 text-muted">
                  Your notes: {record.reflectionText}
                </p>
              ) : null}
              {record.outputUrl ? (
                <a
                  className="inline-flex items-center gap-1.5 text-sm text-[#c7d0ff] underline underline-offset-4"
                  href={record.outputUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Open the work you linked
                </a>
              ) : null}
              <p className="text-xs leading-5 text-muted">
                Clearing this result removes the reflection and takes the role
                back to untested. Your ranking recalculates without it.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ExperimentBoard({
  experiments,
  actions,
}: {
  experiments: CareerExperimentRecord[];
  actions: CareerActions;
}) {
  const recordBySlug = new Map<string, CareerExperimentRecord>(
    experiments.map((record) => [record.careerSlug, record]),
  );
  const testedCount = experiments.filter(
    (record) => record.status === "completed",
  ).length;
  const tryingCount = experiments.filter(
    (record) => record.status === "in_progress",
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck aria-hidden="true" className="size-4" />
            Nine role experiments
          </CardTitle>
          <CardDescription>
            Each one is a short version of the real work, done on data you
            choose. {testedCount} of {CAREER_EXPERIMENTS.length}{" "}
            {testedCount === 1 ? "area is" : "areas are"} tested and{" "}
            {tryingCount} {tryingCount === 1 ? "is" : "are"} in progress right
            now. {CAREER_EXPERIMENT_COMPLETION_RULE} {CAREER_EXPERIMENT_DISCLAIMER}
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert variant="info" title="Starting an experiment does not log study time">
        Your start date is recorded so the gap between starting and finishing is
        honest. Minutes are only counted when you run a study session on the
        Dashboard, so nothing here inflates your tracked time.
      </Alert>

      <div className="space-y-6">
        {CAREER_EXPERIMENT_KINDS.map((kind) => {
          const meta = getCareerExperimentKindMeta(kind);
          const definitions = listCareerExperimentsByKind(kind);

          if (!meta) return null;

          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle>
                  {meta.label} ({definitions.length}{" "}
                  {definitions.length === 1 ? "experiment" : "experiments"})
                </CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {definitions.map((definition) => (
                  <ExperimentRow
                    key={definition.careerSlug}
                    definition={definition}
                    record={recordBySlug.get(definition.careerSlug) ?? null}
                    actions={actions}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
