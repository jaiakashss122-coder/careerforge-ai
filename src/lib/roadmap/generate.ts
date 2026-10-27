import { getTrackExperimentBrief, getTrackSkills } from "@/lib/assessment/career-fit";
import type {
  AssessmentSummary,
  DemonstratedLevel,
} from "@/lib/assessment/types";
import {
  getCareerTrack,
  isCareerTrackSlug,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import { getSkillName } from "@/lib/skills/catalog";
import {
  WEEK_SEEDS,
  getWeekSeed,
  type TaskSeed,
  type WeekSeed,
} from "@/lib/roadmap/curriculum";
import {
  ROADMAP_DEFAULT_WEEKLY_HOURS,
  ROADMAP_TOTAL_WEEKS,
  type LearningRoadmap,
  type RoadmapLink,
  type RoadmapResources,
  type RoadmapSummary,
  type RoadmapTask,
  type RoadmapTaskFocus,
  type RoadmapWeekMeta,
} from "@/lib/roadmap/types";

const LEVEL_RANK: Record<DemonstratedLevel, number> = {
  none: 0,
  foundational: 1,
  beginner: 2,
  basic: 3,
  intermediate: 4,
};

const FOCUS_WEIGHT: Record<RoadmapTaskFocus, number> = {
  foundation: 1.2,
  standard: 1,
  refresh: 0.85,
};

const MIN_TASK_MINUTES = 15;
const GAP_LEVELS: readonly DemonstratedLevel[] = ["none", "foundational"];

const githubReadmeLink: RoadmapLink = {
  label: "GitHub README guidance",
  href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
  kind: "reference",
};

type SkillSnapshot = {
  level: DemonstratedLevel;
  percent: number;
};

export type GenerateRoadmapInput = {
  roadmapId: string;
  assessmentId: string;
  summary: AssessmentSummary;
  focusTracks: readonly CareerTrackSlug[];
  weeklyHours?: number;
  startDate?: string;
  now?: string;
  idFactory?: () => string;
};

type TaskDraft = {
  ref: string;
  week: number;
  orderIndex: number;
  seed: TaskSeed;
  focus: RoadmapTaskFocus;
  prerequisiteRefs: string[];
  estimatedMinutes: number;
};

function defaultIdFactory() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `roadmap-task-${Math.random().toString(36).slice(2)}`;
}

function normalizeFocusTracks(tracks: readonly CareerTrackSlug[]) {
  const unique = Array.from(new Set(tracks));

  if (unique.length !== 2 || !unique.every(isCareerTrackSlug)) {
    throw new Error("Choose exactly two different career tracks to test.");
  }

  return unique as [CareerTrackSlug, CareerTrackSlug];
}

function normalizeWeeklyHours(
  value: number | undefined,
  fallback: number,
) {
  const candidate = Number.isFinite(value) ? Math.round(value as number) : fallback;
  return Math.min(60, Math.max(1, candidate || ROADMAP_DEFAULT_WEEKLY_HOURS));
}

function dateOnly(value: string | undefined, now: Date) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = value ? new Date(value) : now;
  return Number.isNaN(parsed.getTime())
    ? now.toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function buildSkillSnapshots(summary: AssessmentSummary) {
  const snapshots = new Map<string, SkillSnapshot>();

  for (const section of summary.sections) {
    for (const skill of section.skills) {
      const current = snapshots.get(skill.skillSlug);
      if (!current || LEVEL_RANK[skill.level] > LEVEL_RANK[current.level]) {
        snapshots.set(skill.skillSlug, {
          level: skill.level,
          percent: skill.percent,
        });
      }
    }
  }

  return snapshots;
}

function uniqueSkillSlugs(skillSlugs: readonly string[]) {
  return Array.from(new Set(skillSlugs));
}

function getTaskFocus(
  skillSlugs: readonly string[],
  snapshots: Map<string, SkillSnapshot>,
): RoadmapTaskFocus {
  const slugs = uniqueSkillSlugs(skillSlugs);
  if (slugs.length === 0) return "standard";

  const assessed = slugs
    .map((slug) => snapshots.get(slug))
    .filter((snapshot): snapshot is SkillSnapshot => Boolean(snapshot));

  if (assessed.some((snapshot) => GAP_LEVELS.includes(snapshot.level))) {
    return "foundation";
  }

  if (
    assessed.length === slugs.length &&
    assessed.every((snapshot) => snapshot.level === "intermediate")
  ) {
    return "refresh";
  }

  return "standard";
}

function getTaskSkillSlug(
  skillSlugs: readonly string[],
  snapshots: Map<string, SkillSnapshot>,
) {
  const slugs = uniqueSkillSlugs(skillSlugs);
  const assessed = slugs
    .map((slug) => ({ slug, snapshot: snapshots.get(slug) }))
    .filter(
      (entry): entry is { slug: string; snapshot: SkillSnapshot } =>
        Boolean(entry.snapshot),
    )
    .sort(
      (a, b) =>
        LEVEL_RANK[a.snapshot.level] - LEVEL_RANK[b.snapshot.level],
    );

  return assessed[0]?.slug ?? slugs[0] ?? null;
}

function formatSkillNames(slugs: readonly string[]) {
  const names = slugs.map((slug) => getSkillName(slug));
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function formatSkillEvidence(
  slugs: readonly string[],
  snapshots: Map<string, SkillSnapshot>,
) {
  return slugs
    .map((slug) => {
      const snapshot = snapshots.get(slug);
      return `${getSkillName(slug)} (${snapshot ? `${snapshot.percent}%` : "not assessed"})`;
    })
    .join(", ");
}

function buildResources(
  seed: TaskSeed,
  focus: RoadmapTaskFocus,
  snapshots: Map<string, SkillSnapshot>,
): RoadmapResources {
  const slugs = uniqueSkillSlugs(seed.skillSlugs);
  const gapSkills = slugs.filter((slug) => {
    const snapshot = snapshots.get(slug);
    return snapshot ? GAP_LEVELS.includes(snapshot.level) : false;
  });
  const refreshSkills = slugs.filter(
    (slug) => snapshots.get(slug)?.level === "intermediate",
  );
  const applicationSkills = slugs.filter(
    (slug) => snapshots.get(slug)?.level === "basic",
  );

  const learn = [...seed.sessionPlan.learn];
  let exercise = seed.sessionPlan.exercise;
  let assessmentGap: string | undefined;

  if (focus === "foundation" && gapSkills.length > 0) {
    learn.unshift(
      `Foundation first: this screen did not demonstrate ${formatSkillNames(
        gapSkills,
      )}. Read the linked material, write down what is still unclear, and treat the exercise as practice rather than proof.`,
    );
    exercise = `${exercise} If the exercise assumes something you cannot yet do, complete a smaller version, record the gap, and do not mark it as mastered.`;
    assessmentGap = `Assessment gap: ${formatSkillEvidence(
      gapSkills,
      snapshots,
    )}. This task spends extra time on foundations. Finishing it is practice evidence, not verified mastery.`;
  } else if (focus === "refresh" && refreshSkills.length > 0) {
    learn.unshift(
      `Refresh and apply: you demonstrated ${formatSkillNames(
        refreshSkills,
      )} on the knowledge screen. Use this task to apply the skill; the screen alone is not a certification.`,
    );
    assessmentGap = `Demonstrated on the screen: ${formatSkillEvidence(
      refreshSkills,
      snapshots,
    )}. This is short-screen evidence, not a certification; confirm it with the exercise and later project work.`;
  } else if (applicationSkills.length > 0) {
    learn.unshift(
      `Application focus: you answered the core question for ${formatSkillNames(
        applicationSkills,
      )} but missed an application question. Do the exercise rather than only re-reading.`,
    );
    assessmentGap = `Application practice: ${formatSkillEvidence(
      applicationSkills,
      snapshots,
    )}. The core concept was demonstrated, so this task moves to application; it is still not mastery evidence.`;
  }

  return {
    sessionPlan: {
      learn,
      exercise,
      check: [...seed.sessionPlan.check],
      revision: seed.sessionPlan.revision,
    },
    links: [...seed.links],
    focus,
    assessmentGap,
  };
}

function getTrackLinks(trackSkills: readonly string[]) {
  const seen = new Set<string>();
  const links: RoadmapLink[] = [];

  for (const week of WEEK_SEEDS) {
    for (const task of week.tasks) {
      if (!task.skillSlugs.some((slug) => trackSkills.includes(slug))) {
        continue;
      }
      for (const link of task.links) {
        if (seen.has(link.href)) continue;
        seen.add(link.href);
        links.push(link);
      }
    }
  }

  return links.slice(0, 2);
}

function buildExperimentWeek(
  week: number,
  trackSlug: CareerTrackSlug,
  otherTrackSlug: CareerTrackSlug,
): WeekSeed {
  const track = getCareerTrack(trackSlug);
  const otherTrack = getCareerTrack(otherTrackSlug);

  if (!track || !otherTrack) {
    throw new Error("A selected career track is not available.");
  }

  const trackSkills = getTrackSkills(trackSlug).map((skill) => skill.slug);
  const skillNames = getTrackSkills(trackSlug)
    .map((skill) => skill.name)
    .join(", ");
  const brief = getTrackExperimentBrief(trackSlug);
  const links = getTrackLinks(trackSkills);

  return {
    week,
    title:
      week === 11
        ? `Career experiment: ${track.name}`
        : `Second experiment: ${track.name}`,
    summary:
      week === 11
        ? `Test ${track.name} with a small, time-boxed project. Week 12 tests ${otherTrack.name}; neither experiment commits you to a title.`
        : `Test ${track.name} with a small, time-boxed project. Week 13 compares both experiments before you choose a direction.`,
    tasks: [
      {
        key: "t1",
        title: `Run a small ${track.name} experiment`,
        description:
          week === 11
            ? `${brief} Keep the scope small enough to finish, or to record honestly what remains. This is a fit experiment, not a claim of mastery.`
            : `Test ${track.name} with a second short project. ${brief} Compare the work, not the imagined prestige of the title.`,
        category: "experiment",
        baseMinutes: 240,
        skillSlugs: trackSkills,
        sessionPlan: {
          learn: [
            "The goal is evidence about fit, not a finished portfolio piece.",
            `Relevant skills from your screen: ${skillNames}. Use what you have and record gaps instead of hiding them.`,
            `Experiment brief: ${brief}`,
          ],
          exercise: `${brief} Write down the scope, what you completed, what you skipped, and why.`,
          check: [
            {
              question: "What evidence does this experiment create?",
              answer:
                "A small artefact plus a written reflection about the work. It is evidence about fit and practice, not proof of job readiness.",
            },
            {
              question:
                "What should you record if you cannot finish part of the experiment?",
              answer:
                "The missing prerequisite and the remaining scope. Partial work is honest evidence; do not mark it complete.",
            },
          ],
          revision:
            "Reread your notes and separate what you actually built from what you only intended to build.",
        },
        links,
      },
      {
        key: "t2",
        title: `Document evidence from the ${track.name} experiment`,
        description:
          "Write a reproducible evidence note: what you built, how to run it, what happened, and what remains uncertain.",
        category: "review",
        baseMinutes: 120,
        skillSlugs: ["technical-communication"],
        sessionPlan: {
          learn: [
            "Evidence is reproducible: another person should be able to follow the steps and see the result.",
            "A limitation is part of the evidence, not an admission that the experiment failed.",
          ],
          exercise:
            "Create a README-style note with the question, setup steps, what you ran, observed output, one limitation, and the next step. Do not claim results you did not produce.",
          check: [
            {
              question:
                "What can you claim from a partially completed experiment?",
              answer:
                "Only what you actually ran and observed. Unfinished work belongs in the next steps, not in the results.",
            },
          ],
          revision:
            "Remove every sentence that is not supported by an output, a file, or a recorded reflection.",
        },
        links: [githubReadmeLink],
      },
      {
        key: "t3",
        title: `Reflect on fit for the ${track.name} direction`,
        description:
          "Compare interest, difficulty, enjoyment, and willingness to practise the hard parts of this direction.",
        category: "review",
        baseMinutes: 90,
        skillSlugs: ["technical-communication"],
        sessionPlan: {
          learn: [
            "Fit is more than enjoyment: interest, tolerance for difficulty, and willingness to practise are separate signals.",
            "One week is a probe, not a verdict. The week 13 checkpoint compares both experiments.",
          ],
          exercise:
            "Answer in writing: What did you build? What was difficult? What did you enjoy? What would you improve? Would you willingly spend 20 more hours on this, and on which part?",
          check: [
            {
              question:
                "Why compare willingness to improve as well as enjoyment?",
              answer:
                "Enjoyment without willingness to practise the hard parts is a weak signal for a long-term direction.",
            },
          ],
          revision:
            "Label each statement in your reflection as evidence, interpretation, or preference.",
        },
        links: [],
      },
    ],
  };
}

function allocateWeekMinutes(
  drafts: TaskDraft[],
  targetMinutes: number,
) {
  const totalWeight = drafts.reduce(
    (sum, draft) =>
      sum + draft.seed.baseMinutes * FOCUS_WEIGHT[draft.focus],
    0,
  );
  const effectiveTarget = Math.max(
    targetMinutes,
    drafts.length * MIN_TASK_MINUTES,
  );
  const allocations = drafts.map((draft) => {
    const weight = draft.seed.baseMinutes * FOCUS_WEIGHT[draft.focus];
    const raw =
      totalWeight > 0 ? (weight / totalWeight) * effectiveTarget : 0;
    return Math.max(
      MIN_TASK_MINUTES,
      Math.round(raw / 5) * 5,
    );
  });

  let remaining =
    effectiveTarget - allocations.reduce((sum, value) => sum + value, 0);
  let guard = 0;

  while (remaining !== 0 && guard < 1000) {
    const direction = remaining > 0 ? 1 : -1;
    const candidates = allocations
      .map((value, index) => ({ value, index }))
      .filter((entry) => direction > 0 || entry.value > MIN_TASK_MINUTES)
      .sort((a, b) =>
        direction > 0 ? b.value - a.value : a.value - b.value,
      );
    const candidate = candidates[0];
    if (!candidate) break;
    const step = direction * Math.min(5, Math.abs(remaining));
    allocations[candidate.index] += step;
    remaining -= step;
    guard += 1;
  }

  return allocations;
}

function getRelevantPrerequisiteRefs(
  drafts: TaskDraft[],
  trackSkills: readonly string[],
  beforeWeek: number,
) {
  return drafts
    .slice()
    .reverse()
    .filter(
      (draft) =>
        draft.week < beforeWeek &&
        draft.seed.skillSlugs.some((slug) => trackSkills.includes(slug)),
    )
    .slice(0, 2)
    .map((draft) => draft.ref);
}

function buildWeekPrerequisiteRefs({
  week,
  index,
  weekDrafts,
  previousWeekLastRef,
  draftRefs,
}: {
  week: number;
  index: number;
  weekDrafts: TaskDraft[];
  previousWeekLastRef: string | null;
  draftRefs: Map<string, TaskDraft>;
}) {
  const previousInWeek = weekDrafts[index - 1]?.ref;

  if (week === 13) {
    if (index === 0) {
      return previousWeekLastRef ? [previousWeekLastRef] : [];
    }
    if (index === 1) {
      return ["w11-t3", "w12-t3"].filter((ref) => draftRefs.has(ref));
    }
    if (index === 2) return ["w13-t1", "w13-t2"];
    return ["w13-t3"];
  }

  if (index === 0) {
    return previousWeekLastRef ? [previousWeekLastRef] : [];
  }

  return previousInWeek ? [previousInWeek] : [];
}

function buildConstraintNotes(
  summary: AssessmentSummary,
  weeklyHours: number,
) {
  const { environment, internet, timeline } = summary.constraints;
  const notes: string[] = [
    `Your plan budgets ${weeklyHours} hour${weeklyHours === 1 ? "" : "s"} per week (${weeklyHours * 60} minutes). Planned minutes are estimates, not recorded study time; only a started and completed session adds recorded time.`,
    "If a week is missed, unfinished tasks can be moved forward. Completed work is kept, and prerequisites stay locked until the earlier task is completed.",
  ];

  if (weeklyHours < 5) {
    notes.push(
      "With fewer than 5 hours per week, each week uses short tasks. Expect the 13-week calendar to be tight; a later checkpoint can adjust the pace rather than pretending the time was available.",
    );
  }

  if (environment.includes("install software")) {
    notes.push(
      "Your environment allows local installs, so setup tasks can use a local Python installation and editor.",
    );
  } else if (environment.includes("limited installs")) {
    notes.push(
      "Setup assumes limited installs: prefer portable tools and save work to a Git remote or export it before leaving the machine.",
    );
  } else if (environment.includes("browser-only")) {
    notes.push(
      "Local installs are not assumed. Use a browser-based Python environment when you have connectivity, keep written notes offline, and adapt setup steps rather than pretending they ran locally.",
    );
  } else if (environment.includes("Not sure")) {
    notes.push(
      "Your environment is not confirmed. Before week 1, check whether you can install Python and run a script. If not, follow the browser-only note.",
    );
  }

  if (internet.includes("Stable")) {
    notes.push(
      "Internet is stable; official documentation links and downloads are included where they help.",
    );
  } else if (internet.includes("Limited data")) {
    notes.push(
      "Internet is metered. Read and practise first, download documentation only when needed, and avoid unnecessary video streaming.",
    );
  } else if (internet.includes("intermittent")) {
    notes.push(
      "Internet is intermittent. Do reading and exercises offline, then run installation, downloads, and API tasks during a reliable window.",
    );
  } else if (internet.includes("offline")) {
    notes.push(
      "You are mostly offline. The plan includes reading and exercises that work offline; installs, downloads, and API experiments require a later connection and are not complete until you run them.",
    );
  }

  if (timeline.includes("3 months")) {
    notes.push(
      "You hope to apply within 3 months. A 13-week plan can build foundations and one tested direction, but it does not promise internship readiness. Use completed work as evidence, not the calendar.",
    );
  } else if (timeline.includes("3–6 months")) {
    notes.push(
      "Your timeline matches the 13-week plan. The week 13 checkpoint is a review point, not a guarantee of readiness.",
    );
  } else if (timeline.includes("6–12 months")) {
    notes.push(
      "Your timeline leaves room to repeat weak weeks. Use the retake and checkpoint to adjust rather than rushing through gaps.",
    );
  } else if (timeline.includes("No fixed deadline")) {
    notes.push(
      "No fixed deadline is set. Use weekly evidence and progress rather than an arbitrary finish line.",
    );
  }

  return notes;
}

function buildThirtyDayPlan(
  tasks: RoadmapTask[],
  weeks: RoadmapWeekMeta[],
) {
  const labels = ["Days 1–7", "Days 8–14", "Days 15–21", "Days 22–30"];

  return weeks.slice(0, 4).map((week, index) => ({
    week: week.week,
    title: week.title,
    delayLabel: labels[index] ?? `Week ${week.week}`,
    minutes: tasks
      .filter((task) => task.weekNumber === week.week)
      .reduce((sum, task) => sum + task.estimatedMinutes, 0),
  }));
}

export function generateRoadmap({
  roadmapId,
  assessmentId,
  summary,
  focusTracks,
  weeklyHours,
  startDate,
  now,
  idFactory,
}: GenerateRoadmapInput): LearningRoadmap {
  const [trackA, trackB] = normalizeFocusTracks(focusTracks);
  const hours = normalizeWeeklyHours(
    weeklyHours,
    summary.constraints.weeklyHours ?? ROADMAP_DEFAULT_WEEKLY_HOURS,
  );
  const generatedAt = now ?? new Date().toISOString();
  const parsedNow = new Date(generatedAt);
  const safeNow = Number.isNaN(parsedNow.getTime()) ? new Date() : parsedNow;
  const start = dateOnly(startDate, safeNow);
  const end = addDays(start, ROADMAP_TOTAL_WEEKS * 7 - 1);
  const makeId = idFactory ?? defaultIdFactory;
  const snapshots = buildSkillSnapshots(summary);

  const drafts: TaskDraft[] = [];
  const weeks: RoadmapWeekMeta[] = [];
  let previousWeekLastRef: string | null = null;

  for (let week = 1; week <= ROADMAP_TOTAL_WEEKS; week += 1) {
    let weekSeed: WeekSeed;

    if (week === 11) {
      weekSeed = buildExperimentWeek(week, trackA, trackB);
    } else if (week === 12) {
      weekSeed = buildExperimentWeek(week, trackB, trackA);
    } else {
      const seed = getWeekSeed(week);
      if (!seed) {
        throw new Error(`No curriculum is defined for week ${week}.`);
      }
      weekSeed = seed;
    }

    weeks.push({
      week,
      title: weekSeed.title,
      summary: weekSeed.summary,
    });

    const weekDrafts: TaskDraft[] = [];

    weekSeed.tasks.forEach((seed, index) => {
      const ref = `w${week}-${seed.key}`;
      const focus = getTaskFocus(seed.skillSlugs, snapshots);
      weekDrafts.push({
        ref,
        week,
        orderIndex: index,
        seed,
        focus,
        prerequisiteRefs: [],
        estimatedMinutes: 0,
      });
    });

    const draftRefs = new Map(drafts.map((draft) => [draft.ref, draft]));

    weekDrafts.forEach((draft, index) => {
      const baseRefs =
        week === 11 || week === 12
          ? index === 0
            ? getRelevantPrerequisiteRefs(
                drafts,
                draft.seed.skillSlugs,
                week,
              )
            : [weekDrafts[index - 1].ref]
          : buildWeekPrerequisiteRefs({
              week,
              index,
              weekDrafts,
              previousWeekLastRef,
              draftRefs,
            });

      if (index === 0 && previousWeekLastRef) {
        draft.prerequisiteRefs = Array.from(
          new Set([previousWeekLastRef, ...baseRefs]),
        );
      } else {
        draft.prerequisiteRefs = Array.from(new Set(baseRefs));
      }
    });

    const allocated = allocateWeekMinutes(weekDrafts, hours * 60);
    weekDrafts.forEach((draft, index) => {
      draft.estimatedMinutes = allocated[index];
    });

    drafts.push(...weekDrafts);
    previousWeekLastRef = weekDrafts[weekDrafts.length - 1]?.ref ?? previousWeekLastRef;
  }

  const idByRef = new Map(
    drafts.map((draft) => [draft.ref, makeId()] as const),
  );

  const tasks: RoadmapTask[] = drafts.map((draft) => {
    const id = idByRef.get(draft.ref);
    if (!id) {
      throw new Error(`Missing generated id for ${draft.ref}.`);
    }

    const prerequisiteIds = draft.prerequisiteRefs.map((ref) => {
      const prerequisiteId = idByRef.get(ref);
      if (!prerequisiteId) {
        throw new Error(`Missing prerequisite ${ref} for ${draft.ref}.`);
      }
      return prerequisiteId;
    });

    return {
      id,
      weekNumber: draft.week,
      orderIndex: draft.orderIndex,
      title: draft.seed.title,
      description: draft.seed.description,
      category: draft.seed.category,
      estimatedMinutes: draft.estimatedMinutes,
      status: "pending",
      skillSlug: getTaskSkillSlug(draft.seed.skillSlugs, snapshots),
      prerequisiteIds,
      resources: buildResources(draft.seed, draft.focus, snapshots),
      completedAt: null,
    };
  });

  const totalMinutes = tasks.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );
  const constraints = { ...summary.constraints, weeklyHours: hours };

  const roadmapSummary: RoadmapSummary = {
    version: 1,
    assessmentId,
    weeklyHours: hours,
    totalMinutes,
    totalWeeks: ROADMAP_TOTAL_WEEKS,
    overallPercent: 0,
    strengths: [...summary.strengths],
    gaps: [...summary.gaps],
    careerRecommendations: summary.careerRecommendations,
    constraints,
    constraintNotes: buildConstraintNotes(summary, hours),
    thirtyDayPlan: buildThirtyDayPlan(tasks, weeks),
    weeks,
    generatedAt,
    disclaimer:
      "This is a generated study plan based on a short knowledge screen and your stated availability. It is not a guarantee of readiness, and completing tasks does not automatically verify mastery. Prerequisites remain locked until the earlier task is completed.",
  };

  const trackAName = getCareerTrack(trackA)?.name ?? trackA;
  const trackBName = getCareerTrack(trackB)?.name ?? trackB;

  return {
    id: roadmapId,
    title: `${trackAName} + ${trackBName}: 13-week plan`,
    status: "active",
    startDate: start,
    endDate: end,
    focusTracks: [trackA, trackB],
    source: "assessment",
    summary: roadmapSummary,
    tasks,
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };
}
