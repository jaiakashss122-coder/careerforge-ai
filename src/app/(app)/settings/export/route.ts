import {
  listSavedPrompts,
  listTutorConversationRecords,
} from "@/lib/ai/repository";
import { listAssessmentRecords } from "@/lib/assessment/repository";
import {
  getCareerPreferenceRecord,
  listCareerExperimentRecords,
} from "@/lib/career/repository";
import { getViewer } from "@/lib/auth/viewer";
import { listSkillEvidenceRecords } from "@/lib/evidence/repository";
import {
  listInterviewAttemptRecords,
  listJobApplicationRecords,
  listMockInterviewRecords,
} from "@/lib/interview/repository";
import { listMaterialDraftRecords } from "@/lib/materials/repository";
import { getCurrentProfile } from "@/lib/profile/repository";
import { listProjectRecords } from "@/lib/projects/repository";
import { listRoadmapRecords } from "@/lib/roadmap/repository";
import { listSessionRecords } from "@/lib/sessions/repository";

export async function GET() {
  const viewer = await getViewer();

  if (viewer.mode !== "supabase" || !viewer.user) {
    return Response.json(
      {
        error:
          "Exports require a signed-in Supabase account. In preview mode, use the local data export in Settings.",
      },
      { status: 401 },
    );
  }

  const [
    profile,
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
    prompts,
    conversations,
    materials,
  ] = await Promise.all([
    getCurrentProfile(),
    listAssessmentRecords({ includeAnswers: true }),
    listRoadmapRecords(),
    listSessionRecords(500),
    listProjectRecords(),
    listSkillEvidenceRecords(),
    listCareerExperimentRecords(),
    getCareerPreferenceRecord(),
    listMockInterviewRecords(),
    listInterviewAttemptRecords(),
    listJobApplicationRecords(),
    listSavedPrompts(),
    listTutorConversationRecords(),
    listMaterialDraftRecords(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    source: "supabase",
    account: { email: viewer.user.email ?? "" },
    note:
      "This export contains the profile, assessment responses, generated roadmaps, study sessions, projects with their milestones and links, skill evidence records, career experiments with their reflections, your recorded specialization choice with the reason you wrote, practice interviews with every written answer and rating, saved roles including the posting text you pasted, the wording you saved for each application document together with the record of what your data looked like when you saved it, saved prompts, and tutor conversations with messages stored for this account. Demo-generated content is flagged with isDemo, and every evidence record keeps its verified flag so project and interview evidence is not mistaken for something an outside reviewer confirmed. It excludes provider credentials, internal usage counters, and authentication secrets.",
    profile,
    assessments,
    roadmaps,
    sessions,
    projects,
    skillEvidence: evidence,
    careerExperiments,
    careerChoice: careerPreference,
    mockInterviews,
    interviewAttempts,
    jobApplications,
    applicationMaterials: materials,
    prompts,
    tutorConversations: conversations,
  };

  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="careerforge-account-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
