export const EVIDENCE_SOURCE_TYPES = [
  "assessment",
  "lesson",
  "quiz",
  "project",
  "interview",
  "self_report",
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

export const EVIDENCE_LEVELS = [
  "exposure",
  "guided_practice",
  "independent_practice",
  "project_evidence",
  "interview_evidence",
] as const;

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  exposure: "Exposure",
  guided_practice: "Guided practice",
  independent_practice: "Independent practice",
  project_evidence: "Project evidence",
  interview_evidence: "Interview evidence",
};

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSourceType, string> = {
  assessment: "Assessment",
  lesson: "Lesson",
  quiz: "Quiz",
  project: "Project",
  interview: "Interview",
  self_report: "Self-report",
};

export const EVIDENCE_LEVEL_RANK: Record<EvidenceLevel, number> = {
  exposure: 1,
  guided_practice: 2,
  independent_practice: 3,
  project_evidence: 4,
  interview_evidence: 5,
};

export type SkillEvidenceRecord = {
  id: string;
  skillSlug: string;
  sourceType: EvidenceSourceType;
  sourceId: string | null;
  evidenceLevel: EvidenceLevel;
  score: number | null;
  verified: boolean;
  notes: string;
  createdAt: string;
};

export function isEvidenceSourceType(value: string): value is EvidenceSourceType {
  return EVIDENCE_SOURCE_TYPES.includes(value as EvidenceSourceType);
}

export function isEvidenceLevel(value: string): value is EvidenceLevel {
  return EVIDENCE_LEVELS.includes(value as EvidenceLevel);
}
