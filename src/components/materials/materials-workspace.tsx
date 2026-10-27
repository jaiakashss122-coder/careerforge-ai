"use client";

import {
  AtSign,
  ChartNoAxesColumn,
  FileText,
  FolderKanban,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DocumentShell } from "@/components/materials/document-shell";
import { TailoringBoard } from "@/components/materials/tailoring-board";
import { useMaterialsActions } from "@/components/materials/use-materials-actions";
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
import { Progress } from "@/components/ui/progress";
import type { Profile } from "@/lib/profile/schema";
import {
  buildSkillProofs,
  draftFingerprint,
  summarizeProofs,
} from "@/lib/materials/backing";
import { buildLinkedIn } from "@/lib/materials/linkedin";
import { buildPortfolio } from "@/lib/materials/portfolio";
import { buildResume } from "@/lib/materials/resume";
import { pluralise } from "@/lib/materials/text";
import {
  CLAIM_STRENGTH_META,
  CLAIM_STRENGTHS,
  MATERIALS_DISCLAIMER,
  MATERIAL_KINDS,
  PLATFORM_LIMIT_NOTE,
  type MaterialDraftRecord,
  type MaterialKind,
} from "@/lib/materials/types";
import type { PlatformUsage } from "@/lib/materials/linkedin";
import { usePreviewProfile } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { SKILLS } from "@/lib/skills/catalog";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

function MaterialsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your application materials</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function UsageLine({
  name,
  usage,
  limitNote,
}: {
  name: string;
  usage: PlatformUsage;
  limitNote: string;
}) {
  const percent = Math.min(
    100,
    Math.round((usage.characters / usage.limit) * 100),
  );

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <Badge variant={usage.over ? "danger" : "muted"}>
          {usage.characters} of {usage.limit} characters used —{" "}
          {usage.over
            ? `${Math.abs(usage.room)} over the count this app was given`
            : `${usage.room} left`}
        </Badge>
      </div>
      <Progress
        value={percent}
        label={`${name}: ${usage.characters} of ${usage.limit} characters used`}
        indicatorClassName={usage.over ? "bg-danger" : undefined}
      />
      <p className="text-xs leading-5 text-muted">{limitNote}</p>
    </div>
  );
}

export function MaterialsWorkspace({
  mode,
  initialWorkspace,
  initialProfile,
}: {
  mode: "preview" | "supabase";
  initialWorkspace: WorkspaceSnapshot;
  initialProfile: Profile | null;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    initialWorkspace,
    previewMode,
  );
  const profile = usePreviewProfile(initialProfile, previewMode);
  const actions = useMaterialsActions({ previewMode });

  const proofs = useMemo(
    () => buildSkillProofs({ workspace, profile }),
    [workspace, profile],
  );
  const claims = useMemo(() => summarizeProofs(proofs), [proofs]);
  const resume = useMemo(
    () => buildResume({ workspace, profile, proofs }),
    [workspace, profile, proofs],
  );
  const linkedin = useMemo(
    () => buildLinkedIn({ workspace, profile, proofs }),
    [workspace, profile, proofs],
  );
  const portfolio = useMemo(() => buildPortfolio({ workspace }), [workspace]);
  const today = useMemo(
    () => draftFingerprint({ workspace, proofs }),
    [workspace, proofs],
  );

  if (previewMode && !hydrated) {
    return <MaterialsSkeleton />;
  }

  const draftFor = (kind: MaterialKind): MaterialDraftRecord | null =>
    workspace.materials.find((draft) => draft.kind === kind) ?? null;
  const completedProjects = workspace.projects.filter(
    (project) => project.status === "completed",
  ).length;
  const finishedInterviews = workspace.mockInterviews.filter(
    (interview) => interview.completedAt !== null,
  ).length;
  const savedDrafts = workspace.materials.length;
  const headerDescription = [
    `This page writes from what is already on this account: ${pluralise(
      workspace.projects.length,
      "project",
      "projects",
    )} (${completedProjects} finished), ${pluralise(
      workspace.evidence.length,
      "skill record",
      "skill records",
    )}, ${pluralise(
      finishedInterviews,
      "practice interview you rated yourself",
      "practice interviews you rated yourself",
    )} and ${pluralise(
      workspace.jobApplications.length,
      "saved role",
      "saved roles",
    )}.`,
    "It has no access to a transcript, an employer, or a reviewer, so it adds no job title, grade, salary, or measurement of your work.",
    `${savedDrafts} of the ${MATERIAL_KINDS.length} documents ${
      savedDrafts === 1 ? "holds" : "hold"
    } wording you saved here.`,
  ].join(" ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Application Materials"
        title="Three documents, and nothing in them that your records do not support"
        description={headerDescription}
        actions={
          <>
            <Badge variant="muted">
              {claims.listable.length} of the {SKILLS.length} skills this app
              scores can be listed
            </Badge>
            <Link
              href="/progress"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              See the records behind them
            </Link>
          </>
        }
      />

      {previewMode ? (
        <Alert variant="warning" title="Local preview mode">
          Your wording, and every record these documents are built from, is kept
          in this browser only, because no Supabase database is configured. The
          same rules still run here: a skill reaches these documents only from
          finished work or your own assessment score, and nothing is invented to
          fill a section.
        </Alert>
      ) : null}

      <Alert variant="info" title="Read this before you send any of it">
        {MATERIALS_DISCLAIMER}
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartNoAxesColumn aria-hidden="true" className="size-4" />
            How a skill earns its place on these documents
          </CardTitle>
          <CardDescription>
            One rule, used on all three screens below. It is the difference
            between a claim a reviewer can check and one that falls over in the
            room.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CLAIM_STRENGTHS.map((strength) => (
            <div
              key={strength}
              className="space-y-1.5 rounded-xl border border-border bg-surface-raised/40 p-3.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {CLAIM_STRENGTH_META[strength].label}
                </p>
                <Badge
                  variant={
                    strength === "shown"
                      ? "success"
                      : strength === "nothing"
                        ? "muted"
                        : "outline"
                  }
                >
                  {claims.counts[strength]} of the {SKILLS.length} skills
                </Badge>
              </div>
              <p className="text-sm leading-6 text-muted-strong">
                {CLAIM_STRENGTH_META[strength].onTheDocument}
              </p>
              <p className="text-xs leading-5 text-muted">
                {CLAIM_STRENGTH_META[strength].why}
              </p>
            </div>
          ))}
          <p className="text-xs leading-5 text-muted">
            The five counts add up to the {SKILLS.length} skills this app scores,
            so a skill never sits in two rows at once.
          </p>
        </CardContent>
      </Card>

      <DocumentShell
        kind="resume"
        icon={FileText}
        summary={resume.headline}
        counts={resume.counts}
        blocks={resume.blocks}
        exportTitle={
          resume.target
            ? `Résumé — ${resume.target.name}`
            : "Résumé — no target role saved"
        }
        draft={draftFor("resume")}
        applications={workspace.jobApplications}
        currentFingerprint={today}
        actions={actions}
      />

      <DocumentShell
        kind="linkedin"
        icon={AtSign}
        summary={linkedin.summary}
        counts={linkedin.counts}
        blocks={linkedin.blocks}
        exportTitle={
          linkedin.target
            ? `LinkedIn profile text — ${linkedin.target.name}`
            : "LinkedIn profile text — no target role saved"
        }
        extra={
          <div className="space-y-4 rounded-2xl border border-border bg-surface/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ScrollText aria-hidden="true" className="size-4" />
              How much room the two long fields have left
            </h3>
            <UsageLine
              name="Headline"
              usage={linkedin.usage.headline}
              limitNote="The line under your name. Nothing here opens LinkedIn, so this app counts against the number it was given."
            />
            <UsageLine
              name="About"
              usage={linkedin.usage.about}
              limitNote="The paragraph a recruiter reads before opening your résumé. The bracketed figure line inside it is an instruction to you, not a sentence to keep."
            />
            <p className="text-xs leading-5 text-muted">{PLATFORM_LIMIT_NOTE}</p>
          </div>
        }
        draft={draftFor("linkedin")}
        applications={workspace.jobApplications}
        currentFingerprint={today}
        actions={actions}
      />

      <DocumentShell
        kind="portfolio"
        icon={FolderKanban}
        summary={portfolio.summary}
        counts={portfolio.counts}
        blocks={portfolio.blocks}
        exportTitle="Portfolio review — what your records already show"
        draft={draftFor("portfolio")}
        applications={workspace.jobApplications}
        currentFingerprint={today}
        actions={actions}
      />

      <TailoringBoard
        workspace={workspace}
        proofs={proofs}
        applications={workspace.jobApplications}
      />
    </div>
  );
}
