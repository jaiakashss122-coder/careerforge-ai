"use client";

import { BookOpenText } from "lucide-react";
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
import { FieldHint } from "@/components/ui/input";
import { getSkillName } from "@/lib/skills/catalog";
import { INTERVIEW_BANK_DISCLAIMER } from "@/lib/interview/questions";
import {
  ANSWER_RATING_META,
  INTERVIEW_TOPIC_META,
  INTERVIEW_TOPIC_ORDER,
  type AnswerRating,
  type InterviewAttemptRecord,
  type InterviewTopic,
  type MockInterviewRecord,
} from "@/lib/interview/types";
import {
  INTERVIEW_QUESTIONS,
  countQuestionsForTopic,
} from "@/lib/interview/questions";

const RATING_VARIANT: Record<AnswerRating, BadgeVariant> = {
  covered: "success",
  partial: "warning",
  "not-covered": "danger",
};

function latestAttemptFor(
  questionId: string,
  attempts: InterviewAttemptRecord[],
): InterviewAttemptRecord | null {
  let latest: InterviewAttemptRecord | null = null;

  for (const attempt of attempts) {
    if (attempt.questionId !== questionId) continue;
    if (!latest || attempt.createdAt > latest.createdAt) latest = attempt;
  }

  return latest;
}

function QuestionRow({
  questionId,
  attempts,
  interviews,
}: {
  questionId: string;
  attempts: InterviewAttemptRecord[];
  interviews: MockInterviewRecord[];
}) {
  const [open, setOpen] = useState(false);
  const question = INTERVIEW_QUESTIONS.find((entry) => entry.id === questionId);
  const history = attempts.filter((attempt) => attempt.questionId === questionId);
  const latest = latestAttemptFor(questionId, attempts);

  if (!question) return null;

  const sourceLabel = latest
    ? interviews.find((interview) => interview.id === latest.interviewId)?.label ??
      "practised on its own"
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface-raised/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-6 text-foreground">
          {question.prompt}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {latest ? (
            <Badge variant={RATING_VARIANT[latest.rating]}>
              Last rated: {ANSWER_RATING_META[latest.rating].label}
            </Badge>
          ) : (
            <Badge variant="outline">Never answered here</Badge>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
          >
            {open ? "Hide the details" : "Show the details"}
          </Button>
        </div>
      </div>

      {latest ? (
        <p className="mt-2 text-xs leading-5 text-muted">
          Your {history.length} recorded{" "}
          {history.length === 1 ? "answer" : "answers"} to this question, most
          recent on {latest.createdAt.slice(0, 10)} during{" "}
          {sourceLabel === "practised on its own"
            ? sourceLabel
            : `the interview “${sourceLabel}”`}
          .
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                Follow-ups an interviewer usually asks next (
                {question.followUps.length})
              </p>
              <ul className="space-y-1 text-sm leading-6 text-muted">
                {question.followUps.map((followUp) => (
                  <li key={followUp}>· {followUp}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Skills this question needs ({question.skills.length})
            </p>
            {question.skills.length === 0 ? (
              <p className="text-sm leading-6 text-muted">
                This question is about how you describe your own work, so it names
                no skill and can never add a skill record.
              </p>
            ) : (
              <ul className="space-y-1 text-sm leading-6 text-muted">
                {question.skills.map((slug) => (
                  <li key={slug}>· {getSkillName(slug)}</li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-sm leading-6 text-muted">
            Why an interviewer asks this: {question.askedWhy}
          </p>

          {history.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                What you wrote ({history.length}{" "}
                {history.length === 1 ? "answer" : "answers"})
              </p>
              {history.map((attempt) => (
                <div
                  key={attempt.id}
                  className="space-y-1 rounded-lg border border-border bg-surface/60 p-3"
                >
                  <p className="text-xs leading-5 text-muted">
                    {attempt.createdAt.slice(0, 16).replace("T", " ")} UTC ·{" "}
                    {ANSWER_RATING_META[attempt.rating].label}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-strong">
                    {attempt.answerText === ""
                      ? "No words were written; only the rating was recorded."
                      : attempt.answerText}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QuestionBank({
  attempts,
  interviews,
}: {
  attempts: InterviewAttemptRecord[];
  interviews: MockInterviewRecord[];
}) {
  const [topic, setTopic] = useState<InterviewTopic>("python");
  const questions = INTERVIEW_QUESTIONS.filter(
    (question) => question.topic === topic,
  );
  const answeredIds = new Set(attempts.map((attempt) => attempt.questionId));
  const answeredHere = questions.filter((question) =>
    answeredIds.has(question.id),
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenText aria-hidden="true" className="size-4" />
          The question bank
        </CardTitle>
        <CardDescription>
          All {INTERVIEW_QUESTIONS.length} questions this app can ask, sorted into{" "}
          {INTERVIEW_TOPIC_ORDER.length} areas. Reading a question here does not
          record anything. To answer one, open a practice interview above — this
          screen only shows what you have already recorded against each question.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_TOPIC_ORDER.map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={entry === topic}
              className={
                entry === topic
                  ? "rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-foreground"
                  : "rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted-strong"
              }
              onClick={() => setTopic(entry)}
            >
              {INTERVIEW_TOPIC_META[entry].label} ·{" "}
              {countQuestionsForTopic(entry)}
            </button>
          ))}
        </div>

        <p className="text-sm leading-6 text-muted-strong">
          {INTERVIEW_TOPIC_META[topic].whatItProbes}
        </p>
        <FieldHint>
          {answeredHere} of {questions.length} questions in this area have at
          least one recorded answer on this account.
        </FieldHint>

        <div className="space-y-3">
          {questions.map((question) => (
            <QuestionRow
              key={question.id}
              questionId={question.id}
              attempts={attempts}
              interviews={interviews}
            />
          ))}
        </div>

        <p className="text-xs leading-5 text-muted">
          {INTERVIEW_BANK_DISCLAIMER}
        </p>
      </CardContent>
    </Card>
  );
}
