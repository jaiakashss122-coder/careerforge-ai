import { listAssessmentRecords } from "@/lib/assessment/repository";
import {
  getCareerPreferenceRecord,
  listCareerExperimentRecords,
} from "@/lib/career/repository";
import {
  listInterviewAttemptRecords,
  listJobApplicationRecords,
  listMockInterviewRecords,
} from "@/lib/interview/repository";
import { listMaterialDraftRecords } from "@/lib/materials/repository";
import { listSkillEvidenceRecords } from "@/lib/evidence/repository";
import { listProjectRecords } from "@/lib/projects/repository";
import { listRoadmapRecords } from "@/lib/roadmap/repository";
import { listSessionRecords } from "@/lib/sessions/repository";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

export async function loadServerWorkspace({
  includeAssessmentAnswers = false,
}: {
  includeAssessmentAnswers?: boolean;
} = {}): Promise<WorkspaceSnapshot> {
  const [
    assessments,
    roadmaps,
    sessions,
    projects,
    evidence,
    careerExperiments,
    careerPreference,
    mockInterviews,
    interviewAttempts,
    jobApplications,
    materials,
  ] = await Promise.all([
    listAssessmentRecords({ includeAnswers: includeAssessmentAnswers }),
    listRoadmapRecords(),
    listSessionRecords(500),
    listProjectRecords(),
    listSkillEvidenceRecords(),
    listCareerExperimentRecords(),
    getCareerPreferenceRecord(),
    listMockInterviewRecords(),
    listInterviewAttemptRecords(),
    listJobApplicationRecords(),
    listMaterialDraftRecords(),
  ]);

  return {
    assessments,
    roadmaps,
    sessions,
    projects,
    evidence,
    careerExperiments,
    careerPreferences: careerPreference ? [careerPreference] : [],
    mockInterviews,
    interviewAttempts,
    jobApplications,
    materials,
  };
}
