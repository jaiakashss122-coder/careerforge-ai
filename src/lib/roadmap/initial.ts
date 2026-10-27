import type { AssessmentSummary } from "@/lib/assessment/types";
import {
  CAREER_TRACKS,
  isCareerTrackSlug,
  type CareerTrackSlug,
} from "@/lib/career/tracks";
import { createId } from "@/lib/id";
import { generateRoadmap } from "@/lib/roadmap/generate";
import type { LearningRoadmap } from "@/lib/roadmap/types";

export function getInitialFocusTracks(
  summary: AssessmentSummary,
): [CareerTrackSlug, CareerTrackSlug] {
  const ranked = summary.careerRecommendations
    .slice()
    .sort((a, b) => b.fitScore - a.fitScore)
    .map((recommendation) => recommendation.slug)
    .filter(isCareerTrackSlug);

  const picks: CareerTrackSlug[] = [];
  for (const slug of ranked) {
    if (!picks.includes(slug)) picks.push(slug);
    if (picks.length === 2) return [picks[0], picks[1]];
  }

  for (const track of CAREER_TRACKS) {
    if (!picks.includes(track.slug)) picks.push(track.slug);
    if (picks.length === 2) return [picks[0], picks[1]];
  }

  throw new Error("Two career tracks are required to build a roadmap.");
}

export function createInitialRoadmap({
  assessmentId,
  summary,
  weeklyHours,
  startDate,
  now,
}: {
  assessmentId: string;
  summary: AssessmentSummary;
  weeklyHours?: number;
  startDate?: string;
  now?: string;
}): LearningRoadmap {
  const generatedAt = now ?? new Date().toISOString();

  return generateRoadmap({
    roadmapId: createId(),
    assessmentId,
    summary,
    focusTracks: getInitialFocusTracks(summary),
    weeklyHours,
    startDate,
    now: generatedAt,
    idFactory: createId,
  });
}
