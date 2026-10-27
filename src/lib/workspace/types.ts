import type { AssessmentRecord } from "@/lib/assessment/types";
import type {
  CareerExperimentRecord,
  CareerPreferenceRecord,
} from "@/lib/career/types";
import type { SkillEvidenceRecord } from "@/lib/evidence/types";
import type { ProjectRecord } from "@/lib/projects/types";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import type { LearningSessionRecord } from "@/lib/sessions/types";

export type WorkspaceSnapshot = {
  assessments: AssessmentRecord[];
  roadmaps: LearningRoadmap[];
  sessions: LearningSessionRecord[];
  projects: ProjectRecord[];
  evidence: SkillEvidenceRecord[];
  careerExperiments: CareerExperimentRecord[];
  careerPreferences: CareerPreferenceRecord[];
};

export function createEmptyWorkspace(): WorkspaceSnapshot {
  return {
    assessments: [],
    roadmaps: [],
    sessions: [],
    projects: [],
    evidence: [],
    careerExperiments: [],
    careerPreferences: [],
  };
}
