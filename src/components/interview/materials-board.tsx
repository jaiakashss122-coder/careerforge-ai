"use client";

import { NotebookText } from "lucide-react";
import Link from "next/link";
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
import { INTERVIEW_QUESTIONS } from "@/lib/interview/questions";
import { buildPracticeMaterials } from "@/lib/interview/mock";
import { INTERVIEW_TOPIC_META, type InterviewAttemptRecord } from "@/lib/interview/types";

export function MaterialsBoard({
  skillPercents,
  attempts,
}: {
  skillPercents: Map<string, number>;
  attempts: InterviewAttemptRecord[];
}) {
  const rows = buildPracticeMaterials({ skillPercents, attempts });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookText aria-hidden="true" className="size-4" />
          What to study before the next interview
        </CardTitle>
        <CardDescription>
          This list is built only from records this account already holds: a skill
          appears here when your own assessment scored it under 40 out of 100, or
          when you rated a question that needs it as one you could not answer. It
          never adds a skill it has no record of. Up to 6 skills are listed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={NotebookText}
            title="Nothing qualifies for this list yet"
            description={
              skillPercents.size === 0
                ? `There is no assessment score on this account, so no skill can be called a gap from scores, and you have rated ${attempts.length} interview ${
                    attempts.length === 1 ? "answer" : "answers"
                  } so far. Finish the skills assessment, then come back.`
                : "No skill sits under 40 out of 100 on your assessment, and no question you have answered was rated as one you could not answer. That is a result, not a missing feature."
            }
            action={
              skillPercents.size === 0 ? (
                <Link
                  href="/assessment"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Take the skills assessment
                </Link>
              ) : undefined
            }
          />
        ) : (
          rows.map((row) => (
            <div
              key={row.skillSlug}
              className="space-y-3 rounded-xl border border-border bg-surface-raised/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {row.skillName}
                </p>
                <Badge variant="muted">
                  {row.questions.length} question
                  {row.questions.length === 1 ? "" : "s"} in the bank need this
                </Badge>
                {row.lastAttempt ? (
                  <Badge variant="warning">Rated before</Badge>
                ) : null}
              </div>

              <p className="text-sm leading-6 text-muted">{row.advice}</p>

              <ul className="space-y-1.5">
                {row.questions.map((question) => (
                  <li key={question.id} className="text-sm leading-6 text-muted">
                    · {question.prompt}{" "}
                    <span className="text-xs text-muted">
                      ({INTERVIEW_TOPIC_META[question.topic].label})
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/roadmap"
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Open your roadmap
                </Link>
                <Link
                  href="/tutor"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  Ask the tutor about it
                </Link>
              </div>
            </div>
          ))
        )}

        <p className="text-xs leading-5 text-muted">
          Question counts here come from the {INTERVIEW_QUESTIONS.length}-question
          bank this app holds. A skill with no question in the bank is left out
          rather than given advice it cannot practise.
        </p>
      </CardContent>
    </Card>
  );
}
