import type { Profile } from "@/lib/profile/schema";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import { getCareerTrack } from "@/lib/career/tracks";
import { getActiveRoadmap, getLatestAssessment } from "@/lib/workspace/progress";
import {
  listableProofs,
  summarizeProofs,
  targetRole,
  type DocumentTarget,
  type SkillProof,
} from "@/lib/materials/backing";
import {
  CLAIM_STRENGTH_META,
  LINKEDIN_ABOUT_LIMIT,
  LINKEDIN_HEADLINE_LIMIT,
  NEVER_FROM_THIS_APP,
  RESUME_LISTABLE_PERCENT,
  type MaterialBlock,
  type MaterialEntry,
  type MaterialSource,
} from "@/lib/materials/types";
import { joinList, pluralise } from "@/lib/materials/text";

/**
 * How many skills the headline names. A recruiter reads one line, and a list of
 * ten names looks exactly like a list of ten names nobody checked.
 */
const HEADLINE_SKILL_LIMIT = 3;

/** Beyond this, a list on screen stops being something a person will read. */
const NAMED_LIST_LIMIT = 8;

/**
 * A reader expects one figure in an about section. This app stores no
 * measurements, so it marks the slot instead of writing a number.
 */
const FIGURE_SLOT =
  "[Add the one number you can explain out loud — this app stores no measurements of your work, so it will not write one for you.]";

export type PlatformUsage = {
  characters: number;
  limit: number;
  /** True when the assembled text is longer than the ceiling this app counts against. */
  over: boolean;
  /** Negative when the text is over, so the screen can show by how much. */
  room: number;
};

export type LinkedInBuild = {
  target: DocumentTarget | null;
  headline: string;
  about: string;
  blocks: MaterialBlock[];
  usage: { headline: PlatformUsage; about: PlatformUsage };
  counts: {
    blocks: number;
    entries: number;
    cautions: number;
    gaps: number;
    listableSkills: number;
    skillsWithWork: number;
    links: number;
    paragraphs: number;
  };
  summary: string;
};

function platformUsage(text: string, limit: number): PlatformUsage {
  return {
    characters: text.length,
    limit,
    over: text.length > limit,
    room: limit - text.length,
  };
}

function namedList(names: readonly string[]): string {
  if (names.length <= NAMED_LIST_LIMIT) return joinList(names);

  return `${names.slice(0, NAMED_LIST_LIMIT).join(", ")}, and ${
    names.length - NAMED_LIST_LIMIT
  } more`;
}

function buildHeadline({
  target,
  skills,
  linkedProjects,
}: {
  target: DocumentTarget | null;
  skills: SkillProof[];
  linkedProjects: number;
}): string {
  const parts = [
    target ? `Looking for ${target.name} work` : null,
    skills.length > 0 ? skills.map((proof) => proof.name).join(", ") : null,
    linkedProjects > 0
      ? `${pluralise(linkedProjects, "project", "projects")} with the code linked`
      : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" | ");
}

function studyLine(profile: Profile): string {
  const field = profile.degreeSpecialization
    ? `${profile.degree} (${profile.degreeSpecialization})`
    : profile.degree;

  if (profile.yearOfStudy === "Graduated") {
    return `I studied ${field}.`;
  }

  return `I am a ${profile.yearOfStudy.toLowerCase()} studying ${field}.`;
}

function aboutParagraphs({
  profile,
  target,
  listable,
  completedProjects,
  finishedInterviews,
  testedExperiments,
  hasRoadmap,
}: {
  profile: Profile | null;
  target: DocumentTarget | null;
  listable: SkillProof[];
  completedProjects: WorkspaceSnapshot["projects"];
  finishedInterviews: number;
  testedExperiments: number;
  hasRoadmap: boolean;
}): string[] {
  const paragraphs: string[] = [];

  if (profile) {
    const goal = profile.primaryGoal
      ? ` My own words for what I want: ${profile.primaryGoal}`
      : "";
    const aim = target ? ` I am aiming at ${target.name} work.` : "";

    paragraphs.push(`${studyLine(profile)}${aim}${goal}`.trim());
  }

  const worked = listable.filter((proof) => proof.strength === "shown");
  const scored = listable.filter((proof) => proof.strength === "screened");

  if (listable.length > 0) {
    const first =
      worked.length > 0
        ? `The skills I can point at finished work: ${namedList(
            worked.map((proof) => proof.name),
          )}.`
        : "I have not finished a project yet, so nothing below is backed by work a reader can open.";
    const rest =
      scored.length > 0
        ? ` The other ${pluralise(
            scored.length,
            "skill",
            "skills",
          )} come from a scored check I took on my own, at ${RESUME_LISTABLE_PERCENT} of 100 or above: ${namedList(
            scored.map((proof) => proof.name),
          )}.`
        : "";

    paragraphs.push(`${first}${rest}`);
  }

  const linked = completedProjects.filter((project) => project.repoUrl !== null);

  if (linked.length > 0) {
    paragraphs.push(
      `What I built and can be opened: ${joinList(
        linked.map(
          (project) =>
            `${project.title} (${project.problemStatement} Code: ${project.repoUrl})`,
        ),
      )}.`,
    );
  } else if (completedProjects.length > 0) {
    paragraphs.push(
      `I have finished ${pluralise(
        completedProjects.length,
        "project",
        "projects",
      )} here, but no repository link is stored for any of them, so a reader has nothing to open.`,
    );
  }

  const extras = [
    finishedInterviews > 0
      ? `I have rehearsed ${pluralise(
          finishedInterviews,
          "interview",
          "interviews",
        )} by rating my own answers.`
      : null,
    testedExperiments > 0
      ? `I have tested ${pluralise(
          testedExperiments,
          "role",
          "roles",
        )} with short real tasks to check the work suits me.`
      : null,
    hasRoadmap
      ? "I work to a written study plan rather than picking up whatever looks interesting."
      : null,
  ].filter((item): item is string => item !== null);

  if (extras.length > 0) {
    paragraphs.push(extras.join(" "));
  }

  paragraphs.push(FIGURE_SLOT);

  return paragraphs;
}

export function buildLinkedIn({
  workspace,
  profile,
  proofs,
}: {
  workspace: WorkspaceSnapshot;
  profile: Profile | null;
  proofs: SkillProof[];
}): LinkedInBuild {
  const summary = summarizeProofs(proofs);
  const target = targetRole(workspace, profile);
  const assessment = getLatestAssessment(workspace.assessments);
  const ordered = listableProofs(proofs);

  const completedProjects = workspace.projects.filter(
    (project) => project.status === "completed",
  );
  const projectsWithLink = completedProjects.filter(
    (project) => project.repoUrl !== null || project.deploymentUrl !== null,
  );
  const finishedInterviews = workspace.mockInterviews.filter(
    (interview) => interview.completedAt !== null,
  );
  const testedExperiments = workspace.careerExperiments.filter(
    (experiment) => experiment.status === "completed",
  );
  const activeRoadmap = getActiveRoadmap(workspace.roadmaps);

  const headlineSkills = ordered.slice(0, HEADLINE_SKILL_LIMIT);
  const headline = buildHeadline({
    target,
    skills: headlineSkills,
    linkedProjects: projectsWithLink.length,
  });
  const paragraphs = aboutParagraphs({
    profile,
    target,
    listable: ordered,
    completedProjects,
    finishedInterviews: finishedInterviews.length,
    testedExperiments: testedExperiments.length,
    hasRoadmap: Boolean(activeRoadmap),
  });
  const about = profile ? paragraphs.join("\n\n") : "";

  const blocks: MaterialBlock[] = [];

  // --- Headline -----------------------------------------------------------
  const headlineEntries: MaterialEntry[] = [];

  if (headline.length > 0) {
    const sources: MaterialSource[] = [];

    if (target) {
      sources.push({
        kind: "profile",
        label: target.from,
        detail: `The role this app aims your documents at: ${target.name}.`,
        date: null,
        verified: false,
      });
    }

    for (const proof of headlineSkills) {
      sources.push({
        kind: proof.strength === "shown" ? "project" : "assessment",
        label:
          proof.strength === "shown"
            ? `Completed project: ${proof.projects[0].title}`
            : "Your skills assessment",
        detail:
          proof.strength === "shown"
            ? `Named by work you finished${
                proof.projects[0].repoUrl
                  ? ` and linked at ${proof.projects[0].repoUrl}`
                  : ", with no repository link stored"
              }.`
            : `Scored ${proof.percent} of 100, at or above the ${RESUME_LISTABLE_PERCENT} this app lists at.`,
        date:
          proof.strength === "shown"
            ? proof.projects[0].completedAt
            : (assessment?.completedAt ?? null),
        verified: false,
      });
    }

    sources.push({
      kind: "project",
      label: "Your project records",
      detail: `${projectsWithLink.length} of ${completedProjects.length} completed projects in this workspace store a link to the work.`,
      date: null,
      verified: false,
    });

    headlineEntries.push({
      id: "headline-text",
      text: headline,
      sources,
      caution: `This says what you are looking for, not what you have been. Never write a title no employer gave you. ${pluralise(
        headline.length,
        "character",
        "characters",
      )} used of the ${LINKEDIN_HEADLINE_LIMIT} this app counts against.`,
    });
  }

  const headlineGap = (() => {
    if (headline.length === 0) {
      return "Nothing to build a headline from: no target role saved, no skill with finished work or a score at or above the line, and no completed project with a link.";
    }

    if (headline.length > LINKEDIN_HEADLINE_LIMIT) {
      return `The line above runs to ${headline.length} characters, ${
        headline.length - LINKEDIN_HEADLINE_LIMIT
      } over the ${LINKEDIN_HEADLINE_LIMIT} this app counts against. Drop a skill name yourself rather than letting the platform cut it mid-word.`;
    }

    return null;
  })();

  blocks.push({
    key: "headline",
    title: `Headline (${headline.length} of ${LINKEDIN_HEADLINE_LIMIT} characters)`,
    purpose:
      "The line under your name that a recruiter reads before deciding to open the rest of the profile.",
    entries: headlineEntries,
    gaps: [
      ...(headlineGap ? [headlineGap] : []),
      "Your city, your current title and who employs you. This app never asked for any of them, so it writes none. A headline without them reads as a student profile — decide yourself how much that matters.",
    ],
    note: `The ${LINKEDIN_HEADLINE_LIMIT}-character ceiling is what this app was told in October 2026. Nothing here opens LinkedIn, so check the live number before you rely on it.`,
  });

  // --- About --------------------------------------------------------------
  const aboutEntries: MaterialEntry[] = [];

  if (profile) {
    const sources: MaterialSource[] = [
      {
        kind: "profile",
        label: "Your profile",
        detail:
          "The degree, specialization, goal and name you typed into Settings yourself.",
        date: null,
        verified: false,
      },
    ];

    if (assessment) {
      sources.push({
        kind: "assessment",
        label: "Your skills assessment",
        detail:
          "The scores behind every skill named above, from the one assessment stored on this account.",
        date: assessment.completedAt,
        verified: false,
      });
    }

    for (const project of completedProjects) {
      sources.push({
        kind: "project",
        label: `Project: ${project.title}`,
        detail: project.repoUrl
          ? `Completed, with the work at ${project.repoUrl}.`
          : "Completed, but no repository link is stored.",
        date: project.completedAt,
        verified: false,
      });
    }

    aboutEntries.push({
      id: "about-text",
      text: about,
      sources,
      caution:
        "The bracketed line at the end is not a sentence to keep. It marks the one number a reader expects here, which this app cannot supply because it measured nothing.",
    });
  }

  blocks.push({
    key: "about",
    title: `About (${about.length} of ${LINKEDIN_ABOUT_LIMIT} characters)`,
    purpose:
      "The paragraph that tells a reader whether your profile is about the work they are hiring for.",
    entries: aboutEntries,
    gaps: (() => {
      if (!profile) {
        return [
          "No profile is stored, so there is no degree, goal or name to write from. Fill in Settings and this section builds itself.",
        ];
      }

      if (about.length > LINKEDIN_ABOUT_LIMIT) {
        return [
          `The text above runs to ${about.length} characters, ${
            about.length - LINKEDIN_ABOUT_LIMIT
          } over the ${LINKEDIN_ABOUT_LIMIT} this app counts against.`,
        ];
      }

      return [];
    })(),
    note: `Written from ${pluralise(
      paragraphs.length - 1,
      "record-backed paragraph",
      "record-backed paragraphs",
    )} plus the one figure slot this app left empty on purpose.`,
  });

  // --- Work, labelled as what it is ---------------------------------------
  const experienceEntries: MaterialEntry[] = [
    ...completedProjects.map(
      (project): MaterialEntry => ({
        id: `experience-project-${project.id}`,
        text: `Project work — ${project.title}: ${project.problemStatement}${
          project.repoUrl
            ? ` Code: ${project.repoUrl}.`
            : " No repository link is stored."
        }${
          project.deploymentUrl ? ` Live page: ${project.deploymentUrl}.` : ""
        }`,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: `Marked complete, with ${
              project.milestones.filter(
                (milestone) =>
                  milestone.status === "completed" &&
                  milestone.evidenceUrl !== null,
              ).length
            } of ${project.milestones.length} steps carrying a link to the work.`,
            date: project.completedAt,
            verified: false,
          },
        ],
        caution:
          "This is project work you did here, not a job. Do not file it beside an employer or a date range you were never given.",
      }),
    ),
    ...testedExperiments.map(
      (experiment): MaterialEntry => ({
        id: `experience-experiment-${experiment.id}`,
        text: `Self-directed work — ${experiment.title}: ${experiment.brief}${
          experiment.outputUrl ? ` Output: ${experiment.outputUrl}.` : ""
        }`,
        sources: [
          {
            kind: "experiment",
            label: `Career experiment: ${experiment.title}`,
            detail: `You ran it to test the work of a ${
              getCareerTrack(experiment.careerSlug)?.name ?? experiment.careerSlug
            } and rated the fit yourself.`,
            date: experiment.completedAt,
            verified: false,
          },
        ],
        caution:
          "Your own four ratings decided how this role scored for you. It shows direction, not a placement with anyone.",
      }),
    ),
  ];

  blocks.push({
    key: "experience",
    title: `Work to list (${experienceEntries.length}) — none of it employment`,
    purpose:
      "Everything you have done that a reader can open, each line labelled with what it actually was.",
    entries: experienceEntries,
    gaps: [
      ...(experienceEntries.length === 0
        ? [
            "No completed project and no finished career experiment is stored here, so there is nothing to put in this section yet.",
          ]
        : []),
      ...NEVER_FROM_THIS_APP,
    ],
    note:
      experienceEntries.length > 0
        ? "A profile editor asks where each line came from. For every line above the answer is this workspace, which is why each one says project or self-directed instead of a job title."
        : null,
  });

  // --- Skills -------------------------------------------------------------
  const heldBack = summary.heldBack;

  blocks.push({
    key: "skills",
    title: `Skills to add (${ordered.length})`,
    purpose:
      "The skill list a recruiter's search matches against, kept to the skills your own records back.",
    entries: ordered.map(
      (proof): MaterialEntry => ({
        id: `skill-${proof.slug}`,
        text: proof.name,
        sources: [
          {
            kind: proof.strength === "shown" ? "project" : "assessment",
            label:
              proof.strength === "shown"
                ? `Completed project: ${proof.projects[0].title}`
                : "Your skills assessment",
            detail:
              proof.strength === "shown"
                ? CLAIM_STRENGTH_META.shown.why
                : CLAIM_STRENGTH_META.screened.why,
            date:
              proof.strength === "shown"
                ? proof.projects[0].completedAt
                : (assessment?.completedAt ?? null),
            verified: false,
          },
        ],
        caution:
          proof.strength === "screened"
            ? "Nothing you built names this skill. In a skill list it looks identical to one you have used, so keep it only if you would answer a question about it."
            : null,
      }),
    ),
    gaps: [
      ordered.length === 0
        ? `No skill has finished work or a score at or above ${RESUME_LISTABLE_PERCENT} of 100, so there is nothing this app will put in a skill list.`
        : `${pluralise(
            heldBack.length,
            "skill has",
            "skills have",
          )} a record here that stays out of the list, because the only evidence is a score under the line or an answer you rated yourself: ${namedList(
            heldBack.map((proof) => proof.name),
          )}.`,
      "Endorsements. Those come from other accounts pressing a button. This app cannot get you one, and the ones worth having come from people who have read your work.",
    ],
    note: "The order is the one this app uses everywhere: skills with finished work first, then the ones resting on a score, each group by your own percentage.",
  });

  // --- Featured links -----------------------------------------------------
  const linkEntries: MaterialEntry[] = [];

  for (const project of completedProjects) {
    if (project.repoUrl) {
      linkEntries.push({
        id: `link-repo-${project.id}`,
        text: project.repoUrl,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: "The repository link stored on the project record.",
            date: project.completedAt,
            verified: false,
          },
        ],
        caution: null,
      });
    }

    if (project.deploymentUrl) {
      linkEntries.push({
        id: `link-live-${project.id}`,
        text: project.deploymentUrl,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: "The live link stored on the project record.",
            date: project.completedAt,
            verified: false,
          },
        ],
        caution: null,
      });
    }
  }

  for (const experiment of testedExperiments) {
    if (experiment.outputUrl) {
      linkEntries.push({
        id: `link-output-${experiment.id}`,
        text: experiment.outputUrl,
        sources: [
          {
            kind: "experiment",
            label: `Career experiment: ${experiment.title}`,
            detail: "The output link you saved when you finished it.",
            date: experiment.completedAt,
            verified: false,
          },
        ],
        caution: null,
      });
    }
  }

  const projectsWithoutLink = completedProjects.filter(
    (project) => project.repoUrl === null && project.deploymentUrl === null,
  );

  blocks.push({
    key: "featured",
    title: `Links to feature (${linkEntries.length})`,
    purpose:
      "The media block a reader clicks. Every line here is a URL a record in this workspace already stores.",
    entries: linkEntries,
    gaps: [
      ...(linkEntries.length === 0
        ? [
            "No repository, live page or experiment output link is stored anywhere in this workspace, so there is nothing to feature.",
          ]
        : []),
      ...(projectsWithoutLink.length > 0
        ? [
            `${pluralise(
              projectsWithoutLink.length,
              "completed project has",
              "completed projects have",
            )} no link stored at all: ${joinList(
              projectsWithoutLink.map((project) => project.title),
            )}. Store the link and this slot fills itself.`,
          ]
        : []),
      "Writing samples, slides and screenshots. This app stores no files, so it has none to show you.",
    ],
    note: null,
  });

  const entries = blocks.reduce(
    (total, block) => total + block.entries.length,
    0,
  );
  const cautions = blocks.reduce(
    (total, block) =>
      total + block.entries.filter((entry) => entry.caution !== null).length,
    0,
  );
  const gaps = blocks.reduce((total, block) => total + block.gaps.length, 0);
  const headlineCount = platformUsage(headline, LINKEDIN_HEADLINE_LIMIT);
  const aboutCount = platformUsage(about, LINKEDIN_ABOUT_LIMIT);

  return {
    target,
    headline,
    about,
    blocks,
    usage: { headline: headlineCount, about: aboutCount },
    counts: {
      blocks: blocks.length,
      entries,
      cautions,
      gaps,
      listableSkills: ordered.length,
      skillsWithWork: summary.withWork.length,
      links: linkEntries.length,
      paragraphs: paragraphs.length,
    },
    summary: profileSummary({
      target,
      headlineCount,
      aboutCount,
      listable: ordered.length,
      withWork: summary.withWork.length,
      links: linkEntries.length,
      experience: experienceEntries.length,
    }),
  };
}

function profileSummary({
  target,
  headlineCount,
  aboutCount,
  listable,
  withWork,
  links,
  experience,
}: {
  target: DocumentTarget | null;
  headlineCount: PlatformUsage;
  aboutCount: PlatformUsage;
  listable: number;
  withWork: number;
  links: number;
  experience: number;
}): string {
  const skillsLine =
    listable === 0
      ? "No skill in your records is strong enough to list yet"
      : `${pluralise(listable, "skill is", "skills are")} backed enough to list, ${withWork} of ${listable} by finished work`;

  const linksLine =
    links === 0
      ? "no stored link can be featured"
      : `${pluralise(links, "stored link", "stored links")} can be featured`;

  const workLine =
    experience === 0
      ? "the work section is empty"
      : `the ${pluralise(
          experience,
          "line",
          "lines",
        )} in the work section ${
          experience === 1 ? "is" : "are"
        } labelled project work, never employment`;

  return `${
    target ? `For ${target.name}, ` : "With no target role saved, "
  }the headline runs to ${headlineCount.characters} of the ${LINKEDIN_HEADLINE_LIMIT} characters this app counts against and the about text to ${aboutCount.characters} of ${LINKEDIN_ABOUT_LIMIT}. ${skillsLine}; ${linksLine}; ${workLine}.`;
}
