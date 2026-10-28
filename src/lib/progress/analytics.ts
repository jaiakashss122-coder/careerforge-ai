import {
  ASSESSMENT_DISCLAIMER,
  type AssessmentRecord,
  type DemonstratedLevel,
  type SkillResult,
  type StoredAnswer,
} from "@/lib/assessment/types";
import {
  EVIDENCE_SOURCE_LABELS,
  type EvidenceSourceType,
  type SkillEvidenceRecord,
} from "@/lib/evidence/types";
import { getProjectTemplate } from "@/lib/projects/templates";
import {
  PROJECT_EVIDENCE_DISCLAIMER,
  PROJECT_RUBRIC_DISCLAIMER,
} from "@/lib/projects/types";
import {
  SKILLS,
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  getSkill,
  type SkillCategory,
} from "@/lib/skills/catalog";
import type { LearningRoadmap, RoadmapTask } from "@/lib/roadmap/types";
import {
  WEEK_MS,
  getActiveRoadmap,
  getCalendarWeekRange,
  getCurrentPlanWeek,
  getLatestAssessment,
  getRoadmapOverallPercent,
  getTaskLockState,
} from "@/lib/workspace/progress";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import type {
  CategoryProficiency,
  EvidenceLaneSummary,
  LearningActivity,
  NextAction,
  ProgressAnalytics,
  RepeatedMistake,
  RevisionBacklogItem,
  RoadmapProgressSummary,
  SkillProficiency,
  StudyTimeSummary,
  WeeklyConsistency,
} from "./types";

const LEVEL_DESCRIPTION: Record<DemonstratedLevel, string> = {
  none: "neither the core question nor its follow-up was right",
  foundational:
    "the core question was missed, but the easier check underneath it was right",
  beginner: "the core question was right and only part of the follow-up was",
  basic: "the core question was right, but the application question was missed",
  intermediate:
    "both the core question and the application question were right",
};

const LANE_NOTES: Record<EvidenceSourceType, string> = {
  assessment:
    "Scored answers from the adaptive knowledge screen. Shows what you can do today, not mastery.",
  lesson:
    "Recorded when a lesson is completed. Lessons are not part of this build yet.",
  quiz: "Recorded after a quiz attempt. Standalone quizzes are not part of this build yet.",
  project:
    "Recorded only when every milestone is submitted and a repository is linked. Self-submitted and unverified.",
  interview:
    "Written only when a practice interview is finished and every question is rated, one record per skill you marked “I answered it”. You rated it yourself — no person outside this app checked it.",
  self_report:
    "What you told us you believe. Never merged into a demonstrated score.",
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function isGradedAnswer(answer: StoredAnswer) {
  return (
    answer.isCorrect !== null &&
    answer.questionType !== "self_report" &&
    answer.questionType !== "preference"
  );
}

type ConceptStat = {
  questionCount: number;
  missCount: number;
  missedInAttempts: number;
  firstMissedAt: string | null;
  lastMissedAt: string | null;
};

function revisionReason(skill: SkillResult) {
  if (skill.level === "none") {
    return `No demonstrated evidence for ${skill.skillName} yet — ${LEVEL_DESCRIPTION[skill.level]}.`;
  }

  return `Scored ${skill.percent}% on ${skill.skillName}: ${LEVEL_DESCRIPTION[skill.level]}.`;
}

function collectSignals(workspace: WorkspaceSnapshot) {
  const practiceBySkill = new Map<string, number>();
  const activeRoadmap = getActiveRoadmap(workspace.roadmaps);

  for (const task of activeRoadmap?.tasks ?? []) {
    if (task.status !== "completed" || !task.skillSlug) continue;
    practiceBySkill.set(
      task.skillSlug,
      (practiceBySkill.get(task.skillSlug) ?? 0) + 1,
    );
  }

  const projectsBySkill = new Map<string, number>();

  for (const project of workspace.projects) {
    if (project.status !== "completed") continue;

    for (const slug of getProjectTemplate(project.templateSlug)?.skillSlugs ??
      []) {
      projectsBySkill.set(slug, (projectsBySkill.get(slug) ?? 0) + 1);
    }
  }

  const evidenceBySkill = new Map<string, SkillEvidenceRecord[]>();

  for (const entry of workspace.evidence) {
    const list = evidenceBySkill.get(entry.skillSlug) ?? [];
    list.push(entry);
    evidenceBySkill.set(entry.skillSlug, list);
  }

  return { activeRoadmap, practiceBySkill, projectsBySkill, evidenceBySkill };
}

function buildSkillProficiency(
  skill: SkillResult,
  signals: ReturnType<typeof collectSignals>,
): SkillProficiency {
  const evidence = signals.evidenceBySkill.get(skill.skillSlug) ?? [];
  const evidenceSources = Array.from(
    new Set(evidence.map((entry) => entry.sourceType)),
  );
  const completedPracticeTasks =
    signals.practiceBySkill.get(skill.skillSlug) ?? 0;
  const completedProjects = signals.projectsBySkill.get(skill.skillSlug) ?? 0;

  const parts = [
    `Demonstrated: ${skill.percent}% on your latest screen — ${LEVEL_DESCRIPTION[skill.level]}.`,
  ];

  if (completedPracticeTasks > 0) {
    parts.push(
      `Practice: ${completedPracticeTasks} roadmap ${
        completedPracticeTasks === 1 ? "task" : "tasks"
      } covering this skill finished.`,
    );
  }

  if (completedProjects > 0) {
    parts.push(
      `Project evidence: used in ${completedProjects} completed ${
        completedProjects === 1 ? "project" : "projects"
      } (self-submitted, unverified).`,
    );
  }

  if (skill.confidenceMismatch === "overconfident") {
    parts.push(
      `You rated confidence ${skill.confidence}/5 while the screen scored ${skill.percent}% — the gap, not the score, is the useful signal here.`,
    );
  } else if (skill.confidenceMismatch === "underconfident") {
    parts.push(
      `You rated confidence ${skill.confidence}/5 while the screen scored ${skill.percent}% — you are doing better than you think.`,
    );
  } else {
    parts.push(
      `Self-reported confidence ${skill.confidence}/5, kept separate from the score above.`,
    );
  }

  return {
    skillSlug: skill.skillSlug,
    skillName: skill.skillName,
    demonstratedLevel: skill.level,
    demonstratedPercent: skill.percent,
    evidenceSources,
    confidence: skill.confidence,
    confidenceMismatch: skill.confidenceMismatch,
    completedPracticeTasks,
    completedProjects,
    explanation: parts.join(" "),
  };
}

function buildCategories(
  assessment: AssessmentRecord | null,
  signals: ReturnType<typeof collectSignals>,
): CategoryProficiency[] {
  const skills =
    assessment?.summary.sections.flatMap((section) => section.skills) ?? [];

  const proficiencyByCategory = new Map<SkillCategory, SkillProficiency[]>();

  for (const skill of skills) {
    const category = getSkill(skill.skillSlug)?.category;

    if (!category) continue;

    const list = proficiencyByCategory.get(category) ?? [];
    list.push(buildSkillProficiency(skill, signals));
    proficiencyByCategory.set(category, list);
  }

  return SKILL_CATEGORY_ORDER.map((category) => {
    const entries = (proficiencyByCategory.get(category) ?? []).sort(
      (a, b) => (b.demonstratedPercent ?? 0) - (a.demonstratedPercent ?? 0),
    );

    const scored = entries.filter(
      (entry) => entry.demonstratedPercent !== null,
    );
    const summaryPercent =
      scored.length > 0
        ? Math.round(
            scored.reduce(
              (sum, entry) => sum + (entry.demonstratedPercent ?? 0),
              0,
            ) / scored.length,
          )
        : null;

    const catalogueCount = SKILLS.filter(
      (skill) => skill.category === category,
    ).length;

    return {
      category,
      label: SKILL_CATEGORY_LABELS[category],
      summaryPercent,
      skills: entries,
      explanation:
        summaryPercent === null
          ? `No scored questions from this category appeared in your assessments, so there is nothing to report here yet (${catalogueCount} skills are tracked in this category).`
          : `Averaged across ${scored.length} scored ${
              scored.length === 1 ? "skill" : "skills"
            } from your latest assessment. This is a knowledge screen, not proof of mastery.`,
      strongestSkill: entries[0] ?? null,
      weakestSkill: entries.length > 1 ? entries[entries.length - 1] : null,
    };
  });
}

function buildLearningActivity(
  workspace: WorkspaceSnapshot,
  assessment: AssessmentRecord | null,
): LearningActivity {
  const tasks = getActiveRoadmap(workspace.roadmaps)?.tasks ?? [];

  const countCompleted = (categories: RoadmapTask["category"][]) =>
    tasks.filter(
      (task) =>
        task.status === "completed" && categories.includes(task.category),
    ).length;

  const gradedByAttempt = workspace.assessments.map((record) => ({
    completedAt: record.completedAt,
    answers: record.answers.filter(isGradedAnswer),
  }));
  const graded = gradedByAttempt.flatMap((attempt) => attempt.answers);
  const correct = graded.filter((answer) => answer.isCorrect === true).length;

  const conceptStats = new Map<string, ConceptStat>();

  for (const attempt of gradedByAttempt) {
    const missedThisAttempt = new Set<string>();

    for (const answer of attempt.answers) {
      const concept = answer.concept?.trim();

      if (!concept) continue;

      const stat = conceptStats.get(concept) ?? {
        questionCount: 0,
        missCount: 0,
        missedInAttempts: 0,
        firstMissedAt: null,
        lastMissedAt: null,
      };
      stat.questionCount += 1;

      if (answer.isCorrect === false) {
        stat.missCount += 1;
        stat.firstMissedAt = stat.firstMissedAt ?? attempt.completedAt;
        stat.lastMissedAt = attempt.completedAt;
        missedThisAttempt.add(concept);
      }

      conceptStats.set(concept, stat);
    }

    for (const concept of missedThisAttempt) {
      const stat = conceptStats.get(concept);

      if (stat) stat.missedInAttempts += 1;
    }
  }

  const repeatedMistakes: RepeatedMistake[] = [];

  for (const [concept, stat] of conceptStats) {
    if (
      stat.missedInAttempts < 2 ||
      !stat.firstMissedAt ||
      !stat.lastMissedAt
    ) {
      continue;
    }

    repeatedMistakes.push({
      concept,
      missCount: stat.missCount,
      missedInAttempts: stat.missedInAttempts,
      questionCount: stat.questionCount,
      firstMissedAt: stat.firstMissedAt,
      lastMissedAt: stat.lastMissedAt,
      explanation: `You missed "${concept}" in ${stat.missedInAttempts} separate attempts (${
        stat.missCount
      } wrong ${
        stat.missCount === 1 ? "answer" : "answers"
      } out of ${stat.questionCount} questions on it). A concept that slips twice in different attempts is a content gap, not a careless error.`,
    });
  }

  repeatedMistakes.sort(
    (a, b) =>
      b.missedInAttempts - a.missedInAttempts || b.missCount - a.missCount,
  );

  const backlogByLesson = new Map<string, RevisionBacklogItem>();

  for (const skill of assessment?.summary.sections.flatMap(
    (section) => section.skills,
  ) ?? []) {
    if (skill.level === "intermediate") continue;

    const remedial = skill.remedial;

    if (remedial && !backlogByLesson.has(remedial.slug)) {
      backlogByLesson.set(remedial.slug, {
        skillSlug: skill.skillSlug,
        remedialSlug: remedial.slug,
        title: remedial.title,
        reason: revisionReason(skill),
        href: "/roadmap",
      });
    }

    if (!remedial) {
      for (const missed of skill.missedConcepts) {
        const lessonKey = `concept:${missed}`;

        if (!backlogByLesson.has(lessonKey)) {
          backlogByLesson.set(lessonKey, {
            skillSlug: skill.skillSlug,
            remedialSlug: null,
            title: missed,
            reason: `Missed inside ${skill.skillName}, which otherwise looks solid.`,
            href: "/tutor",
          });
        }
      }
    }
  }

  return {
    learningTasksCompleted: countCompleted(["learning"]),
    practiceTasksCompleted: countCompleted(["practice"]),
    projectTasksCompleted: countCompleted(["project", "experiment"]),
    assessmentAttempts: workspace.assessments.length,
    questionAccuracy: {
      correct,
      total: graded.length,
      percent: roundPercent(correct, graded.length),
    },
    explanation:
      graded.length === 0
        ? "No graded questions recorded yet, so there is no accuracy figure to show."
        : `Accuracy is ${correct} of ${graded.length} graded ${
            graded.length === 1 ? "question" : "questions"
          } answered across every assessment on this account. Self-reports and career questions are excluded because they have no right answer.`,
    repeatedMistakes,
    revisionBacklog: Array.from(backlogByLesson.values()),
  };
}

function buildEvidenceLanes(
  workspace: WorkspaceSnapshot,
): EvidenceLaneSummary[] {
  const bySource = new Map<EvidenceSourceType, SkillEvidenceRecord[]>();

  for (const entry of workspace.evidence) {
    const list = bySource.get(entry.sourceType) ?? [];
    list.push(entry);
    bySource.set(entry.sourceType, list);
  }

  return (
    [
      "assessment",
      "lesson",
      "quiz",
      "project",
      "interview",
      "self_report",
    ] as EvidenceSourceType[]
  ).map((sourceType) => {
    const entries = bySource.get(sourceType) ?? [];
    const skillSlugs = new Set(entries.map((entry) => entry.skillSlug));

    return {
      sourceType,
      label: EVIDENCE_SOURCE_LABELS[sourceType],
      count: entries.length,
      skillCount: skillSlugs.size,
      verifiedCount: entries.filter((entry) => entry.verified).length,
      note: LANE_NOTES[sourceType],
    };
  });
}

function buildStudyTime(
  workspace: WorkspaceSnapshot,
  now: Date,
): StudyTimeSummary {
  const completed = workspace.sessions.filter(
    (session) => session.status === "completed",
  );
  const totalRecordedMinutes = completed.reduce(
    (sum, session) => sum + (session.actualMinutes ?? 0),
    0,
  );

  const { weekStart, weekEnd } = getCalendarWeekRange(now);
  const weekSessions = completed.filter((session) => {
    const startedAt = parseDate(session.startedAt);
    return (
      startedAt !== null &&
      startedAt.getTime() >= weekStart.getTime() &&
      startedAt.getTime() < weekEnd.getTime()
    );
  });

  const weekRecordedMinutes = weekSessions.reduce(
    (sum, session) => sum + (session.actualMinutes ?? 0),
    0,
  );
  const startedCount = workspace.sessions.length;
  const activeCount = workspace.sessions.filter(
    (session) => session.status === "active",
  ).length;
  const abandonedCount = workspace.sessions.filter(
    (session) => session.status === "abandoned",
  ).length;

  return {
    totalRecordedMinutes,
    weekRecordedMinutes,
    completedSessionCount: completed.length,
    startedSessionCount: startedCount,
    abandonedSessionCount: abandonedCount,
    explanation:
      buildStudyTimeExplanation(
        completed.length,
        totalRecordedMinutes,
        weekRecordedMinutes,
        activeCount,
        abandonedCount,
      ) ??
      `Every figure here comes from sessions you started in this app; nothing is estimated.${noSessionNote(completed.length)}`,
  };
}

function noSessionNote(completedCount: number) {
  return completedCount === 0
    ? " No session has been completed yet, so nothing is counted."
    : "";
}

function buildStudyTimeExplanation(
  completedCount: number,
  totalRecordedMinutes: number,
  weekRecordedMinutes: number,
  activeCount: number,
  abandonedCount: number,
) {
  if (completedCount === 0 && activeCount === 0 && abandonedCount === 0) {
    return null;
  }

  const parts = [
    `Every figure here comes from sessions you started in this app; nothing is estimated. ${totalRecordedMinutes} minutes are recorded across ${
      completedCount
    } completed ${completedCount === 1 ? "session" : "sessions"}.`,
  ];

  if (completedCount > 0) {
    parts.push(`${weekRecordedMinutes} of those fall in this calendar week.`);
  }

  if (activeCount > 0) {
    parts.push(
      `${
        activeCount === 1
          ? "One session is still running, so its time is not counted until you finish it."
          : `${activeCount} sessions are still running, so their time is not counted until you finish them.`
      }`,
    );
  }

  if (abandonedCount > 0) {
    parts.push(
      abandonedCount === 1
        ? "One session you started but abandoned is listed here and credited with zero minutes."
        : `${abandonedCount} sessions you started but abandoned are listed here and credited with zero minutes.`,
    );
  }

  return parts.join(" ");
}

function buildConsistency(
  workspace: WorkspaceSnapshot,
  activeRoadmap: LearningRoadmap | null,
  now: Date,
): WeeklyConsistency {
  const startedDates = workspace.sessions
    .filter((session) => session.status === "completed")
    .map((session) => parseDate(session.startedAt))
    .filter((value): value is Date => value !== null);

  const weekIndexOf = (value: Date) => {
    if (activeRoadmap) {
      const origin = parseDate(activeRoadmap.startDate) ?? value;
      return Math.floor((value.getTime() - origin.getTime()) / WEEK_MS) + 1;
    }

    const anchored = getCalendarWeekRange(value).weekStart;
    const earliest = startedDates.reduce<Date | null>(
      (min, entry) =>
        min === null || entry.getTime() < min.getTime() ? entry : min,
      null,
    );
    const origin = getCalendarWeekRange(earliest ?? now).weekStart;
    return Math.floor((anchored.getTime() - origin.getTime()) / WEEK_MS) + 1;
  };

  const weeksElapsed = activeRoadmap
    ? Math.max(1, getCurrentPlanWeek(activeRoadmap, now))
    : Math.max(1, weekIndexOf(now));

  const activeWeekNumbers = new Set<number>();

  for (const startedAt of startedDates) {
    const week = weekIndexOf(startedAt);

    if (week >= 1 && week <= weeksElapsed) {
      activeWeekNumbers.add(week);
    }
  }

  const sorted = Array.from(activeWeekNumbers).sort((a, b) => a - b);
  let consecutiveActiveWeeks = 0;

  for (let week = weeksElapsed; week >= 1; week -= 1) {
    if (activeWeekNumbers.has(week)) {
      consecutiveActiveWeeks += 1;
    } else if (week !== weeksElapsed) {
      break;
    }
  }

  return {
    weeksElapsed,
    weeksBasis: activeRoadmap ? "plan" : "calendar",
    activeWeeks: sorted.length,
    consecutiveActiveWeeks,
    activeWeekNumbers: sorted,
    note: buildConsistencyNote(
      activeRoadmap,
      weeksElapsed,
      sorted.length,
      consecutiveActiveWeeks,
    ),
  };
}

function buildConsistencyNote(
  activeRoadmap: LearningRoadmap | null,
  weeksElapsed: number,
  activeWeeks: number,
  consecutiveActiveWeeks: number,
) {
  const label = activeRoadmap ? "roadmap week" : "calendar week";

  if (!activeRoadmap) {
    return activeWeeks === 0
      ? "There is no active roadmap and no completed session yet, so nothing is counted here. The one week shown is the calendar week you are in now."
      : `There is no active roadmap, so weeks here run from your earliest recorded session to today. Study was recorded in ${activeWeeks} of ${weeksElapsed}.`;
  }

  if (activeWeeks === 0) {
    return `You are in ${label} ${weeksElapsed} and have not recorded a completed session yet. That is a starting line, not a streak to lose.`;
  }

  return `You recorded study in ${activeWeeks} of ${weeksElapsed} elapsed ${label}${
    weeksElapsed === 1 ? "" : "s"
  }, with a ${consecutiveActiveWeeks}-week run ending now. Missing a week reflows the plan instead of resetting anything.`;
}

function buildRoadmapProgress(
  activeRoadmap: LearningRoadmap | null,
  now: Date,
): RoadmapProgressSummary {
  if (!activeRoadmap) {
    return {
      overallPercent: 0,
      completedTaskCount: 0,
      remainingTaskCount: 0,
      currentWeek: null,
      currentWeekTitle: null,
      explanation:
        "No active roadmap exists, so there is no plan progress to report.",
    };
  }

  const completedTaskCount = activeRoadmap.tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const remainingTaskCount = activeRoadmap.tasks.filter(
    (task) => task.status !== "completed" && task.status !== "skipped",
  ).length;
  const currentWeek = getCurrentPlanWeek(activeRoadmap, now);
  const weekMeta = activeRoadmap.summary.weeks.find(
    (week) => week.week === currentWeek,
  );

  const overallPercent = getRoadmapOverallPercent(activeRoadmap);

  return {
    overallPercent,
    completedTaskCount,
    remainingTaskCount,
    currentWeek,
    currentWeekTitle: weekMeta?.title ?? null,
    explanation: `${completedTaskCount} of ${activeRoadmap.tasks.length} planned ${
      activeRoadmap.tasks.length === 1 ? "task" : "tasks"
    } are complete, so the plan is ${overallPercent}% done with ${remainingTaskCount} still to do. Skipped tasks are excluded from both figures rather than counted as failures.`,
  };
}

function pickNextAction(
  workspace: WorkspaceSnapshot,
  activeRoadmap: LearningRoadmap | null,
  assessment: AssessmentRecord | null,
  backlog: RevisionBacklogItem[],
  now: Date,
): NextAction {
  if (!assessment) {
    return {
      kind: "assessment",
      title: "Take the skills assessment",
      why: "Nothing else can be scored honestly until there is a baseline. Every number on this page depends on demonstrated evidence, and there is none yet.",
      detail:
        "About 20 minutes. It adapts down when you are unsure, so a low starting point is not a penalty.",
      href: "/assessment",
      ctaLabel: "Start assessment",
      priority: 100,
    };
  }

  const activeSession = workspace.sessions.find(
    (session) => session.status === "active",
  );

  if (activeSession) {
    return {
      kind: "session",
      title: "Finish the session you are running",
      why: "Its time is not recorded until you close it, so the session is invisible to your progress stats right now.",
      detail: `Started at ${activeSession.startedAt.slice(0, 16).replace("T", " ")} UTC. Closing it records what you actually spent.`,
      href: "/dashboard",
      ctaLabel: "Open dashboard",
      priority: 95,
    };
  }

  if (!activeRoadmap) {
    return {
      kind: "roadmap_task",
      title: "Generate your learning roadmap",
      why: "Your assessment is recorded but there is no plan attached to it, so there is nothing to schedule or track.",
      detail:
        "The plan is built from your assessment gaps and your weekly hours.",
      href: "/roadmap",
      ctaLabel: "Build roadmap",
      priority: 90,
    };
  }

  const inProgress = activeRoadmap.tasks
    .filter((task) => task.status === "in_progress")
    .sort((a, b) => a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex);

  if (inProgress.length > 0) {
    const task = inProgress[0];

    return {
      kind: "roadmap_task",
      title: `Continue "${task.title}"`,
      why: `You already started this ${task.category} task in week ${task.weekNumber}. Leaving it half-done hides the progress you made.`,
      detail: task.description,
      href: `/dashboard?task=${task.id}`,
      ctaLabel: "Resume task",
      priority: 85,
    };
  }

  const currentWeek = getCurrentPlanWeek(activeRoadmap, now);
  const unlockedPending = activeRoadmap.tasks
    .filter(
      (task) =>
        task.status === "pending" &&
        !getTaskLockState(task, activeRoadmap).locked,
    )
    .sort(
      (a, b) =>
        Math.abs(a.weekNumber - currentWeek) -
          Math.abs(b.weekNumber - currentWeek) ||
        a.weekNumber - b.weekNumber ||
        a.orderIndex - b.orderIndex,
    );

  if (unlockedPending.length > 0) {
    const task = unlockedPending[0];
    const dependents = activeRoadmap.tasks.filter((entry) =>
      entry.prerequisiteIds.includes(task.id),
    );
    const gap = task.resources.assessmentGap;

    return {
      kind: "roadmap_task",
      title: `Do "${task.title}"`,
      why:
        task.weekNumber === currentWeek
          ? `It is scheduled for this week (week ${currentWeek}), it is unlocked, and ${
              dependents.length > 0
                ? `${dependents.length} later ${
                    dependents.length === 1 ? "task depends" : "tasks depend"
                  } on it`
                : "it is the earliest task still standing in your plan"
            }.`
          : `Nothing is unlocked in week ${currentWeek}, so this is the nearest ${
              task.weekNumber > currentWeek ? "upcoming" : "overdue"
            } task you can actually start.`,
      detail: gap
        ? `It targets the gap your assessment found: ${gap}. ${task.description}`
        : task.description,
      href: `/dashboard?task=${task.id}`,
      ctaLabel: "Open task",
      priority: 80,
    };
  }

  const weeklyProgressReached = activeRoadmap.tasks
    .filter((task) => task.weekNumber === currentWeek)
    .every((task) => task.status === "completed" || task.status === "skipped");

  if (weeklyProgressReached && backlog.length > 0) {
    const item = backlog[0];

    return {
      kind: "revision",
      title: `Revise ${item.title}`,
      why: `Every scheduled task in week ${currentWeek} is done, and this is the highest-priority gap left in your assessment results.`,
      detail: item.reason,
      href: item.href,
      ctaLabel: "Open revision",
      priority: 75,
    };
  }

  if (weeklyProgressReached) {
    const unlockedProject = workspace.projects.find(
      (project) => project.status === "in_progress",
    );

    if (unlockedProject) {
      return {
        kind: "project",
        title: `Keep building "${unlockedProject.title}"`,
        why: `Your plan's tasks for week ${currentWeek} are done and this project is already open. A milestone only counts as evidence once you link the work you produced for that step.`,
        detail: unlockedProject.problemStatement,
        href: "/projects",
        ctaLabel: "Open Project Lab",
        priority: 70,
      };
    }

    return {
      kind: "project",
      title: "Start a portfolio project",
      why: `Week ${currentWeek}'s tasks are complete and there is no open project. Evidence from submitted work is the strongest signal this app can show you.`,
      detail:
        "Project Lab locks advanced projects until their prerequisites have real evidence behind them.",
      href: "/projects",
      ctaLabel: "Open Project Lab",
      priority: 65,
    };
  }

  return {
    kind: "roadmap_task",
    title: "Review your roadmap",
    why: `Nothing in week ${currentWeek} is unlocked or pending, which usually means prerequisites need reopening or the plan needs rebalancing.`,
    detail: "You can reschedule a week without losing any completed work.",
    href: "/roadmap",
    ctaLabel: "Open roadmap",
    priority: 50,
  };
}

function buildProjectSummary(workspace: WorkspaceSnapshot) {
  const completed = workspace.projects.filter(
    (project) => project.status === "completed",
  );
  const evidenceCount = workspace.evidence.filter(
    (entry) => entry.sourceType === "project",
  ).length;

  return {
    startedCount: workspace.projects.length,
    completedCount: completed.length,
    evidenceCount,
    explanation:
      completed.length === 0
        ? `You have ${workspace.projects.length} ${
            workspace.projects.length === 1 ? "project" : "projects"
          } in progress and none finished. Completed work creates evidence only when every milestone is submitted and a repository is linked.`
        : `${completed.length} completed ${
            completed.length === 1 ? "project" : "projects"
          } contributed ${evidenceCount} unverified skill ${
            evidenceCount === 1 ? "link" : "links"
          }. These sit next to your assessment scores, never inside them.`,
  };
}

export function buildProgressAnalytics({
  workspace,
  now = new Date(),
}: {
  workspace: WorkspaceSnapshot;
  now?: Date;
}): ProgressAnalytics {
  const assessment = getLatestAssessment(workspace.assessments);
  const signals = collectSignals(workspace);
  const categories = buildCategories(assessment, signals);
  const learningActivity = buildLearningActivity(workspace, assessment);

  return {
    generatedAt: now.toISOString(),
    categories,
    learningActivity,
    evidenceLanes: buildEvidenceLanes(workspace),
    studyTime: buildStudyTime(workspace, now),
    consistency: buildConsistency(workspace, signals.activeRoadmap, now),
    roadmapProgress: buildRoadmapProgress(signals.activeRoadmap, now),
    projectSummary: buildProjectSummary(workspace),
    nextAction: pickNextAction(
      workspace,
      signals.activeRoadmap,
      assessment,
      learningActivity.revisionBacklog,
      now,
    ),
    disclaimers: [
      ASSESSMENT_DISCLAIMER,
      PROJECT_EVIDENCE_DISCLAIMER,
      PROJECT_RUBRIC_DISCLAIMER,
      "Confidence is what you reported about yourself. Demonstrated scores come from answered questions. This page never blends the two into one number.",
      `Skill names come from the ${SKILLS.length}-skill catalogue the app scores against.`,
    ],
  };
}
