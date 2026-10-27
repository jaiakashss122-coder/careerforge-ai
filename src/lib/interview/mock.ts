import { getCareerTrack, type CareerTrackSlug } from "@/lib/career/tracks";
import { SKILLS, getSkillName } from "@/lib/skills/catalog";
import {
  INTERVIEW_QUESTIONS,
  getInterviewQuestion,
  listQuestionsForTrack,
} from "@/lib/interview/questions";
import {
  INTERVIEW_TOPIC_ORDER,
  type InterviewAttemptRecord,
  type InterviewQuestion,
  type InterviewTopic,
  type MockInterviewRecord,
} from "@/lib/interview/types";

const SKILL_SLUGS = new Set(SKILLS.map((skill) => skill.slug));

export const MOCK_INTERVIEW_MIN_QUESTIONS = 3;
export const MOCK_INTERVIEW_MAX_QUESTIONS = 12;

export type MockInterviewPlan = {
  label: string;
  topics: InterviewTopic[];
  questionIds: string[];
  /** Why each chosen question is here, quoting the record that put it there. */
  reasons: string[];
  /** Questions the plan could not fill, stated as a count with the cause. */
  shortfall: string | null;
};

function attemptsByQuestion(attempts: InterviewAttemptRecord[]) {
  const counts = new Map<string, number>();

  for (const attempt of attempts) {
    counts.set(attempt.questionId, (counts.get(attempt.questionId) ?? 0) + 1);
  }

  return counts;
}

/**
 * Chooses questions for one practice interview. The least-practised question in
 * each chosen area comes first, so repeating a plan is not a copy of the last
 * one, and nothing is chosen at random: every row can be traced to the area it
 * belongs to.
 */
export function chooseMockQuestions({
  topics,
  track,
  count = 6,
  attempts = [],
}: {
  topics: InterviewTopic[];
  track?: CareerTrackSlug | null;
  count?: number;
  attempts?: InterviewAttemptRecord[];
}): MockInterviewPlan {
  const wanted = Math.min(
    Math.max(count, MOCK_INTERVIEW_MIN_QUESTIONS),
    MOCK_INTERVIEW_MAX_QUESTIONS,
  );

  const chosenTopics = topics.length > 0 ? topics : [...INTERVIEW_TOPIC_ORDER];
  const practiced = attemptsByQuestion(attempts);
  const pool: InterviewQuestion[] = [];

  if (track) {
    pool.push(...listQuestionsForTrack(track));
  }

  for (const topic of chosenTopics) {
    pool.push(...INTERVIEW_QUESTIONS.filter((question) => question.topic === topic));
  }

  const seen = new Set<string>();
  const ordered = pool
    .filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    })
    .sort((left, right) => {
      const leftCount = practiced.get(left.id) ?? 0;
      const rightCount = practiced.get(right.id) ?? 0;

      if (leftCount !== rightCount) return leftCount - rightCount;

      return left.id.localeCompare(right.id);
    });

  const picked = ordered.slice(0, wanted);
  const shortfall =
    picked.length < wanted
      ? `Only ${picked.length} questions in this app's bank match what you selected, so the interview is ${picked.length} questions long instead of ${wanted}.`
      : null;

  const topicLabels = chosenTopics
    .map((topic) => topic.replace("-", " "))
    .join(", ");

  const reasons: string[] = [];
  if (track) {
    const name = getCareerTrack(track)?.name ?? track;
    const forTrack = picked.filter((question) => question.tracks?.includes(track));

    if (forTrack.length > 0) {
      reasons.push(
        `${forTrack.length} of the ${picked.length} questions are the ones this app lists for ${name}.`,
      );
    }
  }

  const leastPractised = picked.filter(
    (question) => (practiced.get(question.id) ?? 0) === 0,
  );

  if (attempts.length === 0) {
    reasons.push(
      `None of these ${picked.length} questions has an attempt on record yet, so this is the first pass through ${topicLabels}.`,
    );
  } else if (leastPractised.length > 0) {
    reasons.push(
      `${leastPractised.length} of the ${picked.length} questions have no attempt on record; the rest repeat ones you have answered, and the least-practised questions were placed first.`,
    );
  } else {
    reasons.push(
      `Every one of these ${picked.length} questions already has an attempt on record, so this pass repeats earlier practice in ${topicLabels}.`,
    );
  }

  const label = track
    ? `${getCareerTrack(track)?.name ?? track} practice over ${picked.length} questions`
    : `${chosenTopics.length} area${chosenTopics.length === 1 ? "" : "s"}, ${picked.length} questions`;

  return {
    label,
    topics: chosenTopics,
    questionIds: picked.map((question) => question.id),
    reasons,
    shortfall,
  };
}

export type InterviewOutcome = {
  total: number;
  answered: number;
  covered: number;
  partial: number;
  missed: number;
  /** Percent of the plan you rated as answered, with the count beside it. */
  coveredPercent: number;
  missingRatings: string[];
  ready: boolean;
  notReadyMessage: string | null;
};

/**
 * Reads a finished plan against the attempts actually recorded. Nothing is
 * counted for a question with no rating, so an abandoned interview cannot
 * quietly raise a score.
 */
export function summarizeInterview({
  questionIds,
  attempts,
}: {
  questionIds: string[];
  attempts: InterviewAttemptRecord[];
}): InterviewOutcome {
  const byQuestion = new Map<string, InterviewAttemptRecord>();

  for (const attempt of attempts) {
    if (!questionIds.includes(attempt.questionId)) continue;

    const existing = byQuestion.get(attempt.questionId);

    if (!existing || attempt.createdAt > existing.createdAt) {
      byQuestion.set(attempt.questionId, attempt);
    }
  }

  const recorded = [...byQuestion.values()];
  const covered = recorded.filter((a) => a.rating === "covered").length;
  const partial = recorded.filter((a) => a.rating === "partial").length;
  const missed = recorded.filter((a) => a.rating === "not-covered").length;
  const missingRatings = questionIds.filter((id) => !byQuestion.has(id));

  const ready = questionIds.length > 0 && missingRatings.length === 0;

  return {
    total: questionIds.length,
    answered: recorded.length,
    covered,
    partial,
    missed,
    coveredPercent:
      questionIds.length === 0
        ? 0
        : Math.round((covered / questionIds.length) * 100),
    missingRatings,
    ready,
    notReadyMessage: ready
      ? null
      : `${missingRatings.length} of the ${questionIds.length} questions in this interview have no rating yet. Rate them before finishing, because a question you skipped is not the same as a question you answered.`,
  };
}

export type InterviewEvidenceDraft = {
  skillSlug: string;
  skillName: string;
  notes: string;
};

/**
 * The only path from a practice interview to a skill record: one entry per
 * catalogue skill touched by a question the learner rated "I answered it", in a
 * completed interview. A partial or missed answer writes nothing, and every row
 * is marked unverified because the only reviewer is the person who answered.
 */
export function buildInterviewEvidence({
  interview,
  attempts,
  outcome,
}: {
  interview: MockInterviewRecord;
  attempts: InterviewAttemptRecord[];
  outcome: InterviewOutcome;
}): InterviewEvidenceDraft[] {
  if (!interview.completedAt) return [];
  if (!outcome.ready) return [];

  const drafts = new Map<string, InterviewEvidenceDraft>();

  for (const attempt of attempts) {
    if (!interview.questionIds.includes(attempt.questionId)) continue;
    if (attempt.rating !== "covered") continue;

    const question = getInterviewQuestion(attempt.questionId);
    if (!question) continue;

    const slugs = attempt.skills.length > 0 ? attempt.skills : question.skills;

    for (const slug of slugs) {
      if (!SKILL_SLUGS.has(slug)) continue;
      if (drafts.has(slug)) continue;

      const shown =
        question.prompt.length > 80
          ? `${question.prompt.slice(0, 80)}…`
          : question.prompt;

      drafts.set(slug, {
        skillSlug: slug,
        skillName: getSkillName(slug),
        notes: `In the practice interview “${interview.label}”, finished ${interview.completedAt.slice(0, 10)}, you rated “${shown}” as answered.`,
      });
    }
  }

  return [...drafts.values()];
}

export type PracticeMaterialRow = {
  skillSlug: string;
  skillName: string;
  questions: { id: string; prompt: string; topic: InterviewTopic }[];
  lastAttempt: InterviewAttemptRecord | null;
  advice: string;
};

/**
 * Builds the "what to work on before this interview" list out of records the
 * account already holds: a gap comes from an assessment score or an answer
 * rated as missed, never from a guess about the person.
 */
export function buildPracticeMaterials({
  skillPercents,
  attempts,
  limitSkills = 6,
}: {
  skillPercents: Map<string, number>;
  attempts: InterviewAttemptRecord[];
  limitSkills?: number;
}): PracticeMaterialRow[] {
  const gapSlugs = new Map<string, string>();

  for (const [slug, percent] of skillPercents) {
    if (percent < 40) gapSlugs.set(slug, `your assessment scored it ${percent} of 100`);
  }

  const latestByQuestion = new Map<string, InterviewAttemptRecord>();
  for (const attempt of attempts) {
    const existing = latestByQuestion.get(attempt.questionId);
    if (!existing || attempt.createdAt > existing.createdAt) {
      latestByQuestion.set(attempt.questionId, attempt);
    }
  }

  for (const attempt of latestByQuestion.values()) {
    if (attempt.rating !== "not-covered") continue;

    for (const slug of attempt.skills) {
      if (!SKILL_SLUGS.has(slug)) continue;
      if (gapSlugs.has(slug)) continue;

      gapSlugs.set(slug, "you rated a question that needs it as one you could not answer");
    }
  }

  const rows: PracticeMaterialRow[] = [];

  for (const [slug, cause] of gapSlugs) {
    const questions = INTERVIEW_QUESTIONS.filter((question) =>
      question.skills.includes(slug),
    )
      .slice(0, 4)
      .map((question) => ({
        id: question.id,
        prompt: question.prompt,
        topic: question.topic,
      }));

    const lastAttempt = [...latestByQuestion.values()].find(
      (attempt) =>
        attempt.skills.includes(slug) &&
        questions.some((question) => question.id === attempt.questionId),
    );

    if (questions.length === 0) continue;

    rows.push({
      skillSlug: slug,
      skillName: getSkillName(slug),
      questions,
      lastAttempt: lastAttempt ?? null,
      advice: `Worth a study block because ${cause}. This app has ${questions.length} question${questions.length === 1 ? "" : "s"} in its bank that need ${getSkillName(slug)}, listed below.`,
    });

    if (rows.length >= limitSkills) break;
  }

  return rows.sort((left, right) => left.skillName.localeCompare(right.skillName));
}

export const INTERVIEW_EVIDENCE_LABEL =
  "Interview evidence means one thing here: you said you answered a question in practice. No person outside this app checked it.";
