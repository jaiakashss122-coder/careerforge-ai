import type { AssessmentRecord } from "@/lib/assessment/types";
import type { LearningRoadmap } from "@/lib/roadmap/types";
import type { LearningSessionRecord } from "@/lib/sessions/types";

export type WorkspaceActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export type SubmitAssessmentResult =
  | {
      ok: true;
      record: AssessmentRecord;
      initialRoadmapId: string | null;
      roadmapNotice: string | null;
    }
  | {
      ok: false;
      message: string;
      missingKeys?: string[];
      invalidKeys?: string[];
    };

export type CreateRoadmapResult =
  | { ok: true; roadmap: LearningRoadmap }
  | { ok: false; message: string };

export type StartSessionResult =
  | { ok: true; session: LearningSessionRecord }
  | { ok: false; message: string };

export type DeleteLearningDataResult =
  | { ok: true; message: string }
  | { ok: false; message: string };
