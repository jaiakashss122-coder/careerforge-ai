import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import type { ProjectRecord } from "@/lib/projects/types";
import {
  PROJECT_LEVEL_META,
  type ProjectMilestoneRecord,
} from "@/lib/projects/types";
import { getProjectTemplate } from "@/lib/projects/templates";
import { SKILLS } from "@/lib/skills/catalog";
import {
  PORTFOLIO_NOT_IN_RECORDS,
  type MaterialBlock,
  type MaterialEntry,
  type MaterialSource,
} from "@/lib/materials/types";
import { formatMaterialDay, joinList, pluralise } from "@/lib/materials/text";

/**
 * The only two links a project record stores. A portfolio check can be reached
 * by a reviewer through one of them, or it cannot — everything else this app
 * reports as something it has no way to see.
 */
const LIVE_LINK_WORDS = [
  "deployed",
  "deploy",
  "live",
  "link works",
  "demo",
] as const;

const REPOSITORY_LINK_WORDS = [
  "readme",
  "repository",
  "clone",
  "committed",
  "version control",
  "published",
  "documented",
  "continuous integration",
  "tests pass",
  "model card",
  "seed",
  "command",
] as const;

export type PortfolioCheckState = "reachable" | "no-link" | "not-checkable";

export type PortfolioCheck = {
  projectId: string;
  projectTitle: string;
  /** The date the project record carries, kept so provenance names a real record. */
  completedAt: string | null;
  item: string;
  state: PortfolioCheckState;
  /** Which stored link the rule tried to use, when it tried at all. */
  needs: "live" | "repository" | null;
  /** The URL that would let a reviewer check it, or null when none is stored. */
  link: string | null;
  detail: string;
};

export type PortfolioBuild = {
  blocks: MaterialBlock[];
  checks: PortfolioCheck[];
  counts: {
    blocks: number;
    entries: number;
    cautions: number;
    gaps: number;
    projects: number;
    completedProjects: number;
    projectsWithTemplate: number;
    checks: number;
    reachable: number;
    noLink: number;
    notCheckable: number;
    linksStored: number;
  };
  summary: string;
};

/**
 * Which of the two stored links a checklist item depends on, decided by the
 * words in the item. A live link is tried first because an item that mentions a
 * deployment usually names the repository too, and the repository is the one
 * this app can never open anyway.
 */
export function checkNeeds(item: string): "live" | "repository" | null {
  const text = item.toLowerCase();

  if (LIVE_LINK_WORDS.some((word) => text.includes(word))) return "live";
  if (REPOSITORY_LINK_WORDS.some((word) => text.includes(word))) {
    return "repository";
  }

  return null;
}

function linksStored(project: ProjectRecord) {
  return [project.repoUrl, project.deploymentUrl].filter(
    (link): link is string => link !== null,
  );
}

function stepsWithWork(milestones: ProjectMilestoneRecord[]) {
  return milestones.filter(
    (milestone) => milestone.status === "completed" && milestone.evidenceUrl !== null,
  );
}

function skillNamesFor(workspace: WorkspaceSnapshot, projectId: string) {
  const bySlug = new Map(SKILLS.map((skill) => [skill.slug, skill.name]));

  return workspace.evidence
    .filter(
      (record) => record.sourceType === "project" && record.sourceId === projectId,
    )
    .map((record) => bySlug.get(record.skillSlug) ?? record.skillSlug);
}

/**
 * One project's checklist, read against the links its own record stores. An open
 * project gets no checks: a portfolio shows finished work, and this app will not
 * dress up a half-built one as reviewable.
 */
function projectChecks(
  workspace: WorkspaceSnapshot,
  project: ProjectRecord,
): PortfolioCheck[] {
  const template = getProjectTemplate(project.templateSlug);

  if (!template) return [];

  return template.portfolioChecklist.map((item) => {
    const needs = checkNeeds(item);
    const link =
      needs === null ? null : needs === "live" ? project.deploymentUrl : project.repoUrl;

    if (needs === null) {
      return {
        projectId: project.id,
        projectTitle: project.title,
        completedAt: project.completedAt,
        item,
        state: "not-checkable" as PortfolioCheckState,
        needs,
        link: null,
        detail:
          "This is about what is inside the work, and nothing here opens a link to look.",
      };
    }

    if (link === null) {
      return {
        projectId: project.id,
        projectTitle: project.title,
        completedAt: project.completedAt,
        item,
        state: "no-link" as PortfolioCheckState,
        needs,
        link: null,
        detail: `No ${
          needs === "live" ? "live" : "repository"
        } link is stored on this project, so a reviewer has nowhere to check it.`,
      };
    }

    return {
      projectId: project.id,
      projectTitle: project.title,
      completedAt: project.completedAt,
      item,
      state: "reachable" as PortfolioCheckState,
      needs,
      link,
      detail: `A reviewer can open the ${
        needs === "live" ? "live" : "repository"
      } link stored on this project at ${link}.`,
    };
  });
}

function checkEntry(check: PortfolioCheck): MaterialEntry {
  const sources: MaterialSource[] = [
    {
      kind: "project",
      label: `Project: ${check.projectTitle}`,
      detail: check.detail,
      date: check.completedAt,
      verified: false,
    },
  ];

  return {
    id: `check-${check.projectId}-${check.item.slice(0, 12)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`,
    text: `${check.projectTitle}: ${check.item}`,
    sources,
    caution:
      check.state === "reachable"
        ? "The link is stored; nothing here opened it. Whether the work actually does this is yours to check before you claim it."
        : null,
  };
}

export function buildPortfolio({
  workspace,
}: {
  workspace: WorkspaceSnapshot;
}): PortfolioBuild {
  const completed = workspace.projects.filter(
    (project) => project.status === "completed",
  );
  const open = workspace.projects.filter(
    (project) => project.status !== "completed",
  );
  const withTemplate = completed.filter(
    (project) => getProjectTemplate(project.templateSlug) !== null,
  );
  const custom = completed.filter(
    (project) => getProjectTemplate(project.templateSlug) === null,
  );

  const checks = completed.flatMap((project) => projectChecks(workspace, project));
  const reachable = checks.filter((check) => check.state === "reachable");
  const noLink = checks.filter((check) => check.state === "no-link");
  const notCheckable = checks.filter(
    (check) => check.state === "not-checkable",
  );

  const links = workspace.projects.flatMap((project) => linksStored(project));
  const blocks: MaterialBlock[] = [];

  // --- What a portfolio would show today ----------------------------------
  blocks.push({
    key: "portfolio-overview",
    title: `What a reviewer could open (${links.length} links across ${workspace.projects.length} projects)`,
    purpose:
      "The finished work you have, with the link each one carries and the steps that have the work attached.",
    entries: completed.map((project) => {
      const attached = stepsWithWork(project.milestones);
      const names = skillNamesFor(workspace, project.id);
      const template = getProjectTemplate(project.templateSlug);
      const level = template ? PROJECT_LEVEL_META[template.level].label : null;

      return {
        id: `overview-${project.id}`,
        text: `${project.title}${
          level ? ` (${level})` : ""
        } — ${project.problemStatement} Finished ${
          project.completedAt
            ? `on ${formatMaterialDay(project.completedAt) ?? "a stored date"}`
            : "with no completion date stored"
        }. Steps with the work attached: ${attached.length} of ${
          project.milestones.length
        }.${linksStored(project).length > 0 ? ` Links: ${joinList(linksStored(project))}.` : " No link is stored."}${
          names.length > 0 ? ` Skills recorded from it: ${joinList(names)}.` : ""
        }`,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: `Marked complete in this workspace. ${
              template
                ? `Built from the ${template.slug} plan, which sets ${template.portfolioChecklist.length} things a portfolio should show.`
                : "Started from your own description, so no plan and no checklist exists for it."
            }`,
            date: project.completedAt,
            verified: false,
          },
          ...attached.map(
            (milestone): MaterialSource => ({
              kind: "milestone",
              label: `Step: ${milestone.title}`,
              detail: `You attached ${milestone.evidenceUrl} when you submitted it.`,
              date: milestone.completedAt,
              verified: false,
            }),
          ),
        ],
        caution:
          linksStored(project).length === 0
            ? "Nothing here can be opened by anyone outside this app. A portfolio entry without a link is a paragraph, not proof."
            : "This states the question you set out to answer, not a result. No measurement of this work is stored here.",
      };
    }),
    gaps: [
      ...(completed.length === 0
        ? [
            "No project is finished here, so a portfolio has nothing to show. Projects still open are listed in their own section below rather than dressed up as finished work.",
          ]
        : []),
      ...(custom.length > 0
        ? [
            `${pluralise(
              custom.length,
              "finished project was",
              "finished projects were",
            )} started from your own description, so this app has no checklist for them: ${joinList(
              custom.map((project) => project.title),
            )}. Only the projects built from a stored plan get their items read below.`,
          ]
        : []),
    ],
    note: null,
  });

  // --- Checks a link reaches ----------------------------------------------
  blocks.push({
    key: "checks-reachable",
    title: `Portfolio checks a reviewer can open (${reachable.length})`,
    purpose:
      "Items that name a live page or a repository, where your project record already stores that link.",
    entries: reachable.map(checkEntry),
    gaps:
      reachable.length === 0
        ? [
            "Not one check has a stored link behind it, so a reviewer has nothing to open for any of them.",
          ]
        : [],
    note:
      "The rule is small and stated: an item that uses the words deployed, live, demo or link works is matched to your project's live link, and one that uses README, repository, clone, committed, published, documented or similar is matched to the repository link. A matching link means a reviewer can look — it does not mean this app looked.",
  });

  // --- Checks with nothing behind them ------------------------------------
  blocks.push({
    key: "checks-no-link",
    title: `Portfolio checks with no link stored (${noLink.length})`,
    purpose:
      "The items that turn on a link this workspace does not hold. Each one is a thing to do, not a thing to write around.",
    entries: noLink.map((check) => ({
      ...checkEntry(check),
      text: `${check.projectTitle}: ${check.item} — ${check.detail}`,
      caution:
        check.needs === "live"
          ? "Add the live address to the project record, or say plainly that this work was never deployed."
          : "Add the repository address to the project record. Without it, this work cannot be shown to anyone.",
    })),
    gaps:
      noLink.length === 0
        ? [
            "Every link-shaped check on finished work has its link stored, so nothing needs fixing in this section.",
          ]
        : [],
    note: null,
  });

  // --- Checks this app cannot see -----------------------------------------
  blocks.push({
    key: "checks-unseeable",
    title: `Portfolio checks this app cannot see (${notCheckable.length})`,
    purpose:
      "Items that turn on what is inside the work — how it is written, what it says, whether it runs. Nothing here opens a link, so these stay yours to judge.",
    entries: notCheckable.map((check) => ({
      ...checkEntry(check),
      text: `${check.projectTitle}: ${check.item} — ${check.detail}`,
    })),
    gaps: [
      "How many of these are actually met. This app reports the list, not the answers.",
    ],
    note: "An item lands here when it names neither link. That is not a failure — it means the check needs a person, and the person is you.",
  });

  // --- Open projects ------------------------------------------------------
  blocks.push({
    key: "portfolio-open",
    title: `Projects not ready to show (${open.length})`,
    purpose:
      "Work that is planned, in progress or paused. It is kept out of a portfolio until it is finished, because showing half a build as a finished one is the fastest way to lose a reader.",
    entries: open.map((project) => {
      const unfinished = project.milestones.filter(
        (milestone) => milestone.status !== "completed",
      );

      return {
        id: `open-${project.id}`,
        text: `${project.title} is ${
          project.status === "in_progress"
            ? "in progress"
            : project.status === "paused"
              ? "paused"
              : "only planned"
        }: ${pluralise(
          unfinished.length,
          "step",
          "steps",
        )} of ${
          project.milestones.length
        } still unsubmitted${
          project.repoUrl ? "" : ", and no repository link is stored"
        }.`,
        sources: [
          {
            kind: "project",
            label: `Project: ${project.title}`,
            detail: `${
              project.milestones.length - unfinished.length
            } of ${project.milestones.length} steps submitted.`,
            date: project.startedAt,
            verified: false,
          },
        ],
        caution:
          unfinished.length === 0
            ? "Every step is submitted. Mark the project complete and it moves into the section above on its own."
            : null,
      };
    }),
    gaps:
      open.length === 0
        ? [
            "Nothing is half-finished, so there is no work being kept off the portfolio.",
          ]
        : [],
    note: null,
  });

  // --- What no record can supply ------------------------------------------
  blocks.push({
    key: "portfolio-gaps",
    title: "What a portfolio needs that this app cannot supply",
    purpose:
      "The parts of a portfolio page no record in this workspace touches. Read this before deciding a thin section is the app's fault.",
    entries: [],
    gaps: [...PORTFOLIO_NOT_IN_RECORDS],
    note: "Write these yourself, from what you have in front of you, and change nothing here to make them fit.",
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

  return {
    blocks,
    checks,
    counts: {
      blocks: blocks.length,
      entries,
      cautions,
      gaps,
      projects: workspace.projects.length,
      completedProjects: completed.length,
      projectsWithTemplate: withTemplate.length,
      checks: checks.length,
      reachable: reachable.length,
      noLink: noLink.length,
      notCheckable: notCheckable.length,
      linksStored: links.length,
    },
    summary: `${pluralise(
      completed.length,
      "finished project",
      "finished projects",
    )} in this workspace, carrying ${pluralise(
      links.length,
      "stored link",
      "stored links",
    )}. Of the ${pluralise(
      checks.length,
      "check",
      "checks",
    )} their plans set, ${reachable.length} can be opened by a reviewer, ${
      noLink.length
    } ${noLink.length === 1 ? "has" : "have"} no link stored behind them, and ${
      notCheckable.length
    } ${
      notCheckable.length === 1 ? "asks" : "ask"
    } about what is inside the work, which nothing here can see.`,
  };
}
