/**
 * The three documents this workspace assembles, and the rules about what is
 * allowed to appear in them. Everything here is derived from records the
 * learner already has; the app has no authority to state a job title, a degree
 * award date, or a result it did not see.
 */

export const MATERIAL_KINDS = ["resume", "linkedin", "portfolio"] as const;

export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const MATERIAL_KIND_META: Record<
  MaterialKind,
  {
    label: string;
    sentenceLabel: string;
    whatItHolds: string;
    howItIsBuilt: string;
  }
> = {
  resume: {
    label: "Résumé",
    sentenceLabel: "résumé",
    whatItHolds:
      "The one page a recruiter scans before deciding to read further: the skills you can point at finished work, what you built, and what you studied.",
    howItIsBuilt:
      "A skill reaches this document only when a project you completed names it, or when your own assessment score is at or above the line this app treats as listable. Your own rating of a practice answer never puts a skill on a résumé.",
  },
  linkedin: {
    label: "LinkedIn guidance",
    sentenceLabel: "LinkedIn guidance",
    whatItHolds:
      "The headline, the about section, the skills list and the featured links on your profile — the parts a recruiter sees before they open your résumé.",
    howItIsBuilt:
      "Each line is assembled from your records, with the character count shown so you can see how much room is left. Work you did here is labelled project work, never employment.",
  },
  portfolio: {
    label: "Portfolio review",
    sentenceLabel: "portfolio review",
    whatItHolds:
      "For each project: the links a reviewer needs, the checklist items your records already prove, the ones that are missing, and the ones this app cannot see at all.",
    howItIsBuilt:
      "Only three things count as proof here — a repository link, a live link, and a milestone with the work attached. Everything else is reported as missing or as not checkable from inside this app.",
  },
};

/**
 * The line an assessment score has to reach before this app will put a skill on
 * a résumé without finished work behind it. 70 of 100 is the same line the
 * posting comparison on the interview page calls "your records support it", so
 * the two screens cannot disagree.
 */
export const RESUME_LISTABLE_PERCENT = 70;

/** One saved draft per kind, and the ceiling on how much text it can hold. */
export const MAX_DRAFT_LENGTH = 20_000;

/**
 * Below this, what is stored is a title or a fragment rather than a document,
 * so saving it would hide the fact that the records behind it were not used.
 */
export const MIN_DRAFT_LENGTH = 60;

/**
 * The two ceilings this app counts characters against. They are the values the
 * builder was told in October 2026; nothing here reads LinkedIn, so the screen
 * says that out loud rather than implying a live check.
 */
export const LINKEDIN_HEADLINE_LIMIT = 220;
export const LINKEDIN_ABOUT_LIMIT = 2_600;

export const PLATFORM_LIMIT_NOTE =
  "These two counts come from what this app was told in October 2026. Nothing here opens LinkedIn, so check the live limits before you rely on the number.";

/**
 * How much a skill can be claimed, decided only by the records stored for it.
 * Ordered from strongest to weakest; `nothing` means this app has no record of
 * you doing it at all, which is the case most likely to be forgotten.
 */
export const CLAIM_STRENGTHS = [
  "shown",
  "screened",
  "practised",
  "weak",
  "nothing",
] as const;

export type ClaimStrength = (typeof CLAIM_STRENGTHS)[number];

export const CLAIM_STRENGTH_META: Record<
  ClaimStrength,
  { label: string; onTheDocument: string; why: string }
> = {
  shown: {
    label: "Backed by finished work",
    onTheDocument: "Write it, and name the project that shows it.",
    why: "A project you completed lists this skill, and completion needs every step submitted with the work attached plus a repository link.",
  },
  screened: {
    label: "Scored, no finished work yet",
    onTheDocument:
      "Write it only beside something you built, or as a line you are ready to be questioned on.",
    why: "Your own assessment score is at or above the line this app treats as listable. The check measures what you can answer, not what you have built, so it is a claim a reviewer can test on the spot.",
  },
  practised: {
    label: "Only your own rating of one answer",
    onTheDocument: "Do not write it as a skill. Write it as practice if you want.",
    why: "A finished practice interview covers this skill, but the only person who judged the answer was you, and nobody outside this app has seen it.",
  },
  weak: {
    label: "Scored below the line",
    onTheDocument: "Do not write it. It is a gap a question would expose.",
    why: "Your own assessment score is under the line this app treats as listable.",
  },
  nothing: {
    label: "No record either way",
    onTheDocument: "Do not write it. This app cannot back it with anything.",
    why: "No assessment answer, no finished project, and no practice interview names this skill.",
  },
};

/**
 * What the document needs that this workspace has no record of. Listed on every
 * screen so a learner cannot mistake an empty section for permission to invent.
 */
export const NEVER_FROM_THIS_APP: readonly string[] = [
  "Where you have worked, your job titles, and the months you held them",
  "Salary, grade, or any figure you were paid",
  "Certifications, licences, awards, and competition results",
  "Your university or school name, and whether you graduated",
  "Grades, marks, or class rank",
  "Numbers describing your work, such as users served or accuracy reached",
  "References, and the contact details of anyone who would vouch for you",
];

/**
 * What a portfolio page normally carries and no record in this workspace holds.
 * Listed so an empty section reads as a gap to fill, not as permission to invent.
 */
export const PORTFOLIO_NOT_IN_RECORDS: readonly string[] = [
  "Screenshots, figures and any image of the work — this app stores links, not files",
  "A written walkthrough of how you made a decision, beyond the one problem statement you typed",
  "Your name, photo, location and the address that receives replies",
  "Measured results: accuracy, runtime, users, revenue, or anything a chart would show",
  "Whether a link still opens. Nothing here loads one",
  "What anyone outside this app thought of the work, including any grade or review",
];

export const MATERIALS_DISCLAIMER =
  "Everything here is assembled from records stored in this workspace. This app has never seen a transcript, an employer, or a reviewer, so it cannot confirm a single line of what it writes. The wording is a starting point you remain responsible for.";

/** Which stored table a line came from, so the screen can name the record. */
export const MATERIAL_SOURCE_KINDS = [
  "project",
  "milestone",
  "interview",
  "experiment",
  "assessment",
  "profile",
  "roadmap",
  "application",
] as const;

export type MaterialSourceKind = (typeof MATERIAL_SOURCE_KINDS)[number];

export type MaterialSource = {
  kind: MaterialSourceKind;
  /** Where a reader of this screen would look to check the claim. */
  label: string;
  /** The exact fact the record holds, not a summary of it. */
  detail: string;
  /** ISO date the underlying record carries, when it has one. */
  date: string | null;
  /** True only when someone outside this app checked the work. Never true today. */
  verified: boolean;
};

export type MaterialEntry = {
  id: string;
  /** The wording that goes into the document. Plain text, no markup. */
  text: string;
  /** The records that produced that wording, in order. */
  sources: MaterialSource[];
  /** Shown beside the line on screen; never included in the exported text. */
  caution: string | null;
};

export type MaterialBlock = {
  key: string;
  title: string;
  /** Why this block exists, in one sentence the learner can act on. */
  purpose: string;
  entries: MaterialEntry[];
  /** What belongs here that this app cannot build, stated rather than left blank. */
  gaps: string[];
  note: string | null;
};

/**
 * A fingerprint of the records a draft was built from. Stored with the draft so
 * the screen can say when the records have moved on underneath it, instead of
 * letting a stale document look current.
 */
export type DraftBuiltFrom = {
  /** The moment the fingerprint was taken, which is the moment the draft was saved. */
  savedAt: string;
  /** The most recently finished project, so a portfolio draft names what it covered. */
  latestProject: string | null;
  completedProjects: number;
  /** Finished projects that store at least one link a reviewer could open. */
  linkedProjects: number;
  /** Rows in the skill record, whatever source they came from. */
  skillRecords: number;
  shownSkills: number;
  screenedSkills: number;
  finishedInterviews: number;
  /** Career experiments carried through to a result, not the ones still open. */
  testedRoles: number;
  assessmentTaken: boolean;
  listableSkills: number;
};

export type MaterialDraftRecord = {
  id: string;
  kind: MaterialKind;
  /** The learner's own text. This app stops touching it once it is saved. */
  content: string;
  /** The role the draft was written for, when the learner picked one. */
  targetRole: string | null;
  /** The saved role it was tailored to, when one was picked. */
  applicationId: string | null;
  /** Null when the stored fingerprint is missing or unusable, never guessed. */
  builtFrom: DraftBuiltFrom | null;
  createdAt: string;
  updatedAt: string;
};

export function isMaterialKind(value: string): value is MaterialKind {
  return (MATERIAL_KINDS as readonly string[]).includes(value);
}

/**
 * Reads a stored fingerprint back. A jsonb column can hold anything, and a
 * draft whose fingerprint does not parse is shown as "no fingerprint stored"
 * rather than filled in with plausible numbers.
 */
export function isDraftBuiltFrom(value: unknown): value is DraftBuiltFrom {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;
  const counts = [
    "completedProjects",
    "linkedProjects",
    "skillRecords",
    "shownSkills",
    "screenedSkills",
    "finishedInterviews",
    "testedRoles",
    "listableSkills",
  ] as const;

  return (
    typeof candidate.savedAt === "string" &&
    (candidate.latestProject === null ||
      typeof candidate.latestProject === "string") &&
    typeof candidate.assessmentTaken === "boolean" &&
    counts.every(
      (key) =>
        typeof candidate[key] === "number" &&
        Number.isInteger(candidate[key]) &&
        candidate[key] >= 0,
    )
  );
}

export function isClaimStrength(value: string): value is ClaimStrength {
  return (CLAIM_STRENGTHS as readonly string[]).includes(value);
}

export function isMaterialSourceKind(
  value: string,
): value is MaterialSourceKind {
  return (MATERIAL_SOURCE_KINDS as readonly string[]).includes(value);
}

/** The order strongest first, used whenever a list has to be cut short. */
export const CLAIM_STRENGTH_RANK: Record<ClaimStrength, number> = {
  shown: 5,
  screened: 4,
  practised: 3,
  weak: 2,
  nothing: 1,
};

/**
 * Characters a single plain-text line can hold before this app stops calling it
 * a line. Long enough for a full sentence with a link, short enough that a
 * reviewer still reads it in one pass.
 */
export const MAX_ENTRY_LENGTH = 320;
