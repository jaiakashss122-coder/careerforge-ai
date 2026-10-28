export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  degree: string;
  degree_specialization: string;
  year_of_study: string;
  graduation_year: number | null;
  self_reported_python: string;
  self_reported_sql: string;
  self_reported_web: string;
  self_reported_statistics: string;
  self_reported_ml: string;
  self_reported_git: string;
  career_status: string;
  target_career_slug: string | null;
  career_note: string;
  weekly_hours: number;
  preferred_session_minutes: number;
  learning_preferences: string[];
  tools: string[];
  primary_goal: string;
  internship_target_month: string | null;
  constraints_note: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  email: string;
  full_name?: string;
  degree?: string;
  degree_specialization?: string;
  year_of_study?: string;
  graduation_year?: number | null;
  self_reported_python?: string;
  self_reported_sql?: string;
  self_reported_web?: string;
  self_reported_statistics?: string;
  self_reported_ml?: string;
  self_reported_git?: string;
  career_status?: string;
  target_career_slug?: string | null;
  career_note?: string;
  weekly_hours?: number;
  preferred_session_minutes?: number;
  learning_preferences?: string[];
  tools?: string[];
  primary_goal?: string;
  internship_target_month?: string | null;
  constraints_note?: string;
  onboarding_completed?: boolean;
};

export type ProfileUpdate = Partial<
  Omit<ProfileInsert, "id"> & { id?: string }
>;

export type SkillRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  created_at: string;
};

export type SkillAssessmentRow = {
  id: string;
  user_id: string;
  assessment_type: string;
  status: string;
  overall_score: number | null;
  max_score: number | null;
  confidence_average: number | null;
  summary: Json;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type SkillAssessmentInsert = {
  id?: string;
  user_id: string;
  assessment_type?: string;
  status?: string;
  overall_score?: number | null;
  max_score?: number | null;
  confidence_average?: number | null;
  summary?: Json;
  started_at?: string;
  completed_at?: string | null;
};

export type AssessmentAnswerRow = {
  id: string;
  assessment_id: string;
  section: string;
  question_key: string;
  question_type: string;
  prompt_text: string;
  response: Json;
  is_correct: boolean | null;
  score: number | null;
  max_score: number | null;
  self_confidence: number | null;
  concept: string | null;
  feedback: string | null;
  remedial_lesson_slug: string | null;
  answered_at: string;
  created_at: string;
};

export type AssessmentAnswerInsert = {
  id?: string;
  assessment_id: string;
  section: string;
  question_key: string;
  question_type: string;
  prompt_text: string;
  response?: Json;
  is_correct?: boolean | null;
  score?: number | null;
  max_score?: number | null;
  self_confidence?: number | null;
  concept?: string | null;
  feedback?: string | null;
  remedial_lesson_slug?: string | null;
  answered_at?: string;
};

export type LearningRoadmapRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  focus_tracks: string[];
  source: string;
  summary: Json;
  created_at: string;
  updated_at: string;
};

export type LearningRoadmapInsert = {
  id?: string;
  user_id: string;
  title: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  focus_tracks?: string[];
  source?: string;
  summary?: Json;
  created_at?: string;
  updated_at?: string;
};

export type RoadmapTaskRow = {
  id: string;
  roadmap_id: string;
  skill_id: string | null;
  week_number: number;
  order_index: number;
  title: string;
  description: string;
  category: string;
  estimated_minutes: number | null;
  status: string;
  resources: Json;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoadmapTaskInsert = {
  id?: string;
  roadmap_id: string;
  skill_id?: string | null;
  week_number: number;
  order_index?: number;
  title: string;
  description?: string;
  category?: string;
  estimated_minutes?: number | null;
  status?: string;
  resources?: Json;
  completed_at?: string | null;
};

export type RoadmapPrerequisiteRow = {
  task_id: string;
  prerequisite_task_id: string;
};

export type RoadmapPrerequisiteInsert = {
  task_id: string;
  prerequisite_task_id: string;
};

export type LearningSessionRow = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  roadmap_task_id: string | null;
  mode: string;
  status: string;
  planned_minutes: number | null;
  actual_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  notes: string;
  created_at: string;
};

export type LearningSessionInsert = {
  id?: string;
  user_id: string;
  lesson_id?: string | null;
  roadmap_task_id?: string | null;
  mode: string;
  status?: string;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  started_at?: string;
  ended_at?: string | null;
  notes?: string;
};

export type UserSkillEvidenceRow = {
  id: string;
  user_id: string;
  skill_id: string;
  source_type: string;
  source_id: string | null;
  evidence_level: string;
  score: number | null;
  verified: boolean;
  notes: string;
  created_at: string;
};

export type UserSkillEvidenceInsert = {
  id?: string;
  user_id: string;
  skill_id: string;
  source_type: string;
  source_id?: string | null;
  evidence_level: string;
  score?: number | null;
  verified?: boolean;
  notes?: string;
};

export type ProjectRow = {
  id: string;
  user_id: string;
  template_slug: string | null;
  title: string;
  problem_statement: string;
  status: string;
  repo_url: string | null;
  deployment_url: string | null;
  self_assessment: Json;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = {
  id?: string;
  user_id: string;
  template_slug?: string | null;
  title: string;
  problem_statement?: string;
  status?: string;
  repo_url?: string | null;
  deployment_url?: string | null;
  self_assessment?: Json;
  started_at?: string | null;
  completed_at?: string | null;
};

export type ProjectMilestoneRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  order_index: number;
  template_key: string | null;
  status: string;
  evidence_url: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ProjectMilestoneInsert = {
  id?: string;
  project_id: string;
  title: string;
  description?: string;
  order_index?: number;
  template_key?: string | null;
  status?: string;
  evidence_url?: string | null;
  completed_at?: string | null;
};

export type SavedPromptRow = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  body: string;
  tags: string[];
  source: string;
  is_template: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedPromptInsert = {
  id?: string;
  user_id: string;
  title: string;
  category: string;
  body: string;
  tags?: string[];
  source?: string;
  is_template?: boolean;
  is_demo?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TutorConversationRow = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  mode: string;
  career_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type TutorConversationInsert = {
  id?: string;
  user_id: string;
  lesson_id?: string | null;
  title?: string;
  mode?: string;
  career_slug?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TutorMessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  token_count: number | null;
  is_demo: boolean;
  created_at: string;
};

export type TutorMessageInsert = {
  id?: string;
  conversation_id: string;
  role: string;
  content: string;
  token_count?: number | null;
  is_demo?: boolean;
  created_at?: string;
};

export type AiUsageEventRow = {
  id: number;
  user_id: string;
  feature: string;
  is_demo: boolean;
  created_at: string;
};

export type AiUsageEventInsert = {
  id?: number;
  user_id: string;
  feature: string;
  is_demo?: boolean;
  created_at?: string;
};

export type CareerExperimentRow = {
  id: string;
  user_id: string;
  career_slug: string;
  title: string;
  brief: string;
  status: string;
  interest_rating: number | null;
  difficulty_rating: number | null;
  enjoyment_rating: number | null;
  willingness_rating: number | null;
  reflection: string;
  evidence: Json;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerExperimentInsert = {
  id?: string;
  user_id: string;
  career_slug: string;
  title: string;
  brief?: string;
  status?: string;
  interest_rating?: number | null;
  difficulty_rating?: number | null;
  enjoyment_rating?: number | null;
  willingness_rating?: number | null;
  reflection?: string;
  evidence?: Json;
  started_at?: string | null;
  completed_at?: string | null;
};

export type CareerPreferenceRow = {
  id: string;
  user_id: string;
  interest_numerical: number | null;
  interest_software: number | null;
  interest_research: number | null;
  interest_business: number | null;
  interest_automation: number | null;
  interest_ai: number | null;
  preferred_work_style: string | null;
  preferred_learning_activities: string[];
  constraints_data: Json;
  specialization_choice: string | null;
  alternative_choice: string | null;
  override_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CareerPreferenceInsert = {
  id?: string;
  user_id: string;
  specialization_choice?: string | null;
  alternative_choice?: string | null;
  override_reason?: string | null;
};

export type JobApplicationRow = {
  id: string;
  user_id: string;
  company: string;
  role_title: string;
  job_url: string | null;
  location: string | null;
  source_kind: string;
  status: string;
  applied_on: string | null;
  next_action: string | null;
  next_action_on: string | null;
  skills: Json;
  description: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type JobApplicationInsert = {
  id?: string;
  user_id: string;
  company: string;
  role_title: string;
  job_url?: string | null;
  location?: string | null;
  source_kind?: string;
  status?: string;
  applied_on?: string | null;
  next_action?: string | null;
  next_action_on?: string | null;
  skills?: Json;
  description?: string;
  notes?: string;
};

export type MockInterviewRow = {
  id: string;
  user_id: string;
  label: string;
  topics: Json;
  question_ids: Json;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type MockInterviewInsert = {
  id?: string;
  user_id: string;
  label: string;
  topics?: Json;
  question_ids?: Json;
  started_at?: string;
  completed_at?: string | null;
};

export type InterviewAttemptRow = {
  id: string;
  user_id: string;
  interview_id: string | null;
  question_id: string;
  topic: string;
  prompt: string;
  answer_text: string;
  rating: string;
  skills: Json;
  created_at: string;
};

export type InterviewAttemptInsert = {
  id?: string;
  user_id: string;
  interview_id?: string | null;
  question_id: string;
  topic: string;
  prompt: string;
  answer_text?: string;
  rating: string;
  skills?: Json;
};

export type ApplicationMaterialRow = {
  id: string;
  user_id: string;
  kind: string;
  content: string;
  target_role: string;
  application_id: string | null;
  built_from: Json;
  created_at: string;
  updated_at: string;
};

export type ApplicationMaterialInsert = {
  id?: string;
  user_id: string;
  kind: string;
  content?: string;
  target_role?: string;
  application_id?: string | null;
  built_from?: Json;
};

/**
 * Three tables the first migration created and nothing writes yet: a lesson the
 * roadmap does not carry, a standalone quiz the assessment does not ask, and a
 * weekly review no screen opens. They are typed because account closure deletes
 * them, and a delete that names a table has to know its columns.
 */
export type LessonRow = {
  id: string;
  user_id: string;
  roadmap_task_id: string | null;
  title: string;
  objective: string;
  content: Json;
  estimated_minutes: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonInsert = {
  id?: string;
  user_id: string;
  roadmap_task_id?: string | null;
  title: string;
  objective?: string;
  content?: Json;
  estimated_minutes?: number | null;
  status?: string;
  completed_at?: string | null;
};

export type QuizAttemptRow = {
  id: string;
  user_id: string;
  lesson_id: string | null;
  skill_id: string | null;
  questions: Json;
  answers: Json;
  score: number | null;
  max_score: number | null;
  taken_at: string;
  created_at: string;
};

export type QuizAttemptInsert = {
  id?: string;
  user_id: string;
  lesson_id?: string | null;
  skill_id?: string | null;
  questions?: Json;
  answers?: Json;
  score?: number | null;
  max_score?: number | null;
  taken_at?: string;
};

export type WeeklyReviewRow = {
  id: string;
  user_id: string;
  week_start: string;
  planned_minutes: number | null;
  actual_minutes: number | null;
  wins: string;
  challenges: string;
  next_focus: string;
  created_at: string;
  updated_at: string;
};

export type WeeklyReviewInsert = {
  id?: string;
  user_id: string;
  week_start: string;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  wins?: string;
  challenges?: string;
  next_focus?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      skills: {
        Row: SkillRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      skill_assessments: {
        Row: SkillAssessmentRow;
        Insert: SkillAssessmentInsert;
        Update: Partial<SkillAssessmentInsert>;
        Relationships: [];
      };
      assessment_answers: {
        Row: AssessmentAnswerRow;
        Insert: AssessmentAnswerInsert;
        Update: Partial<AssessmentAnswerInsert>;
        Relationships: [];
      };
      learning_roadmaps: {
        Row: LearningRoadmapRow;
        Insert: LearningRoadmapInsert;
        Update: Partial<LearningRoadmapInsert>;
        Relationships: [];
      };
      roadmap_tasks: {
        Row: RoadmapTaskRow;
        Insert: RoadmapTaskInsert;
        Update: Partial<RoadmapTaskInsert>;
        Relationships: [];
      };
      roadmap_task_prerequisites: {
        Row: RoadmapPrerequisiteRow;
        Insert: RoadmapPrerequisiteInsert;
        Update: never;
        Relationships: [];
      };
      learning_sessions: {
        Row: LearningSessionRow;
        Insert: LearningSessionInsert;
        Update: Partial<LearningSessionInsert>;
        Relationships: [];
      };
      user_skill_evidence: {
        Row: UserSkillEvidenceRow;
        Insert: UserSkillEvidenceInsert;
        Update: Partial<UserSkillEvidenceInsert>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: Partial<ProjectInsert>;
        Relationships: [];
      };
      project_milestones: {
        Row: ProjectMilestoneRow;
        Insert: ProjectMilestoneInsert;
        Update: Partial<ProjectMilestoneInsert>;
        Relationships: [];
      };
      saved_prompts: {
        Row: SavedPromptRow;
        Insert: SavedPromptInsert;
        Update: Partial<SavedPromptInsert>;
        Relationships: [];
      };
      tutor_conversations: {
        Row: TutorConversationRow;
        Insert: TutorConversationInsert;
        Update: Partial<TutorConversationInsert>;
        Relationships: [];
      };
      tutor_messages: {
        Row: TutorMessageRow;
        Insert: TutorMessageInsert;
        Update: Partial<TutorMessageInsert>;
        Relationships: [];
      };
      ai_usage_events: {
        Row: AiUsageEventRow;
        Insert: AiUsageEventInsert;
        Update: never;
        Relationships: [];
      };
      career_experiments: {
        Row: CareerExperimentRow;
        Insert: CareerExperimentInsert;
        Update: Partial<CareerExperimentInsert>;
        Relationships: [];
      };
      career_preferences: {
        Row: CareerPreferenceRow;
        Insert: CareerPreferenceInsert;
        Update: Partial<CareerPreferenceInsert>;
        Relationships: [];
      };
      job_applications: {
        Row: JobApplicationRow;
        Insert: JobApplicationInsert;
        Update: Partial<JobApplicationInsert>;
        Relationships: [];
      };
      mock_interviews: {
        Row: MockInterviewRow;
        Insert: MockInterviewInsert;
        Update: Partial<MockInterviewInsert>;
        Relationships: [];
      };
      interview_attempts: {
        Row: InterviewAttemptRow;
        Insert: InterviewAttemptInsert;
        Update: Partial<InterviewAttemptInsert>;
        Relationships: [];
      };
      application_materials: {
        Row: ApplicationMaterialRow;
        Insert: ApplicationMaterialInsert;
        Update: Partial<ApplicationMaterialInsert>;
        Relationships: [];
      };
      lessons: {
        Row: LessonRow;
        Insert: LessonInsert;
        Update: Partial<LessonInsert>;
        Relationships: [];
      };
      quiz_attempts: {
        Row: QuizAttemptRow;
        Insert: QuizAttemptInsert;
        Update: Partial<QuizAttemptInsert>;
        Relationships: [];
      };
      weekly_reviews: {
        Row: WeeklyReviewRow;
        Insert: WeeklyReviewInsert;
        Update: Partial<WeeklyReviewInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
