"use client";

import { ExternalLink, Radar } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  LEARN_NOW_PERCENT_CEILING,
  buildIntelligenceModel,
  formatIntelligenceDay,
  formatPublishedDate,
  type ClassifiedUpdate,
} from "@/lib/intelligence/briefing";
import {
  INTELLIGENCE_DISCLAIMER,
  INTELLIGENCE_MISSING_DATA,
  INTELLIGENCE_SNAPSHOT,
} from "@/lib/intelligence/sources";
import {
  ATTENTION_LEVELS,
  ATTENTION_META,
  INTELLIGENCE_SOURCE_KIND_LABELS,
  INTELLIGENCE_TOPIC_META,
  type AttentionLevel,
  type IntelligenceTopic,
} from "@/lib/intelligence/types";
import { getCareerTrack } from "@/lib/career/tracks";
import type {
  CareerExperimentRecord,
  CareerPreferenceRecord,
} from "@/lib/career/types";
import type { AssessmentSummary } from "@/lib/assessment/types";
import { getSkillName } from "@/lib/skills/catalog";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import type { Profile } from "@/lib/profile/schema";
import { getLatestAssessment } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";

const EMPTY_WORKSPACE = createEmptyWorkspace();

const ATTENTION_VARIANT: Record<AttentionLevel, BadgeVariant> = {
  "learn-now": "accent",
  "learn-later": "warning",
  monitor: "muted",
};

const TOPIC_FILTER_ALL = "all";

function BoardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading the industry snapshot</span>
      <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function SourceLine({ item }: { item: ClassifiedUpdate }) {
  const { update } = item;

  return (
    <p className="text-xs leading-5 text-muted">
      <a
        href={update.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 font-semibold text-primary-strong underline underline-offset-4"
      >
        {update.sourceName}
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
      {" · "}
      {INTELLIGENCE_SOURCE_KIND_LABELS[update.sourceKind]}
      {" · published "}
      {formatPublishedDate(update)}
      {" · read here "}
      {formatIntelligenceDay(update.readOn)}
    </p>
  );
}

function UpdateRow({ item }: { item: ClassifiedUpdate }) {
  const { update, attention, reason } = item;

  return (
    <article className="rounded-2xl border border-border bg-surface/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={ATTENTION_VARIANT[attention]}>
          {ATTENTION_META[attention].label}
        </Badge>
        <Badge variant="outline">{INTELLIGENCE_TOPIC_META[update.topic].label}</Badge>
      </div>

      <h3 className="mt-3 text-pretty text-base font-semibold text-foreground">
        {update.headline}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-strong">
        {update.whatChanged}
      </p>

      <p className="mt-2 text-sm leading-6 text-muted">
        <span className="font-semibold text-foreground">Why it matters here: </span>
        {update.whyItMatters}
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-strong">
        <span className="font-semibold text-foreground">
          Why this page put it under {ATTENTION_META[attention].label.toLowerCase()}:{" "}
        </span>
        {reason}
      </p>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-semibold uppercase tracking-wide text-muted">
            Roles this affects
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {update.tracks.map((slug) => (
              <Badge key={slug} variant="muted">
                {getCareerTrack(slug)?.name ?? slug}
              </Badge>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide text-muted">
            Skills it needs
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {update.skills.map((slug) => (
              <Badge key={slug} variant="muted">
                {getSkillName(slug)}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <SourceLine item={item} />
      </div>
    </article>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-foreground"
          : "rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-muted-strong hover:bg-surface-hover"
      }
    >
      {children}
    </button>
  );
}

export function IntelligenceBoard({
  mode,
  initialSummary,
  initialExperiments,
  initialPreference,
  initialProfile,
}: {
  mode: "preview" | "supabase";
  initialSummary: AssessmentSummary | null;
  initialExperiments: CareerExperimentRecord[];
  initialPreference: CareerPreferenceRecord | null;
  initialProfile: Profile | null;
}) {
  const previewMode = mode === "preview";
  const { workspace, hydrated } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );
  const { profile } = usePreviewProfileSnapshot(initialProfile, previewMode);
  const [topic, setTopic] = useState<IntelligenceTopic | typeof TOPIC_FILTER_ALL>(
    TOPIC_FILTER_ALL,
  );
  const [attention, setAttention] = useState<AttentionLevel | typeof TOPIC_FILTER_ALL>(
    TOPIC_FILTER_ALL,
  );

  const model = useMemo(
    () =>
      buildIntelligenceModel({
        summary: previewMode
          ? getLatestAssessment(workspace.assessments)?.summary ?? null
          : initialSummary,
        experiments: previewMode
          ? workspace.careerExperiments
          : initialExperiments,
        preference: previewMode
          ? workspace.careerPreferences[0] ?? null
          : initialPreference,
        profileTarget: profile?.targetCareerSlug ?? null,
      }),
    [
      initialExperiments,
      initialPreference,
      initialSummary,
      previewMode,
      profile,
      workspace,
    ],
  );

  const matches = (item: ClassifiedUpdate) =>
    (topic === TOPIC_FILTER_ALL || item.update.topic === topic) &&
    (attention === TOPIC_FILTER_ALL || item.attention === attention);

  const visible = model.entries.filter(matches);

  const visibleWeeks = model.weeks
    .map((week) => ({ ...week, items: week.items.filter(matches) }))
    .filter((week) => week.items.length > 0);

  const visibleUndated = model.undated.filter(matches);

  if (previewMode && !hydrated) return <BoardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Career"
        title="Industry Intelligence"
        description="A dated snapshot of what changed in generative AI, data platforms, and machine learning systems, with every entry linked to the source that states it."
        actions={
          <Link href="/careers" className={buttonStyles({ variant: "outline", size: "sm" })}>
            <Radar aria-hidden="true" className="size-4" />
            Test the roles instead
          </Link>
        }
      />

      {previewMode ? (
        <Alert
          variant="info"
          title="Preview mode"
          className="border-warning/25 bg-warning/8"
        >
          This browser holds no signed-in account, so the roles and skills below come
          from this device only. The entries themselves come from the linked sources.
        </Alert>
      ) : null}

      <Alert variant="warning" title="This is a snapshot, not a live feed">
        {INTELLIGENCE_SNAPSHOT.note}
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>How this page sorted itself for you</CardTitle>
          <CardDescription>
            Nothing here is ranked by popularity. Each label comes from a rule you can
            read below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-strong">{model.headline}</p>

          <p className="text-sm leading-6 text-foreground">
            <span className="font-semibold">
              {model.goal.track === null ? "Why nothing is marked learn now: " : "Your recorded direction: "}
            </span>
            {model.goal.track === null
              ? `${model.goal.label}, because ${model.goal.source}. Every entry is therefore set to just monitor it.`
              : `${model.goal.label} — from ${model.goal.source}.`}
          </p>

          {!model.hasAssessment ? (
            <p className="text-sm leading-6 text-muted">
              You have no assessment result in this workspace, so no skill score exists to
              compare against. Only your recorded direction can pull an entry forward here.
            </p>
          ) : model.weakSkills.length > 0 ? (
            <p className="text-sm leading-6 text-muted-strong">
              <span className="font-semibold">Skills your assessment scored under{" "}
                {LEARN_NOW_PERCENT_CEILING} percent: </span>
              {model.weakSkills
                .map((skill) => `${skill.name} (${skill.percent}%)`)
                .join(", ")}
              . An entry is pulled forward when it needs one of these.
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Every skill in your assessment scored {LEARN_NOW_PERCENT_CEILING} percent or
              above, so only your recorded direction can pull an entry forward.
            </p>
          )}

          <ul className="grid gap-2 text-sm leading-6 sm:grid-cols-3">
            {ATTENTION_LEVELS.map((level) => (
              <li key={level} className="rounded-xl border border-border bg-surface-raised p-3">
                <p className="font-semibold text-foreground">
                  {ATTENTION_META[level].label}
                  {" · "}
                  {model.counts[level]}
                  {model.counts[level] === 1 ? " entry" : " entries"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {ATTENTION_META[level].meaning}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly briefing</CardTitle>
          <CardDescription>
            {model.weeks.length} weeks contain the dated entries, newest week first. Use
            the filters to narrow them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={topic === TOPIC_FILTER_ALL}
              onClick={() => setTopic(TOPIC_FILTER_ALL)}
            >
              All areas ({model.totalEntries})
            </FilterButton>
            {model.topicCounts.map((entry) => (
              <FilterButton
                key={entry.topic}
                active={topic === entry.topic}
                onClick={() => setTopic(entry.topic)}
              >
                {entry.label} ({entry.count})
              </FilterButton>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={attention === TOPIC_FILTER_ALL}
              onClick={() => setAttention(TOPIC_FILTER_ALL)}
            >
              Any label ({model.totalEntries})
            </FilterButton>
            {ATTENTION_LEVELS.map((level) => (
              <FilterButton
                key={level}
                active={attention === level}
                onClick={() => setAttention(level)}
              >
                {ATTENTION_META[level].label} ({model.counts[level]})
              </FilterButton>
            ))}
          </div>

          <p className="text-xs leading-5 text-muted">
            Showing {visible.length} of {model.totalEntries} entries.{" "}
            {model.undated.length === 1
              ? "1 entry is grouped at the end rather than inside a week because its source shows no date."
              : `${model.undated.length} entries are grouped at the end rather than inside a week because their sources show no date.`}
          </p>

          {visible.length === 0 ? (
            <Alert variant="info">
              This combination has no entries. Pick another area or label; the counts on
              each button tell you what is available.
            </Alert>
          ) : null}

          {visibleWeeks.map((week) => (
            <section key={week.key} className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-sm font-semibold text-foreground">{week.label}</h3>
                <span className="text-xs text-muted">
                  {week.items.length} of {week.count} entries in this week match your
                  filters
                </span>
              </div>
              <ul className="space-y-3">
                {week.items.map((item) => (
                  <li key={item.update.id}>
                    <UpdateRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {visibleUndated.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Sources with no date shown
              </h3>
              <p className="text-xs leading-5 text-muted">
                These are living documentation pages. They are listed apart from the week
                groups because a documentation page states a current position rather than an
                event, and the date it was read here is the only date available.
              </p>
              <ul className="space-y-3">
                {visibleUndated.map((item) => (
                  <li key={item.update.id}>
                    <UpdateRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this page deliberately does not have</CardTitle>
          <CardDescription>
            The plan promised a sourced view of what employers ask for. Part of that could
            not be sourced honestly, so it is left out rather than approximated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm leading-6">
            {INTELLIGENCE_MISSING_DATA.map((item) => (
              <li key={item.heading} className="rounded-xl border border-border bg-surface-raised p-3">
                <p className="font-semibold text-foreground">{item.heading}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.reason}</p>
              </li>
            ))}
          </ul>

          <p className="text-xs leading-5 text-muted">{INTELLIGENCE_DISCLAIMER}</p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/tutor" className={buttonStyles({ size: "sm" })}>
              Work through one of these in the tutor
            </Link>
            <Link
              href="/prompts"
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              Build a prompt around it
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
