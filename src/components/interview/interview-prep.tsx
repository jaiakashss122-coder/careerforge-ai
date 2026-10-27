"use client";

import { ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ApplicationBoard } from "@/components/interview/application-board";
import { MaterialsBoard } from "@/components/interview/materials-board";
import { PracticeBoard } from "@/components/interview/practice-board";
import { QuestionBank } from "@/components/interview/question-bank";
import { useInterviewActions } from "@/components/interview/use-interview-actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { INTERVIEW_EVIDENCE_LABEL } from "@/lib/interview/mock";
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_EVIDENCE_RULE,
} from "@/lib/interview/questions";
import { INTERVIEW_TOPIC_ORDER } from "@/lib/interview/types";
import { SKILLS } from "@/lib/skills/catalog";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { gapMaps } from "@/lib/materials/backing";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

function InterviewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your interview preparation</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

export function InterviewPrep({
  mode,
  initialWorkspace,
}: {
  mode: "preview" | "supabase";
  initialWorkspace: WorkspaceSnapshot;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    initialWorkspace,
    previewMode,
  );

  const actions = useInterviewActions({ previewMode });

  const { skillPercents, evidenceLevels } = useMemo(
    () => gapMaps(workspace),
    [workspace],
  );

  if (previewMode && !hydrated) {
    return <InterviewSkeleton />;
  }

  const openCount = workspace.mockInterviews.filter(
    (interview) => interview.completedAt === null,
  ).length;
  const finishedCount = workspace.mockInterviews.length - openCount;
  const hasAssessment = skillPercents.size > 0;
  const interviewEvidenceCount = workspace.evidence.filter(
    (record) => record.sourceType === "interview",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interview Preparation"
        title="Practise the questions, then read a posting against your own records"
        description={`${INTERVIEW_QUESTIONS.length} questions across ${INTERVIEW_TOPIC_ORDER.length} areas are written into this app, and you rate each answer yourself. ${workspace.mockInterviews.length} practice ${
          workspace.mockInterviews.length === 1 ? "interview has" : "interviews have"
        } been run here, ${finishedCount} finished. ${workspace.jobApplications.length} saved ${
          workspace.jobApplications.length === 1 ? "role is" : "roles are"
        } tracked, and each one with posting text is compared against the ${SKILLS.length} skills this app scores.`}
        actions={
          <>
            <Badge variant="muted">
              {openCount > 0
                ? `${openCount} interview still open to finish`
                : `${interviewEvidenceCount} skill record${
                    interviewEvidenceCount === 1 ? "" : "s"
                  } written from practice`}
            </Badge>
            <Link
              href="/progress"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              See the effect on your progress
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          Practice interviews, written answers, ratings and saved roles are kept
          in this browser only, because no Supabase database is configured. The
          same rules still run here: nothing is written to a skill record until an
          interview is finished, and only for the questions you rated as answered.
        </Alert>
      ) : null}

      {!hasAssessment ? (
        <Alert variant="info" title="The comparison has no scores to work from">
          No skills assessment is recorded on this account, so a posting can only
          be matched to finished work, never scored against what you know. Take
          the assessment first and the gap list gains your own percentages.
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
            <ShieldQuestion aria-hidden="true" className="size-4" />
            What an interview can and cannot prove here
          </CardTitle>
          <CardDescription>
            Read this before the first rating, because it decides how much weight
            to put on anything below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm leading-6 text-muted-strong">
            {INTERVIEW_EVIDENCE_RULE}
          </p>
          <p className="text-sm leading-6 text-muted">
            {INTERVIEW_EVIDENCE_LABEL}
          </p>
          <p className="text-sm leading-6 text-muted">
            {workspace.interviewAttempts.length}{" "}
            {workspace.interviewAttempts.length === 1
              ? "answer is"
              : "answers are"}
            recorded on this account, and {interviewEvidenceCount} of the{" "}
            {SKILLS.length} skills have a record that came from a finished
            interview. Removing an interview removes the records it wrote.
          </p>
        </CardContent>
      </Card>

      <PracticeBoard
        interviews={workspace.mockInterviews}
        attempts={workspace.interviewAttempts}
        actions={actions}
      />

      <QuestionBank
        attempts={workspace.interviewAttempts}
        interviews={workspace.mockInterviews}
      />

      <MaterialsBoard
        skillPercents={skillPercents}
        attempts={workspace.interviewAttempts}
      />

      <ApplicationBoard
        applications={workspace.jobApplications}
        skillPercents={skillPercents}
        evidenceLevels={evidenceLevels}
        actions={actions}
      />
    </div>
  );
}
