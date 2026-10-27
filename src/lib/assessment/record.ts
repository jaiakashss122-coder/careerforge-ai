import type {
  AssessmentEvaluation,
  AssessmentRecord,
  AssessmentType,
} from "@/lib/assessment/types";
import { createId } from "@/lib/id";

export function createAssessmentRecord({
  id,
  type,
  evaluation,
  startedAt,
  completedAt,
}: {
  id?: string;
  type: AssessmentType;
  evaluation: AssessmentEvaluation;
  startedAt: string;
  completedAt: string;
}): AssessmentRecord {
  return {
    id: id ?? createId(),
    type,
    overallScore: evaluation.overallScore,
    maxScore: evaluation.maxScore,
    confidenceAverage: evaluation.confidenceAverage,
    summary: evaluation.summary,
    answers: evaluation.usedAnswers,
    startedAt,
    completedAt,
    createdAt: completedAt,
  };
}
