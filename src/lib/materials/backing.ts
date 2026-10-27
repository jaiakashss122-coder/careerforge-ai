import { getCareerTrack, type CareerTrackSlug } from "@/lib/career/tracks";
import type { Profile } from "@/lib/profile/schema";
import { SKILL_LEVEL_META } from "@/lib/profile/constants";
import {
  EVIDENCE_LEVEL_LABELS,
  EVIDENCE_LEVEL_RANK,
  type EvidenceLevel,
} from "@/lib/evidence/types";
import type { MockInterviewRecord } from "@/lib/interview/types";
import { getLatestAssessment } from "@/lib/workspace/progress";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import { SKILLS, type SkillCategory } from "@/lib/skills/catalog";
import {
  RESUME_LISTABLE_PERCENT,
  type ClaimStrength,
  type DraftBuiltFrom,
  type MaterialSource,
} from "@/lib/materials/types";
import { formatMaterialDay, joinList, pluralise } from "@/lib/materials/text";

/**
 * One profile field covers a whole skill category, and the mapping is only made
 * where the two clearly mean the same thing. `ai-engineering` and `career` have
 * no matching field, so nothing is inferred for them.
 */
const CATEGORY_SELF_REPORT: Partial<
  Record<SkillCategory, { key: keyof Profile; label: string }>
> = {
  programming: { key: "pythonLevel", label: "Python" },
  sql: { key: "sqlLevel", label: "SQL" },
  "data-science": { key: "statisticsLevel", label: "Statistics and mathematics" },
  "machine-learning": {
    key: "machineLearningLevel",
    label: "Machine learning",
  },
  "software-development": { key: "gitLevel", label: "Git and GitHub" },
};

export type SkillProof = {
  slug: string;
  name: string;
  category: SkillCategory;
  strength: ClaimStrength;
  /** Your own assessment score for this skill, or null when nothing was answered. */
  percent: number | null;
  /** Completed projects whose record names this skill. */
  projects: {
    id: string;
    title: string;
    completedAt: string | null;
    repoUrl: string | null;
  }[];
  /** Finished practice interviews that wrote a record for this skill. */
  interviews: { id: string; label: string; completedAt: string | null }[];
  /** Every evidence level stored for it, strongest first. */
  levels: EvidenceLevel[];
  /** What you told this app when you set your profile up, if anything. */
  selfReport: { label: string; value: string } | null;
  /** Why this skill landed on this line, naming the record that decided it. */
  reason: string;
  /** What would move it up, or null when it is already as strong as it gets. */
  nextStep: string | null;
};

function profileSelfReport(
  category: SkillCategory,
  profile: Profile | null,
): { label: string; value: string } | null {
  const mapping = CATEGORY_SELF_REPORT[category];

  if (!mapping || !profile) return null;

  const raw = profile[mapping.key];

  if (typeof raw !== "string" || raw === "unassessed" || raw === "none") {
    return null;
  }

  const meta = SKILL_LEVEL_META[raw as keyof typeof SKILL_LEVEL_META];

  return { label: mapping.label, value: meta ? meta.label : raw };
}

/**
 * Reads every stored record once and gives each of the skills this app knows one
 * claim strength. The order of the checks is the whole rule: finished work
 * outranks a score, a score outranks your own rating of an answer, and an answer
 * you rated yourself outranks having no record at all.
 */
export function buildSkillProofs({
  workspace,
  profile,
}: {
  workspace: WorkspaceSnapshot;
  profile: Profile | null;
}): SkillProof[] {
  const assessment = getLatestAssessment(workspace.assessments);

  const percents = new Map<string, number>();

  for (const section of assessment?.summary.sections ?? []) {
    for (const skill of section.skills) {
      percents.set(skill.skillSlug, skill.percent);
    }
  }

  const projectById = new Map(
    workspace.projects.map((project) => [project.id, project]),
  );
  const interviewById = new Map<string, MockInterviewRecord>(
    workspace.mockInterviews.map((interview) => [interview.id, interview]),
  );

  const projectHits = new Map<string, SkillProof["projects"]>();
  const interviewHits = new Map<string, SkillProof["interviews"]>();
  const levelsBySkill = new Map<string, EvidenceLevel[]>();

  for (const record of workspace.evidence) {
    const levels = levelsBySkill.get(record.skillSlug) ?? [];

    if (!levels.includes(record.evidenceLevel)) {
      levels.push(record.evidenceLevel);
      levelsBySkill.set(record.skillSlug, levels);
    }

    if (record.sourceType === "project") {
      const project = record.sourceId
        ? projectById.get(record.sourceId)
        : undefined;

      // An evidence row outliving its project means the row was written by a
      // project that has since been deleted, so it proves nothing to a reader.
      if (project && project.status === "completed") {
        const hits = projectHits.get(record.skillSlug) ?? [];

        if (!hits.some((hit) => hit.id === project.id)) {
          hits.push({
            id: project.id,
            title: project.title,
            completedAt: project.completedAt,
            repoUrl: project.repoUrl,
          });
          projectHits.set(record.skillSlug, hits);
        }
      }
    }

    if (record.sourceType === "interview") {
      const interview = record.sourceId
        ? interviewById.get(record.sourceId)
        : undefined;

      if (interview?.completedAt) {
        const hits = interviewHits.get(record.skillSlug) ?? [];

        if (!hits.some((hit) => hit.id === interview.id)) {
          hits.push({
            id: interview.id,
            label: interview.label,
            completedAt: interview.completedAt,
          });
          interviewHits.set(record.skillSlug, hits);
        }
      }
    }
  }

  return SKILLS.map((skill) => {
    const percent = percents.get(skill.slug) ?? null;
    const projects = projectHits.get(skill.slug) ?? [];
    const interviews = interviewHits.get(skill.slug) ?? [];
    const levels = (levelsBySkill.get(skill.slug) ?? []).sort(
      (a, b) => EVIDENCE_LEVEL_RANK[b] - EVIDENCE_LEVEL_RANK[a],
    );
    const selfReport = profileSelfReport(skill.category, profile);

    let strength: ClaimStrength;

    if (projects.length > 0) {
      strength = "shown";
    } else if (percent !== null && percent >= RESUME_LISTABLE_PERCENT) {
      strength = "screened";
    } else if (interviews.length > 0) {
      strength = "practised";
    } else if (percent !== null) {
      strength = "weak";
    } else {
      strength = "nothing";
    }

    return {
      slug: skill.slug,
      name: skill.name,
      category: skill.category,
      strength,
      percent,
      projects,
      interviews,
      levels,
      selfReport,
      reason: proofReason({
        strength,
        name: skill.name,
        percent,
        projects,
        interviews,
        levels,
      }),
      nextStep: proofNextStep(strength, skill.name, percent),
    };
  });
}

function proofReason({
  strength,
  name,
  percent,
  projects,
  interviews,
  levels,
}: {
  strength: ClaimStrength;
  name: string;
  percent: number | null;
  projects: SkillProof["projects"];
  interviews: SkillProof["interviews"];
  levels: EvidenceLevel[];
}): string {
  const levelLine =
    levels.length > 0
      ? ` Stored levels: ${levels
          .map((level) => EVIDENCE_LEVEL_LABELS[level])
          .join(", ")}.`
      : "";

  switch (strength) {
    case "shown":
      return `${name} appears in ${projects.length} ${
        projects.length === 1 ? "project you" : "projects you"
      } completed${
        projects.length === 1 ? `: ${projects[0].title}` : ` (${projects
          .map((project) => project.title)
          .join(", ")})`
      }.${
        projects.some((project) => project.repoUrl === null)
          ? " At least one of them has no repository link, so a reviewer cannot open the work."
          : ""
      }${levelLine}`;
    case "screened":
      return `Your own assessment scored ${name} at ${percent} of 100, which is at or above the ${RESUME_LISTABLE_PERCENT} this app treats as listable, and no finished project names it yet.${levelLine}`;
    case "practised":
      return `A finished practice interview covers ${name}, from ${
        interviews.length
      } ${interviews.length === 1 ? "interview" : "interviews"} you rated yourself.`;
    case "weak":
      return `Your own assessment scored ${name} at ${percent} of 100, under the ${RESUME_LISTABLE_PERCENT} this app treats as listable.`;
    case "nothing":
      return `Nothing here has a record for ${name}: no assessment answer, no completed project, no finished practice interview.`;
  }
}

function proofNextStep(
  strength: ClaimStrength,
  name: string,
  percent: number | null,
): string | null {
  switch (strength) {
    case "shown":
      return null;
    case "screened":
      return `Finish a project that names ${name} and link its repository, and the claim stops resting on a score.`;
    case "practised":
      return `You rated ${name} yourself in one practice answer. A project that names it, or an assessment score at ${RESUME_LISTABLE_PERCENT} or above, is something a reviewer can question you on.`;
    case "weak":
      return `Retake the questions covering ${name}. Today your record says ${percent} of 100, and ${RESUME_LISTABLE_PERCENT} is the line this app lists at.`;
    case "nothing":
      return `Answer the assessment questions that cover ${name}, then finish a project that names it.`;
  }
}

/**
 * The two maps a posting comparison reads: your score per skill, and the strongest
 * evidence level stored for it. Built here so the interview screen and the
 * application-materials screen cannot grow apart on what a score means.
 */
export function gapMaps(workspace: WorkspaceSnapshot): {
  skillPercents: Map<string, number>;
  evidenceLevels: Map<string, string>;
} {
  const skillPercents = new Map<string, number>();
  const evidenceLevels = new Map<string, string>();

  for (const section of getLatestAssessment(workspace.assessments)?.summary
    .sections ?? []) {
    for (const skill of section.skills) {
      skillPercents.set(skill.skillSlug, skill.percent);
    }
  }

  for (const record of workspace.evidence) {
    const current = evidenceLevels.get(record.skillSlug) as
      | EvidenceLevel
      | undefined;

    if (
      !current ||
      EVIDENCE_LEVEL_RANK[record.evidenceLevel] > EVIDENCE_LEVEL_RANK[current]
    ) {
      evidenceLevels.set(record.skillSlug, record.evidenceLevel);
    }
  }

  return { skillPercents, evidenceLevels };
}

export function proofBySlug(proofs: SkillProof[]) {
  return new Map(proofs.map((proof) => [proof.slug, proof]));
}

export type DocumentTarget = {
  slug: CareerTrackSlug;
  name: string;
  /** Where this app got the role from, since two places can hold one. */
  from: string;
};

/**
 * The role every document aims at. A saved specialization beats the profile
 * target because it is the more recent, more deliberate choice — and the screen
 * says which of the two it used.
 */
export function targetRole(
  workspace: WorkspaceSnapshot,
  profile: Profile | null,
): DocumentTarget | null {
  const saved = workspace.careerPreferences[0]?.specializationChoice;

  if (saved) {
    return {
      slug: saved,
      name: getCareerTrack(saved)?.name ?? saved,
      from: "the role you saved as your specialization on the Career Explorer",
    };
  }

  if (profile?.targetCareerSlug) {
    const slug = profile.targetCareerSlug;

    return {
      slug,
      name: getCareerTrack(slug)?.name ?? slug,
      from: "the target role you set when you filled in your profile",
    };
  }

  return null;
}

/** A skill only reaches the document at `shown` or `screened`. */
export function isListable(strength: ClaimStrength) {
  return strength === "shown" || strength === "screened";
}

/**
 * The skills a document may claim, strongest first: finished work outranks a
 * score, and within a tier the higher score leads. Every builder that has to cut
 * a list short takes its skills from here, so the résumé and the LinkedIn
 * headline cannot end up naming different "top" skills.
 */
export function listableProofs(proofs: SkillProof[]) {
  return proofs
    .filter((proof) => isListable(proof.strength))
    .sort((a, b) => {
      if (a.strength === b.strength) {
        return (b.percent ?? 0) - (a.percent ?? 0);
      }

      return a.strength === "shown" ? -1 : 1;
    });
}

export type ProofSummary = {
  counts: Record<ClaimStrength, number>;
  listable: SkillProof[];
  withWork: SkillProof[];
  /** Skills that carry a record but are not allowed on the document. */
  heldBack: SkillProof[];
  /** Of the skills a posting asked for, how many this learner can write down. */
  coveredBy: (slugs: readonly string[]) => {
    wanted: number;
    listable: number;
    unbacked: string[];
  };
};

export function summarizeProofs(proofs: SkillProof[]): ProofSummary {
  const counts = { shown: 0, screened: 0, practised: 0, weak: 0, nothing: 0 };

  for (const proof of proofs) {
    counts[proof.strength] += 1;
  }

  const bySlug = proofBySlug(proofs);

  return {
    counts,
    listable: proofs.filter((proof) => isListable(proof.strength)),
    withWork: proofs.filter((proof) => proof.strength === "shown"),
    heldBack: proofs.filter(
      (proof) => proof.strength === "practised" || proof.strength === "weak",
    ),
    coveredBy: (slugs) => {
      const wanted = slugs.filter((slug) => bySlug.has(slug));
      const unbacked = wanted.filter(
        (slug) => !isListable(bySlug.get(slug)!.strength),
      );

      return {
        wanted: wanted.length,
        listable: wanted.length - unbacked.length,
        unbacked: unbacked.map((slug) => bySlug.get(slug)!.name),
      };
    },
  };
}

/**
 * The lines a reviewer would want under a skill claim. Built here so every
 * screen that shows a skill cites the same records in the same words.
 */
export function proofSources(proof: SkillProof): MaterialSource[] {
  const sources: MaterialSource[] = [];

  for (const project of proof.projects) {
    sources.push({
      kind: "project",
      label: `Completed project: ${project.title}`,
      detail: project.repoUrl
        ? `Finished work you linked at ${project.repoUrl}`
        : "Finished, but no repository link is stored, so a reviewer cannot open it.",
      date: project.completedAt,
      verified: false,
    });
  }

  if (proof.percent !== null) {
    sources.push({
      kind: "assessment",
      label: "Your skills assessment",
      detail: `Scored ${proof.percent} of 100 on the questions covering this skill.`,
      date: null,
      verified: false,
    });
  }

  for (const interview of proof.interviews) {
    sources.push({
      kind: "interview",
      label: `Practice interview: ${interview.label}`,
      detail:
        "You rated your own answer as answered. Nobody outside this app checked it.",
      date: interview.completedAt,
      verified: false,
    });
  }

  return sources;
}

/**
 * A fingerprint of every record a document was built from, taken the moment the
 * learner saves their own text. The saved wording does not change by itself; the
 * records under it do. Storing this is what lets the screen say "this was written
 * against one finished project, and today there are two" instead of letting old
 * wording look current.
 */
export function draftFingerprint({
  workspace,
  proofs,
  savedAt = new Date().toISOString(),
}: {
  workspace: WorkspaceSnapshot;
  proofs: SkillProof[];
  savedAt?: string;
}): DraftBuiltFrom {
  const completed = workspace.projects.filter(
    (project) => project.status === "completed",
  );
  const newest = [...completed].sort(
    (a, b) =>
      new Date(b.completedAt ?? b.updatedAt).getTime() -
      new Date(a.completedAt ?? a.updatedAt).getTime(),
  )[0];
  const counts = summarizeProofs(proofs).counts;

  return {
    savedAt,
    latestProject: newest?.title ?? null,
    completedProjects: completed.length,
    linkedProjects: completed.filter(
      (project) => project.repoUrl !== null || project.deploymentUrl !== null,
    ).length,
    skillRecords: workspace.evidence.length,
    shownSkills: counts.shown,
    screenedSkills: counts.screened,
    finishedInterviews: workspace.mockInterviews.filter(
      (interview) => interview.completedAt !== null,
    ).length,
    testedRoles: workspace.careerExperiments.filter(
      (experiment) => experiment.status === "completed",
    ).length,
    assessmentTaken: getLatestAssessment(workspace.assessments) !== null,
    listableSkills: counts.shown + counts.screened,
  };
}

/**
 * The counted fields a draft is compared on, in the order a reader checks them.
 * `listableSkills` is left out because it is the sum of the two skill counts, and
 * reporting it again would say the same thing twice.
 */
const FINGERPRINT_COUNTS: {
  key: keyof DraftBuiltFrom;
  label: string;
  one: string;
  many: string;
}[] = [
  {
    key: "completedProjects",
    label: "Finished projects",
    one: "finished project",
    many: "finished projects",
  },
  {
    key: "linkedProjects",
    label: "Finished projects with a link a reviewer can open",
    one: "with a link",
    many: "with a link",
  },
  {
    key: "shownSkills",
    label: "Skills your finished work backs",
    one: "skill your finished work backs",
    many: "skills your finished work backs",
  },
  {
    key: "screenedSkills",
    label: "Skills carried only by your own assessment score",
    one: "skill carried only by a score",
    many: "skills carried only by a score",
  },
  {
    key: "finishedInterviews",
    label: "Practice interviews you finished",
    one: "practice interview you rated yourself",
    many: "practice interviews you rated yourself",
  },
  {
    key: "testedRoles",
    label: "Roles you tested with the work linked",
    one: "role you tested with the work linked",
    many: "roles you tested with the work linked",
  },
  {
    key: "skillRecords",
    label: "Rows in your skill record",
    one: "row in your skill record",
    many: "rows in your skill record",
  },
];

/**
 * One sentence saying what this workspace held when the draft was saved. It is a
 * claim about the records, not about the wording, so it stays true even when the
 * saved text has gone stale.
 */
export function describeDraftFingerprint(
  fingerprint: DraftBuiltFrom,
): string {
  const day = formatMaterialDay(fingerprint.savedAt) ?? "a date this app cannot read";

  const clauses = [
    `${pluralise(
      fingerprint.completedProjects,
      "finished project",
      "finished projects",
    )} (${fingerprint.linkedProjects} with a link a reviewer can open)`,
    ...FINGERPRINT_COUNTS.filter(
      ({ key }) => key !== "completedProjects" && key !== "linkedProjects",
    ).map(({ key, one, many }) =>
      pluralise(fingerprint[key] as number, one, many),
    ),
    fingerprint.assessmentTaken
      ? "a completed skills assessment"
      : "no completed skills assessment",
  ];

  return `Saved on ${day}, when this workspace held ${joinList(
    clauses,
  )}. ${
    fingerprint.latestProject
      ? `The newest finished project was “${fingerprint.latestProject}”.`
      : "Nothing was finished as a project."
  }`;
}

/**
 * What has moved underneath a saved draft. Each line only compares the two
 * counts; an empty list means the records on file are still the ones the draft
 * was written against.
 */
export function draftDrift({
  saved,
  current,
}: {
  saved: DraftBuiltFrom;
  current: DraftBuiltFrom;
}): string[] {
  const lines = FINGERPRINT_COUNTS.flatMap(({ key, label }) => {
    const before = saved[key] as number;
    const after = current[key] as number;

    if (before === after) return [];

    return [
      `${label}: ${before} when this draft was saved, ${after} today.`,
    ];
  });

  if (saved.assessmentTaken !== current.assessmentTaken) {
    lines.push(
      current.assessmentTaken
        ? "There was no completed skills assessment when this draft was saved, and there is one now, so any score this draft quotes is older than the one on file."
        : "This draft was saved with a completed skills assessment, and there is no longer one on file.",
    );
  }

  if (saved.latestProject !== current.latestProject) {
    lines.push(
      `The newest finished project was ${
        saved.latestProject ? `“${saved.latestProject}”` : "nothing"
      } when this was saved, and is ${
        current.latestProject ? `“${current.latestProject}”` : "nothing"
      } today.`,
    );
  }

  return lines;
}
