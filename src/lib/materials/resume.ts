import { getCareerTrack } from "@/lib/career/tracks";
import type { Profile } from "@/lib/profile/schema";
import { SKILLS } from "@/lib/skills/catalog";
import { getActiveRoadmap, getLatestAssessment } from "@/lib/workspace/progress";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import {
  summarizeProofs,
  targetRole,
  type DocumentTarget,
  type SkillProof,
} from "@/lib/materials/backing";
import {
  MAX_ENTRY_LENGTH,
  NEVER_FROM_THIS_APP,
  RESUME_LISTABLE_PERCENT,
  type MaterialBlock,
  type MaterialEntry,
  type MaterialSource,
} from "@/lib/materials/types";
import {
  formatMaterialDay,
  joinList,
  materialYear,
  pluralise,
} from "@/lib/materials/text";

export type ResumeBuild = {
  target: DocumentTarget | null;
  blocks: MaterialBlock[];
  counts: {
    blocks: number;
    entries: number;
    cautions: number;
    gaps: number;
    longLines: number;
    listableSkills: number;
    skillsWithWork: number;
  };
  /** One sentence saying what this document can honestly claim today. */
  headline: string;
  /** Skills with no record at all, kept out of the block list so it stays readable. */
  unrecordedSkills: string[];
};

/** Skills recorded from finished work, keyed by the project that produced them. */
function projectSkillNames(workspace: WorkspaceSnapshot) {
  const names = new Map<string, string[]>();
  const bySlug = new Map(SKILLS.map((skill) => [skill.slug, skill.name]));

  for (const record of workspace.evidence) {
    if (record.sourceType !== "project" || !record.sourceId) continue;

    const list = names.get(record.sourceId) ?? [];
    const name = bySlug.get(record.skillSlug) ?? record.skillSlug;

    if (!list.includes(name)) list.push(name);
    names.set(record.sourceId, list);
  }

  return names;
}

function practiceCounts(workspace: WorkspaceSnapshot, interviewId: string) {
  const attempts = workspace.interviewAttempts.filter(
    (attempt) => attempt.interviewId === interviewId,
  );

  return {
    answered: attempts.filter((attempt) => attempt.rating === "covered").length,
    partial: attempts.filter((attempt) => attempt.rating === "partial").length,
    total: attempts.length,
  };
}

export function buildResume({
  workspace,
  profile,
  proofs,
}: {
  workspace: WorkspaceSnapshot;
  profile: Profile | null;
  proofs: SkillProof[];
}): ResumeBuild {
  const summary = summarizeProofs(proofs);
  const target = targetRole(workspace, profile);
  const assessment = getLatestAssessment(workspace.assessments);
  const skillsByProject = projectSkillNames(workspace);

  const shown = summary.withWork;
  const screened = summary.listable.filter((proof) => proof.strength === "screened");
  const heldBack = summary.heldBack;
  const unrecorded = proofs.filter((proof) => proof.strength === "nothing");

  const blocks: MaterialBlock[] = [];

  // --- Header -------------------------------------------------------------
  const headerEntries: MaterialEntry[] = [];

  if (profile) {
    headerEntries.push({
      id: "header-name",
      text: profile.fullName,
      sources: [
        {
          kind: "profile",
          label: "Your profile",
          detail: "The name you typed in Settings.",
          date: null,
          verified: false,
        },
      ],
      caution: null,
    });

    if (target) {
      headerEntries.push({
        id: "header-target",
        text: `Targeting ${target.name}`,
        sources: [
          {
            kind: "profile",
            label: target.from,
            detail: `This app is aiming your documents at ${target.name}.`,
            date: null,
            verified: false,
          },
        ],
        caution:
          "A target role is a claim about what you are aiming at, not about what you have done. Keep it if you would still say it in an interview.",
      });
    }
  }

  blocks.push({
    key: "header",
    title: "Header",
    purpose:
      "Your name and the role you are aiming at, so the reader knows which job this is for in one line.",
    entries: headerEntries,
    gaps: [
      "The way a recruiter reaches you. This app stores the address you signed up with and does not put it on a document for you.",
      ...(target
        ? []
        : [
            "No target role is saved, so this document has no job title to aim at. Pick one on the Career Explorer or in Settings.",
          ]),
    ],
    note: null,
  });

  // --- Skills with work behind them ---------------------------------------
  blocks.push({
    key: "skills-shown",
    title: `Skills with finished work behind them (${shown.length})`,
    purpose:
      "The only skills on this page that a reviewer can ask you to prove and you can answer with a link.",
    entries: shown.map((proof) => ({
      id: `skill-${proof.slug}`,
      text: `${proof.name} — shown by ${joinList(
        proof.projects.map((project) => project.title),
      )}${
        proof.percent === null
          ? ""
          : `, scored ${proof.percent} of 100 on your own assessment`
      }`,
      sources: [
        ...proof.projects.map(
          (project): MaterialSource => ({
            kind: "project",
            label: `Completed project: ${project.title}`,
            detail: project.repoUrl
              ? `You linked the work at ${project.repoUrl}`
              : "Completed, but no repository link is stored for it.",
            date: project.completedAt,
            verified: false,
          }),
        ),
      ],
      caution:
        proof.projects.some((project) => project.repoUrl === null)
          ? "One of these projects has no repository link, so nobody outside this app can open the work. Add the link or do not name it."
          : null,
    })),
    gaps:
      shown.length === 0
        ? [
            `Nothing yet. A skill reaches this section only from a project you completed, which needs every step submitted with the work attached and a repository link. You have ${pluralise(
              workspace.projects.filter(
                (project) => project.status === "completed",
              ).length,
              "completed project",
              "completed projects",
            )} stored here.`,
          ]
        : [],
    note:
      shown.length > 0
        ? `These ${shown.length} ${
            shown.length === 1 ? "skill is" : "skills are"
          } backed by work you finished inside this app. The projects themselves are described in the project section below.`
        : null,
  });

  // --- Skills scored above the line, no work ------------------------------
  blocks.push({
    key: "skills-screened",
    title: `Skills your assessment scored at ${RESUME_LISTABLE_PERCENT} or above, with no finished work named (${screened.length})`,
    purpose:
      "Knowledge a short scored check put above the line this app lists at. Honest to write, but a reviewer may ask you to demonstrate it on the spot.",
    entries: screened.map((proof) => ({
      id: `skill-${proof.slug}`,
      text: `${proof.name} — ${proof.percent} of 100 on the skills assessment in this app`,
      sources: [
        {
          kind: "assessment",
          label: "Your skills assessment",
          detail: `Scored ${proof.percent} of 100 on the questions covering ${proof.name}.`,
          date: assessment?.completedAt ?? null,
          verified: false,
        },
      ],
      caution:
        "This is a scored knowledge check you took on your own, not a proctored exam and not a project. Write it only if you can explain it out loud without notes.",
    })),
    gaps:
      screened.length === 0
        ? [
            assessment
              ? `No skill of yours sits between ${RESUME_LISTABLE_PERCENT} and the top without finished work behind it. Either the skill is already in the section above, or your score is under the line.`
              : "No assessment has been taken, so there is no score to list.",
          ]
        : [],
    note: `The line is ${RESUME_LISTABLE_PERCENT} of 100, which is the same mark the posting comparison on the interview page treats as supported.`,
  });

  // --- Skills held back ---------------------------------------------------
  blocks.push({
    key: "skills-held-back",
    title: `Skills this app will not put on this document (${heldBack.length})`,
    purpose:
      "These have a record, but the record is weak: a score under the line, or a practice answer only you rated. Writing them down is how a claim falls over in an interview.",
    entries: heldBack.map((proof) => ({
      id: `held-${proof.slug}`,
      text: `Do not write ${proof.name}. ${proof.reason}`,
      sources: [
        ...proof.interviews.map((interview): MaterialSource => ({
          kind: "interview",
          label: `Practice interview: ${interview.label}`,
          detail: "You rated your own answer as answered. Nobody outside this app checked it.",
          date: interview.completedAt,
          verified: false,
        })),
      ],
      caution: proof.nextStep,
    })),
    gaps:
      unrecorded.length > 0
        ? [
            `${unrecorded.length} of the ${SKILLS.length} skills this app scores have no record either way — no assessment answer, no finished work, no practice interview. None of them can be written down.`,
          ]
        : [],
    note: null,
  });

  // --- Project work -------------------------------------------------------
  const completedProjects = workspace.projects.filter(
    (project) => project.status === "completed",
  );

  blocks.push({
    key: "projects",
    title: `Project work (${completedProjects.length})`,
    purpose:
      "What you built, in the words your own records hold, with the link a reviewer can open.",
    entries: completedProjects.map((project) => {
      const linked = project.milestones.filter(
        (milestone) =>
          milestone.status === "completed" && milestone.evidenceUrl !== null,
      ).length;
      const skillNames = skillsByProject.get(project.id) ?? [];

      return {
        id: `project-${project.id}`,
        text: `${project.title} — ${project.problemStatement} Steps completed with the work attached: ${linked} of ${project.milestones.length}.${
          project.repoUrl ? ` Repository: ${project.repoUrl}.` : ""
        }${
          project.deploymentUrl ? ` Live link: ${project.deploymentUrl}.` : ""
        }${skillNames.length > 0 ? ` Skills this app recorded from it: ${joinList(skillNames)}.` : ""}`,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: `Marked complete${
              project.completedAt ? ` on ${formatMaterialDay(project.completedAt) ?? "a stored date"}` : ""
            }, with ${linked} of ${project.milestones.length} steps carrying a link to the work.`,
            date: project.completedAt,
            verified: false,
          },
        ],
        caution:
          "This states the question the project set out to answer, not a result. Your records hold no measured outcome, so none is claimed here.",
      };
    }),
    gaps:
      completedProjects.length === 0
        ? [
            "No project has been completed here yet, so there is no build to describe. Work in progress is listed in the next section instead.",
          ]
        : [],
    note:
      completedProjects.length > 0
        ? "Completion in this app means every step was submitted with the work attached and a repository link was stored. It does not mean anyone reviewed the result."
        : null,
  });

  // --- Open projects ------------------------------------------------------
  const openProjects = workspace.projects.filter(
    (project) => project.status !== "completed",
  );

  blocks.push({
    key: "projects-open",
    title: `Projects still open (${openProjects.length}) — not on the document`,
    purpose:
      "Work you have started but not finished. Putting it on a résumé as though it were complete is the one thing this app will not help you do.",
    entries: openProjects.map((project) => {
      const openSteps = project.milestones.filter(
        (milestone) => milestone.status !== "completed",
      );
      const missing: string[] = [];

      if (openSteps.length > 0) {
        missing.push(
          `${openSteps.length} step${
            openSteps.length === 1 ? "" : "s"
          } not submitted (${openSteps
            .slice(0, 2)
            .map((milestone) => milestone.title)
            .join(", ")}${openSteps.length > 2 ? ", and the rest" : ""})`,
        );
      }

      if (!project.repoUrl) missing.push("no repository link stored");

      return {
        id: `open-${project.id}`,
        text: `${project.title} (${project.status === "in_progress" ? "in progress" : project.status === "paused" ? "paused" : "planned"}): ${joinList(
          missing,
        )}.`,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: `${project.milestones.filter((m) => m.status === "completed").length} of ${project.milestones.length} steps submitted.`,
            date: project.startedAt,
            verified: false,
          },
        ],
        caution: missing.length
          ? `Finish ${missing[0]} and it moves into the section above on its own.`
          : null,
      };
    }),
    gaps:
      openProjects.length === 0
        ? ["Nothing is half-finished, so there is nothing this section needs to keep off the document."]
        : [],
    note: null,
  });

  // --- Interview practice -------------------------------------------------
  const finishedInterviews = workspace.mockInterviews.filter(
    (interview) => interview.completedAt !== null,
  );

  blocks.push({
    key: "practice",
    title: `Practice interviews you finished (${finishedInterviews.length})`,
    purpose:
      "Rehearsal, not experience. This is the section that most often gets written as though it were a job, so it is kept separate and labelled.",
    entries: finishedInterviews.map((interview) => {
      const counts = practiceCounts(workspace, interview.id);

      return {
        id: `practice-${interview.id}`,
        text: `Practised ${interview.label}: of the ${counts.total} questions you answered, you rated ${counts.answered} as answered, ${counts.partial} as part-answered, and the rest as ones you could not answer.`,
        sources: [
          {
            kind: "interview",
            label: `Practice interview: ${interview.label}`,
            detail: `Finished${
              interview.completedAt
                ? ` on ${formatMaterialDay(interview.completedAt) ?? "a stored date"}`
                : ""
            }. You rated every answer yourself.`,
            date: interview.completedAt,
            verified: false,
          },
        ],
        caution:
          "Nobody outside this app heard these answers. Put this on a document only as practice, never as work experience.",
      };
    }),
    gaps:
      finishedInterviews.length === 0
        ? [
            "No practice interview has been finished here, so there is no rehearsal to report. An open interview counts as nothing until every question in it is rated.",
          ]
        : [],
    note: null,
  });

  // --- Tested career work -------------------------------------------------
  const testedExperiments = workspace.careerExperiments.filter(
    (experiment) => experiment.status === "completed",
  );

  blocks.push({
    key: "development",
    title: `Career work you tried and linked (${testedExperiments.length})`,
    purpose:
      "Short pieces of real work you ran to test whether a role suits you, each with the output you linked. They show direction and initiative; they are not employment.",
    entries: testedExperiments.map((experiment) => ({
      id: `experiment-${experiment.id}`,
      text: `Tested the work of a ${
        getCareerTrack(experiment.careerSlug)?.name ?? experiment.careerSlug
      }: ${experiment.title}.${
        experiment.outputUrl ? ` Output: ${experiment.outputUrl}.` : ""
      }`,
      sources: [
        {
          kind: "experiment",
          label: `Career experiment: ${experiment.title}`,
          detail: experiment.outputUrl
            ? `You linked the work you produced at ${experiment.outputUrl}.`
            : "No output link is stored.",
          date: experiment.completedAt,
          verified: false,
        },
      ],
      caution:
        "Your own four ratings decided how this role scored for fit. Those ratings say what you liked, not how well you did the work.",
    })),
    gaps:
      testedExperiments.length === 0
        ? [
            "No career experiment has been finished with a link to the work, so nothing here shows you testing a role on real tasks.",
          ]
        : [],
    note: null,
  });

  // --- Education ----------------------------------------------------------
  const educationEntries: MaterialEntry[] = [];

  if (profile?.degree) {
    const detail = [
      profile.degree,
      profile.degreeSpecialization || null,
      materialYear(profile.graduationYear ? String(profile.graduationYear) : null),
    ]
      .filter(Boolean)
      .join(", ");

    educationEntries.push({
      id: "education-degree",
      text: detail,
      sources: [
        {
          kind: "profile",
          label: "Your profile",
          detail:
            "The degree, specialization and graduation year you typed into Settings yourself.",
          date: null,
          verified: false,
        },
      ],
      caution:
        "You typed this; this app has not seen a transcript and cannot confirm any of it. The school or university name was never asked for, so add it yourself.",
    });
  }

  blocks.push({
    key: "education",
    title: "Education",
    purpose:
      "What you studied, in the words you gave this app when you set your profile up.",
    entries: educationEntries,
    gaps: [
      ...(educationEntries.length === 0
        ? ["No degree is stored on your profile, so there is nothing to write here."]
        : []),
      "The name of your institution, your grades, and whether the award has been conferred. This app never asked for any of it and will not guess.",
    ],
    note: profile?.yearOfStudy
      ? `Your profile also records that you are a ${profile.yearOfStudy.toLowerCase()}. A résumé normally states the award, not the year you are in.`
      : null,
  });

  // --- Employment ---------------------------------------------------------
  blocks.push({
    key: "employment",
    title: "Employment history",
    purpose:
      "The section every recruiter looks for first, and the one this app cannot write a line of.",
    entries: [],
    gaps: [...NEVER_FROM_THIS_APP],
    note: "Write this section yourself, in your own words, from records you hold outside this app.",
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
  const gaps = blocks.reduce(
    (total, block) => total + block.gaps.length,
    0,
  );
  const longLines = blocks.reduce(
    (total, block) =>
      total +
      block.entries.filter((entry) => entry.text.length > MAX_ENTRY_LENGTH)
        .length,
    0,
  );

  const active = getActiveRoadmap(workspace.roadmaps);

  return {
    target,
    blocks,
    counts: {
      blocks: blocks.length,
      entries,
      cautions,
      gaps,
      longLines,
      listableSkills: summary.listable.length,
      skillsWithWork: shown.length,
    },
    headline: buildHeadline({
      target,
      shown: shown.length,
      screened: screened.length,
      completedProjects: completedProjects.length,
      testedExperiments: testedExperiments.length,
      finishedInterviews: finishedInterviews.length,
      hasAssessment: Boolean(assessment),
      hasRoadmap: Boolean(active),
      unrecorded: unrecorded.length,
      skillTotal: SKILLS.length,
    }),
    unrecordedSkills: unrecorded.map((proof) => proof.name),
  };
}

function buildHeadline({
  target,
  shown,
  screened,
  completedProjects,
  testedExperiments,
  finishedInterviews,
  hasAssessment,
  hasRoadmap,
  unrecorded,
  skillTotal,
}: {
  target: DocumentTarget | null;
  shown: number;
  screened: number;
  completedProjects: number;
  testedExperiments: number;
  finishedInterviews: number;
  hasAssessment: boolean;
  hasRoadmap: boolean;
  unrecorded: number;
  skillTotal: number;
}): string {
  const roleLine = target
    ? `For ${target.name}, `
    : "With no target role saved, ";

  if (completedProjects === 0 && !hasAssessment) {
    return `${roleLine}this document has nothing to say yet: no assessment score and no completed project is stored here. Take the assessment and finish one project, and these sections fill themselves.`;
  }

  const middle =
    completedProjects > 0
      ? `${pluralise(completedProjects, "completed project", "completed projects")} and ${pluralise(
          shown,
          "skill",
          "skills",
        )} with finished work behind them`
      : `no completed project yet, so ${pluralise(
          screened,
          "skill rests",
          "skills rest",
        )} on a scored check alone`;

  const tail =
    unrecorded > 0
      ? `. ${unrecorded} of the ${skillTotal} skills this app scores have no record at all.`
      : ".";

  const extras = [
    testedExperiments > 0
      ? `${pluralise(testedExperiments, "role tested", "roles tested")} with the work linked`
      : null,
    finishedInterviews > 0
      ? `${pluralise(finishedInterviews, "practice interview finished", "practice interviews finished")}, self-rated`
      : null,
    hasRoadmap ? "an active study plan" : null,
  ].filter((item): item is string => item !== null);

  return `${roleLine}this document can point at ${middle}${
    extras.length > 0 ? `, plus ${joinList(extras)}` : ""
  }${tail}`;
}
