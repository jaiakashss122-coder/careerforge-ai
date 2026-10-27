"use client";

import { Check, ListChecks, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldHint, Label, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CAREER_TRACKS, type CareerTrackSlug } from "@/lib/career/tracks";
import {
  ANSWER_RATING_META,
  INTERVIEW_TOPIC_META,
  INTERVIEW_TOPIC_ORDER,
  MAX_ANSWER_LENGTH,
  type AnswerRating,
  type InterviewAttemptRecord,
  type InterviewTopic,
  type MockInterviewRecord,
} from "@/lib/interview/types";
import {
  INTERVIEW_QUESTIONS,
  countQuestionsForTopic,
  getInterviewQuestion,
} from "@/lib/interview/questions";
import {
  MOCK_INTERVIEW_MAX_QUESTIONS,
  MOCK_INTERVIEW_MIN_QUESTIONS,
  summarizeInterview,
} from "@/lib/interview/mock";
import type { InterviewActions } from "@/components/interview/use-interview-actions";

const RATING_VARIANT: Record<AnswerRating, BadgeVariant> = {
  covered: "success",
  partial: "warning",
  "not-covered": "danger",
};

const RATING_ORDER: readonly AnswerRating[] = [
  "covered",
  "partial",
  "not-covered",
];

const COUNT_CHOICES = [3, 5, 7, 10, MOCK_INTERVIEW_MAX_QUESTIONS];

export function QuestionAnswer({
  interviewId,
  questionId,
  attempt,
  actions,
}: {
  interviewId: string | null;
  questionId: string;
  attempt: InterviewAttemptRecord | undefined;
  actions: InterviewActions;
}) {
  const question = getInterviewQuestion(questionId);
  const [answerText, setAnswerText] = useState("");
  const [revealPoints, setRevealPoints] = useState(false);

  if (!question) {
    return (
      <p className="text-sm leading-6 text-muted">
        This app no longer holds the question that was recorded here, so it shows
        nothing for it. The record itself is still in your export.
      </p>
    );
  }

  const busy = actions.busyId === `answer:${question.id}`;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-raised/40 p-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">{INTERVIEW_TOPIC_META[question.topic].label}</Badge>
          {attempt ? (
            <Badge variant={RATING_VARIANT[attempt.rating]}>
              {ANSWER_RATING_META[attempt.rating].label}
            </Badge>
          ) : (
            <Badge variant="outline">Not rated yet</Badge>
          )}
        </div>
        <p className="text-sm font-semibold leading-6 text-foreground">
          {question.prompt}
        </p>
      </div>

      {attempt ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm leading-6 text-muted-strong">
            {ANSWER_RATING_META[attempt.rating].meaning}
          </p>
          {attempt.answerText ? (
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface/60 p-3 text-sm leading-6 text-muted">
              {attempt.answerText}
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted">
              No words were written for this one, so only the rating is stored.
            </p>
          )}
          <p className="text-sm leading-6 text-muted">
            Why an interviewer asks this: {question.askedWhy}
          </p>
          <Button
            size="sm"
            variant="danger"
            disabled={actions.busyId === `answer:remove:${attempt.id}`}
            onClick={() => void actions.removeAnswer(attempt.id)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {actions.busyId === `answer:remove:${attempt.id}`
              ? "Removing…"
              : "Remove this rating"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={`answer-${interviewId ?? "standalone"}-${question.id}`}>
              Your answer in your own words
            </Label>
            <Textarea
              id={`answer-${interviewId ?? "standalone"}-${question.id}`}
              value={answerText}
              maxLength={MAX_ANSWER_LENGTH}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Say the point, then the reason. Leave this empty if you answered out loud and only want to record the rating."
            />
            <FieldHint>
              {answerText.length} of {MAX_ANSWER_LENGTH} characters. Anything you
              type here is stored so you can read it back; nothing outside this
              app reads it.
            </FieldHint>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              How did it go?
            </p>
            <div className="flex flex-wrap gap-2">
              {RATING_ORDER.map((rating) => (
                <Button
                  key={rating}
                  size="sm"
                  variant={rating === "covered" ? "primary" : "secondary"}
                  disabled={busy}
                  onClick={() =>
                    void actions
                      .recordAnswer({ interviewId, questionId: question.id, answerText, rating })
                      .then((ok) => {
                        if (ok) setAnswerText("");
                      })
                  }
                >
                  {rating === "covered" ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <X aria-hidden="true" className="size-4" />
                  )}
                  {ANSWER_RATING_META[rating].label}
                </Button>
              ))}
            </div>
            {busy ? <FieldHint>Saving that rating…</FieldHint> : null}
          </div>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRevealPoints((current) => !current)}
              aria-expanded={revealPoints}
            >
              <ListChecks aria-hidden="true" className="size-4" />
              {revealPoints
                ? "Hide the points a good answer needs"
                : "Show the points a good answer needs"}
            </Button>
            {revealPoints ? (
              <div className="space-y-2 rounded-lg border border-border bg-surface/60 p-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                    What this app looks for ({question.goodAnswerCovers.length} points)
                  </p>
                  <ul className="space-y-1 text-sm leading-6 text-muted">
                    {question.goodAnswerCovers.map((point) => (
                      <li key={point}>· {point}</li>
                    ))}
                  </ul>
                </div>
                {question.followUps.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                      Follow-up questions an interviewer usually asks next (
                      {question.followUps.length})
                    </p>
                    <ul className="space-y-1 text-sm leading-6 text-muted">
                      {question.followUps.map((followUp) => (
                        <li key={followUp}>· {followUp}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-sm leading-6 text-muted">
                  These points are written by this app. They are not another
                  person&apos;s marking scheme, and rating yourself against them
                  changes nothing until the interview is finished.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function InterviewCard({
  interview,
  attempts,
  actions,
}: {
  interview: MockInterviewRecord;
  attempts: InterviewAttemptRecord[];
  actions: InterviewActions;
}) {
  const outcome = summarizeInterview({
    questionIds: interview.questionIds,
    attempts,
  });
  const finished = interview.completedAt !== null;
  const finishBusy = actions.busyId === `interview:finish:${interview.id}`;
  const removeBusy = actions.busyId === `interview:remove:${interview.id}`;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {interview.label}
          </p>
          <p className="text-xs leading-5 text-muted">
            {finished
              ? `Started ${interview.startedAt.slice(0, 16).replace("T", " ")} UTC, finished ${interview.completedAt?.slice(0, 16).replace("T", " ")} UTC.`
              : `Started ${interview.startedAt.slice(0, 16).replace("T", " ")} UTC and still open.`}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {interview.topics.map((topic) => (
              <Badge key={topic} variant="muted">
                {INTERVIEW_TOPIC_META[topic].label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="w-full max-w-xs shrink-0 space-y-2">
          <p className="text-right text-sm font-semibold tabular-nums text-foreground">
            {outcome.answered} of {outcome.total} rated
          </p>
          <Progress
            value={outcome.total === 0 ? 0 : (outcome.answered / outcome.total) * 100}
            label={`${outcome.answered} of ${outcome.total} questions rated in this interview`}
          />
        </div>
      </div>

      {finished ? (
        <p className="text-sm leading-6 text-muted-strong">
          {outcome.covered} of {outcome.total} questions rated as answered (
          {outcome.coveredPercent} of 100), {outcome.partial} part-answered,{" "}
          {outcome.missed} you could not answer. A finished interview is what
          writes skill records, and it wrote only for the ones rated as answered.
        </p>
      ) : outcome.ready ? (
        <p className="text-sm leading-6 text-muted">
          Every question in this interview has a rating, so it can be finished.
          Finishing is the step that writes skill records; until then nothing
          from it reaches your progress.
        </p>
      ) : (
        <p className="text-sm leading-6 text-muted">
          {outcome.notReadyMessage}
        </p>
      )}

      <div className="space-y-3">
        {interview.questionIds.map((questionId) => (
          <QuestionAnswer
            key={questionId}
            interviewId={interview.id}
            questionId={questionId}
            attempt={attempts.find(
              (attempt) =>
                attempt.interviewId === interview.id &&
                attempt.questionId === questionId,
            )}
            actions={actions}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {!finished ? (
          <Button
            size="sm"
            disabled={!outcome.ready || finishBusy}
            onClick={() => void actions.finishInterview(interview.id)}
          >
            {finishBusy ? "Finishing…" : "Finish this interview"}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="danger"
          disabled={removeBusy}
          onClick={() => void actions.removeInterview(interview.id)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {removeBusy ? "Removing…" : "Remove this interview"}
        </Button>
      </div>
      {!finished && !outcome.ready ? (
        <p className="text-xs leading-5 text-muted">
          Finish stays disabled until all {outcome.total} questions are rated.
          Removing the interview is always available and writes nothing.
        </p>
      ) : null}
    </div>
  );
}

function SetupForm({
  actions,
  attempts,
}: {
  actions: InterviewActions;
  attempts: InterviewAttemptRecord[];
}) {
  const [topics, setTopics] = useState<InterviewTopic[]>(["sql"]);
  const [track, setTrack] = useState<CareerTrackSlug | "">("");
  const [count, setCount] = useState(5);

  const practisedQuestionIds = new Set(
    attempts.map((attempt) => attempt.questionId),
  );
  const topicCounts = INTERVIEW_TOPIC_ORDER.map(
    (topic) =>
      `${INTERVIEW_TOPIC_META[topic].label} ${countQuestionsForTopic(topic)}`,
  ).join(", ");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
          Areas to practise
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_TOPIC_ORDER.map((topic) => {
            const selected = topics.includes(topic);

            return (
              <button
                key={topic}
                type="button"
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-foreground"
                    : "rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted-strong"
                }
                onClick={() =>
                  setTopics((current) =>
                    current.includes(topic)
                      ? current.filter((entry) => entry !== topic)
                      : [...current, topic],
                  )
                }
              >
                {INTERVIEW_TOPIC_META[topic].label}
              </button>
            );
          })}
        </div>
        <FieldHint>
          {topics.length === 0
            ? "Pick at least one area, or there is nothing to draw questions from."
            : `${topics.length} of ${INTERVIEW_TOPIC_ORDER.length} areas picked. Questions per area in this app's bank: ${topicCounts}.`}
        </FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="interview-track">Role to aim the questions at</Label>
          <Select
            id="interview-track"
            value={track}
            onChange={(event) =>
              setTrack(event.target.value as CareerTrackSlug | "")
            }
          >
            <option value="">No particular role</option>
            {CAREER_TRACKS.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
          <FieldHint>
            Choosing a role adds the questions that role is asked because of what
            it is responsible for. Leaving it blank keeps the interview on the
            areas you picked above.
          </FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="interview-count">Questions in this interview</Label>
          <Select
            id="interview-count"
            value={String(count)}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            {COUNT_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice} questions
              </option>
            ))}
          </Select>
          <FieldHint>
            Between {MOCK_INTERVIEW_MIN_QUESTIONS} and {MOCK_INTERVIEW_MAX_QUESTIONS}{" "}
            questions, taken from the {INTERVIEW_QUESTIONS.length} this app holds.
            {practisedQuestionIds.size === 0
              ? " You have not answered a question yet, so the first set is drawn straight from the areas you picked."
              : ` You have answered ${practisedQuestionIds.size} of those ${INTERVIEW_QUESTIONS.length} questions at least once; the ones you have practised least are picked first.`}
          </FieldHint>
        </div>
      </div>

      <Button
        size="sm"
        disabled={topics.length === 0 || actions.busyId === "interview:start"}
        onClick={() =>
          void actions.startInterview({
            topics,
            track: track === "" ? null : track,
            count,
          })
        }
      >
        {actions.busyId === "interview:start"
          ? "Opening…"
          : `Open a ${count}-question practice interview`}
      </Button>
    </div>
  );
}

export function PracticeBoard({
  interviews,
  attempts,
  actions,
}: {
  interviews: MockInterviewRecord[];
  attempts: InterviewAttemptRecord[];
  actions: InterviewActions;
}) {
  const open = interviews.filter((interview) => interview.completedAt === null);
  const finished = interviews.filter((interview) => interview.completedAt !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks aria-hidden="true" className="size-4" />
          Practise an interview
        </CardTitle>
        <CardDescription>
          Pick the areas, choose how many questions, and this app builds the set
          from its own bank of {INTERVIEW_QUESTIONS.length} questions. You rate
          each answer yourself as you go. Nothing reaches your skill records until
          you finish the interview, and even then it records only the questions
          you rated as answered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SetupForm actions={actions} attempts={attempts} />

        {open.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-strong">
              Open interviews ({open.length})
            </h3>
            {open.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                attempts={attempts}
                actions={actions}
              />
            ))}
          </div>
        ) : null}

        {finished.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-strong">
              Finished interviews ({finished.length})
            </h3>
            {finished.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                attempts={attempts}
                actions={actions}
              />
            ))}
          </div>
        ) : open.length === 0 ? (
          <p className="text-sm leading-6 text-muted">
            No practice interview has been run on this account yet. Open one
            above and it appears here with every question you chose.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
