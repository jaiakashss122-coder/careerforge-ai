import type { AssessmentSummary } from "@/lib/assessment/types";
import {
  getCareerTrack,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import type {
  CareerExperimentRecord,
  CareerPreferenceRecord,
} from "@/lib/career/types";
import { getSkillName } from "@/lib/skills/catalog";
import { INDUSTRY_UPDATES, INTELLIGENCE_SNAPSHOT } from "@/lib/intelligence/sources";
import {
  INTELLIGENCE_TOPIC_META,
  INTELLIGENCE_TOPIC_ORDER,
  type AttentionLevel,
  type IndustryUpdate,
  type IntelligenceTopic,
} from "@/lib/intelligence/types";

export const LEARN_NOW_PERCENT_CEILING = 60;

export type ClassifiedUpdate = {
  update: IndustryUpdate;
  attention: AttentionLevel;
  reason: string;
};

export type IntelligenceWeek = {
  key: string;
  label: string;
  count: number;
  items: ClassifiedUpdate[];
};

export type IntelligenceGoal = {
  track: CareerTrackSlug | null;
  label: string;
  source: string;
};

export type IntelligenceModel = {
  readOn: string;
  totalEntries: number;
  entries: ClassifiedUpdate[];
  counts: Record<AttentionLevel, number>;
  topicCounts: { topic: IntelligenceTopic; label: string; count: number }[];
  weeks: IntelligenceWeek[];
  undated: ClassifiedUpdate[];
  goal: IntelligenceGoal;
  hasAssessment: boolean;
  weakSkills: { slug: string; name: string; percent: number }[];
  headline: string;
  testedTracks: CareerTrackSlug[];
};

const ATTENTION_RANK: Record<AttentionLevel, number> = {
  "learn-now": 0,
  "learn-later": 1,
  monitor: 2,
};

function trackName(slug: CareerTrackSlug): string {
  return getCareerTrack(slug)?.name ?? slug;
}

function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");

  if (!year || !month || !day) return isoDate;

  const stamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
  );
  const date = new Date(stamp);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatIntelligenceDay(isoDate: string): string {
  return formatDay(isoDate);
}

export function formatPublishedDate(update: IndustryUpdate): string {
  if (update.datePrecision === "undated") {
    return `no date shown on the source, read ${formatDay(update.readOn)}`;
  }

  if (update.datePrecision === "month") {
    const [year, month] = update.publishedOn.split("-");
    const stamp = Date.UTC(Number(year), Number(month ?? "1") - 1, 12);

    return `${new Date(stamp).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })} (the source dates this by month)`;
  }

  return formatDay(update.publishedOn);
}

function weekOf(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  const stamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
  );
  const date = new Date(stamp);
  const weekday = date.getUTCDay();
  const offsetToMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(stamp - offsetToMonday * 86_400_000);
  const isoYear = monday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4, 12));
  const jan4Weekday = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const weekOneStart = jan4.getTime() - (jan4Weekday - 1) * 86_400_000;
  const weekNumber =
    Math.floor((monday.getTime() - weekOneStart) / (7 * 86_400_000)) + 1;

  return {
    key: `${isoYear}-W${String(weekNumber).padStart(2, "0")}`,
    label: `Week beginning ${formatDay(monday.toISOString().slice(0, 10))}`,
    sortValue: monday.getTime(),
  };
}

function getWeakSkills(summary: AssessmentSummary | null) {
  if (!summary) return [];

  const weak: { slug: string; name: string; percent: number }[] = [];

  for (const section of summary.sections) {
    for (const skill of section.skills) {
      if (skill.percent < LEARN_NOW_PERCENT_CEILING) {
        weak.push({
          slug: skill.skillSlug,
          name: skill.skillName || getSkillName(skill.skillSlug),
          percent: skill.percent,
        });
      }
    }
  }

  return weak.sort((left, right) => left.percent - right.percent);
}

export function getIntelligenceGoal({
  preference,
  profileTarget,
  summary,
}: {
  preference: CareerPreferenceRecord | null;
  profileTarget?: CareerTrackSlug | null;
  summary: AssessmentSummary | null;
}): IntelligenceGoal {
  const choice = preference?.specializationChoice ?? null;
  const target =
    profileTarget === undefined ? (summary?.profileTarget ?? null) : profileTarget;

  if (choice) {
    return {
      track: choice,
      label: trackName(choice),
      source: "the choice you saved on the Career Explorer",
    };
  }

  if (target) {
    return {
      track: target,
      label: trackName(target),
      source: "the target role saved in your profile",
    };
  }

  const best = [...(summary?.careerRecommendations ?? [])].sort(
    (left, right) => right.fitScore - left.fitScore,
  )[0];

  if (best) {
    return {
      track: best.slug,
      label: best.name,
      source: `the highest-scoring role in your latest assessment (${best.fitScore} of 100)`,
    };
  }

  return {
    track: null,
    label: "No direction recorded yet",
    source: "no saved choice, no target role, and no assessment result",
  };
}

function classify(
  update: IndustryUpdate,
  {
    goal,
    weakSkills,
    testedTracks,
  }: {
    goal: IntelligenceGoal;
    weakSkills: { slug: string; name: string; percent: number }[];
    testedTracks: CareerTrackSlug[];
  },
): ClassifiedUpdate {
  const weakMatch = update.skills.find(
    (slug) =>
      weakSkills.find((skill) => skill.slug === slug) !== undefined,
  );

  if (goal.track !== null && update.tracks.includes(goal.track)) {
    return {
      update,
      attention: "learn-now",
      reason: `It is about ${goal.label}, which is ${goal.source}.`,
    };
  }

  if (weakMatch !== undefined) {
    const skill = weakSkills.find((item) => item.slug === weakMatch);

    if (skill) {
      return {
        update,
        attention: "learn-now",
        reason: `Your own assessment scored ${skill.name} at ${skill.percent} percent, under the ${LEARN_NOW_PERCENT_CEILING} percent line this app treats as not shown yet, and this change needs that skill.`,
      };
    }
  }

  const sharedTrack = update.tracks.find((slug) =>
    testedTracks.includes(slug),
  );

  if (sharedTrack !== undefined) {
    return {
      update,
      attention: "learn-later",
      reason: `You have already run the ${trackName(sharedTrack)} experiment, so this is worth your time once the direction you chose is handled.`,
    };
  }

  if (goal.track !== null) {
    const goalFamily = getCareerTrack(goal.track)?.family ?? null;
    const sameFamily = update.tracks.find(
      (slug) => getCareerTrack(slug)?.family === goalFamily,
    );

    if (sameFamily !== undefined) {
      return {
        update,
        attention: "learn-later",
        reason: `${trackName(sameFamily)} is in the same family as ${goal.label}, so it is adjacent to your direction rather than part of it.`,
      };
    }
  }

  return {
    update,
    attention: "monitor",
    reason:
      goal.track === null
        ? "Nothing here can be tied to your goals yet, because your workspace has no saved direction and no assessment result."
        : `Neither the roles it names (${update.tracks
            .map((slug) => trackName(slug))
            .join(", ")}) nor the skills it needs match ${goal.label} or your recorded results.`,
  };
}

function sortByAttentionThenDate(items: ClassifiedUpdate[]) {
  return [...items].sort((left, right) => {
    const attention =
      ATTENTION_RANK[left.attention] - ATTENTION_RANK[right.attention];

    if (attention !== 0) return attention;

    return right.update.publishedOn.localeCompare(left.update.publishedOn);
  });
}

export function buildIntelligenceModel({
  summary,
  preference,
  experiments,
  profileTarget,
}: {
  summary: AssessmentSummary | null;
  preference: CareerPreferenceRecord | null;
  experiments: CareerExperimentRecord[];
  profileTarget?: CareerTrackSlug | null;
}): IntelligenceModel {
  const goal = getIntelligenceGoal({ preference, profileTarget, summary });
  const weakSkills = getWeakSkills(summary);
  const testedTracks = experiments
    .filter((record) => record.status === "completed")
    .map((record) => record.careerSlug);

  const classified = sortByAttentionThenDate(
    INDUSTRY_UPDATES.map((update) =>
      classify(update, { goal, weakSkills, testedTracks }),
    ),
  );

  const counts: Record<AttentionLevel, number> = {
    "learn-now": 0,
    "learn-later": 0,
    monitor: 0,
  };

  for (const item of classified) {
    counts[item.attention] += 1;
  }

  const dated = classified.filter(
    (item) => item.update.datePrecision !== "undated",
  );
  const undated = classified.filter(
    (item) => item.update.datePrecision === "undated",
  );

  const grouped = new Map<string, { label: string; sortValue: number; items: ClassifiedUpdate[] }>();

  for (const item of dated) {
    const week = weekOf(item.update.publishedOn);
    const existing = grouped.get(week.key);

    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(week.key, {
        label: week.label,
        sortValue: week.sortValue,
        items: [item],
      });
    }
  }

  const weeks: IntelligenceWeek[] = [...grouped.entries()]
    .sort((left, right) => right[1].sortValue - left[1].sortValue)
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: group.items.length,
      items: sortByAttentionThenDate(group.items),
    }));

  const topicCounts = INTELLIGENCE_TOPIC_ORDER.map((topic) => ({
    topic,
    label: INTELLIGENCE_TOPIC_META[topic].label,
    count: INDUSTRY_UPDATES.filter((update) => update.topic === topic).length,
  }));

  const headline =
    goal.track === null
      ? `${classified.length} sourced entries, all set to just monitor it, because nothing in your workspace names a direction yet. Finish the assessment or save a career choice and each entry is re-classified against it.`
      : `${counts["learn-now"]} of these ${classified.length} entries are marked learn now because they are about ${goal.label} or a skill your assessment scored below ${LEARN_NOW_PERCENT_CEILING} percent. ${counts["learn-later"]} are adjacent to it and ${counts.monitor} are worth knowing about only.`;

  return {
    readOn: INTELLIGENCE_SNAPSHOT.readOn,
    totalEntries: classified.length,
    entries: classified,
    counts,
    topicCounts,
    weeks,
    undated,
    goal,
    hasAssessment: summary !== null,
    weakSkills,
    headline,
    testedTracks,
  };
}
