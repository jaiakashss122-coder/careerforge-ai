/**
 * The tables this account owns, in the order a delete has to run.
 *
 * A child row that carries no `user_id` of its own — an assessment answer, a
 * milestone, a tutor message, a roadmap task — cannot be selected by account,
 * so it goes only because its parent row points at it `on delete cascade`.
 * `skills` is the catalogue this app reads and never owns, so no workflow here
 * touches it. `profiles` is keyed by `id` rather than `user_id` and is the last
 * row removed, because closing an account should leave the learning records
 * gone before the record of who the learner is.
 */

/** Removed by the learning-data workflow, which keeps the profile and sign-in. */
export const LEARNING_DATA_TABLES = [
  "learning_sessions",
  "learning_roadmaps",
  "skill_assessments",
  "user_skill_evidence",
  "projects",
  "career_experiments",
  "career_preferences",
  "interview_attempts",
  "mock_interviews",
  "job_applications",
  "application_materials",
  "tutor_conversations",
  "saved_prompts",
  "ai_usage_events",
] as const;

/**
 * Everything this account owns. Closing an account deletes these rows and then
 * signs out; it does not reach the sign-in itself, which belongs to the
 * authentication service rather than to any table in this schema.
 *
 * Built from the list below so the two can never disagree, and so no caller can
 * hand `profiles` to a delete filtered by `user_id`.
 */
const ACCOUNT_OWNED_BY_USER_ID = [
  "ai_usage_events",
  "application_materials",
  "saved_prompts",
  "tutor_conversations",
  "interview_attempts",
  "mock_interviews",
  "job_applications",
  "user_skill_evidence",
  "weekly_reviews",
  "quiz_attempts",
  "lessons",
  "learning_sessions",
  "projects",
  "career_experiments",
  "career_preferences",
  "learning_roadmaps",
  "skill_assessments",
] as const;

export const ACCOUNT_DATA_TABLES = [
  ...ACCOUNT_OWNED_BY_USER_ID,
  "profiles",
] as const;

/** The same rows, each one addressable by its own `user_id` column. */
export const ACCOUNT_USER_ID_TABLES = ACCOUNT_OWNED_BY_USER_ID;

/**
 * Rows that carry no account column and therefore leave only through a cascade
 * from one of the tables above. Listed here so the coverage test has to account
 * for them instead of discovering them by accident.
 */
export const CASCADE_ONLY_TABLES = [
  "assessment_answers",
  "project_milestones",
  "roadmap_task_prerequisites",
  "roadmap_tasks",
  "tutor_messages",
] as const;

export type OwnedTableName =
  | (typeof LEARNING_DATA_TABLES)[number]
  | (typeof ACCOUNT_DATA_TABLES)[number]
  | (typeof CASCADE_ONLY_TABLES)[number];

/**
 * The words each destructive workflow demands. They live beside the table lists
 * rather than inside the server module because a "use server" file may export
 * only functions, and the settings screen has to show what it will ask for.
 */
export const LEARNING_DATA_CONFIRM_WORD = "DELETE";
export const ACCOUNT_CLOSURE_CONFIRM_WORD = "CLOSE ACCOUNT";
