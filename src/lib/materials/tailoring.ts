import type { JobApplicationRecord } from "@/lib/interview/types";
import {
  buildGapReport,
  readJobDescription,
  type GapReport,
  type JobDescriptionReading,
} from "@/lib/interview/description";
import { SKILLS } from "@/lib/skills/catalog";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import {
  gapMaps,
  isListable,
  proofBySlug,
  proofSources,
  type SkillProof,
} from "@/lib/materials/backing";
import {
  CLAIM_STRENGTH_META,
  RESUME_LISTABLE_PERCENT,
  type MaterialBlock,
  type MaterialEntry,
} from "@/lib/materials/types";
import { joinList, pluralise } from "@/lib/materials/text";

export type TailoringTarget = {
  /** Where the posting text came from, in the words a reader can act on. */
  label: string;
  application: JobApplicationRecord | null;
};

export type PostingTailoring = {
  reading: JobDescriptionReading;
  report: GapReport;
  target: TailoringTarget;
  blocks: MaterialBlock[];
  counts: {
    blocks: number;
    entries: number;
    cautions: number;
    gaps: number;
    postingSkills: number;
    required: number;
    preferred: number;
    claimable: number;
    heldBack: number;
    untested: number;
    projectsRanked: number;
  };
  summary: string;
};

function targetFor(
  application: JobApplicationRecord | null,
  reading: JobDescriptionReading,
): TailoringTarget {
  if (application) {
    return {
      label: `${application.roleTitle} at ${application.company}`,
      application,
    };
  }

  return {
    label:
      reading.roles.length > 0
        ? `A posting this app read as ${joinList(
            reading.roles.map((role) => role.name),
          )} — not saved to your applications`
        : "A posting you pasted without saving it",
    application: null,
  };
}

/** How many of a project's recorded skills the posting names. */
function overlapWith(
  workspace: WorkspaceSnapshot,
  project: WorkspaceSnapshot["projects"][number],
  wanted: Set<string>,
) {
  const slugs = workspace.evidence
    .filter(
      (record) => record.sourceType === "project" && record.sourceId === project.id,
    )
    .map((record) => record.skillSlug);

  return [...new Set(slugs)].filter((slug) => wanted.has(slug));
}

export function tailorToPosting({
  workspace,
  proofs,
  postingText,
  application = null,
}: {
  workspace: WorkspaceSnapshot;
  proofs: SkillProof[];
  postingText: string;
  application?: JobApplicationRecord | null;
}): PostingTailoring {
  const reading = readJobDescription(postingText);
  const report = buildGapReport({
    reading,
    ...gapMaps(workspace),
  });

  const bySlug = proofBySlug(proofs);
  const wantedSlugs = new Set(reading.skills.map((skill) => skill.slug));
  const target = targetFor(application, reading);
  const blocks: MaterialBlock[] = [];

  // --- What you may write --------------------------------------------------
  const claimable = report.positions.filter((position) =>
    isListable(bySlug.get(position.slug)?.strength ?? "nothing"),
  );
  const heldBack = report.positions.filter((position) => {
    const proof = bySlug.get(position.slug);

    return !proof || !isListable(proof.strength);
  });
  blocks.push({
    key: "tailor-claim",
    title: `Skills you can write for this posting (${claimable.length} of ${report.total} it names)`,
    purpose:
      "Each of these is one the posting asks for and your own records back. This is the list to build the application around.",
    entries: claimable.map(
      (position): MaterialEntry => {
        const proof = bySlug.get(position.slug)!;

        return {
          id: `claim-${position.slug}`,
          text: `${position.name} (${position.wanted}) — ${
            CLAIM_STRENGTH_META[proof.strength].onTheDocument
          }`,
          sources: [
            {
              kind: "application",
              label: "The posting you pasted",
              detail:
                position.quoted.length > 0
                  ? `Found in the words "${joinList(position.quoted)}".`
                  : "Matched by the reader, which quoted nothing.",
              date: target.application?.createdAt ?? null,
              verified: false,
            },
            ...proofSources(proof),
          ],
          caution:
            proof.strength === "screened"
              ? `Nothing you built names ${position.name}. A reviewer reading this application will ask you to demonstrate it, and the only thing behind it is your own ${proof.percent} of 100.`
              : null,
        };
      },
    ),
    gaps:
      claimable.length === 0
        ? [
            report.total === 0
              ? `The reader found none of the ${SKILLS.length} skills this app scores in the text you pasted, so there is nothing to compare. Paste the requirements, not only the title.`
              : `None of the ${report.total} skills this posting names has finished work or a score at or above ${RESUME_LISTABLE_PERCENT} of 100 behind it. On this application you would be writing claims you cannot back.`,
          ]
        : [],
    note: null,
  });

  // --- What you must not ----------------------------------------------------
  blocks.push({
    key: "tailor-cannot",
    title: `Skills this posting asks for that you cannot back (${heldBack.length})`,
    purpose:
      "The gap a reader would find. Each line says what the posting wants, in its own words, and what your records actually hold.",
    entries: heldBack.map(
      (position): MaterialEntry => {
        const proof = bySlug.get(position.slug);

        if (!proof) {
          return {
            id: `cannot-${position.slug}`,
            text: `${position.name} (${position.wanted}) — this app scores ${SKILLS.length} skills and this one is not among them, so nothing here can check it either way.`,
            sources: [
              {
                kind: "application",
                label: "The posting you pasted",
                detail:
                  position.quoted.length > 0
                    ? `Found in the words "${joinList(position.quoted)}".`
                    : "Matched by the reader, which quoted nothing.",
                date: target.application?.createdAt ?? null,
                verified: false,
              },
            ],
            caution: null,
          };
        }

        return {
          id: `cannot-${position.slug}`,
          text: `${position.name} (${position.wanted}) — ${proof.reason}`,
          sources: [
            {
              kind: "application",
              label: "The posting you pasted",
              detail:
                position.quoted.length > 0
                  ? `Found in the words "${joinList(position.quoted)}".`
                  : "Matched by the reader, which quoted nothing.",
              date: target.application?.createdAt ?? null,
              verified: false,
            },
            ...proofSources(proof),
          ],
          caution:
            proof.nextStep ??
            "This is as strong as your record gets, and a reviewer would still be taking your word for it.",
        };
      },
    ),
    gaps: [
      report.note,
      ...(report.positions.length === 0
        ? [
            "With no skills matched, the rest of this comparison is empty. That is a fault in what was pasted, not a verdict on you.",
          ]
        : []),
    ],
    note: report.focus,
  });

  // --- Which project leads -------------------------------------------------
  const completed = workspace.projects
    .filter((project) => project.status === "completed")
    .map((project) => ({
      project,
      shared: overlapWith(workspace, project, wantedSlugs),
    }))
    .sort((a, b) => {
      if (b.shared.length !== a.shared.length) {
        return b.shared.length - a.shared.length;
      }

      return (
        new Date(b.project.completedAt ?? b.project.updatedAt).getTime() -
        new Date(a.project.completedAt ?? a.project.updatedAt).getTime()
      );
    });

  const bySkill = new Map(
    proofs.map((proof) => [proof.slug, proof.name] as const),
  );

  blocks.push({
    key: "tailor-projects",
    title: `Which project to lead with (${completed.length})`,
    purpose:
      "Finished work, ordered by how many of this posting's skills your own records connect to it. The first line of an application is the scarce thing, not the last.",
    entries: completed.map(({ project, shared }, index) => ({
      id: `project-${project.id}`,
      text: `${index + 1}. ${project.title} — names ${
        shared.length > 0
          ? `${pluralise(shared.length, "skill", "skills")} this posting asks for (${joinList(
              shared.map((slug) => bySkill.get(slug) ?? slug),
            )})`
          : "none of the skills this posting asks for"
      }.${project.repoUrl ? ` Code: ${project.repoUrl}.` : " No repository link is stored."}`,
      sources: [
        {
          kind: "project",
          label: `Project: ${project.title}`,
          detail: `Completed${
            project.completedAt ? ` on ${project.completedAt}` : ""
          }, and ${
            shared.length
          } of its recorded skills appear in this posting.`,
          date: project.completedAt,
          verified: false,
        },
      ],
      caution:
        shared.length === 0
          ? "Leading with this uses your first line on something this reader is not asking for. Put it lower, or write it only if the story is better than the match."
          : project.repoUrl === null
            ? "This is your best match and a reviewer cannot open any of it. Store the repository link before you send anything."
            : null,
    })),
    gaps:
      completed.length === 0
        ? [
            "No finished project is stored, so the posting has nothing of yours to be matched against. A strong match on skills with no work behind it is still a claim about a test you took alone.",
          ]
        : [],
    note: null,
  });

  // --- The role, as the posting words it -----------------------------------
  blocks.push({
    key: "tailor-role",
    title: `The role this app read (${reading.roles.length})`,
    purpose:
      "The job families whose words appeared in the text, so you can see what the reader thought it was asking for.",
    entries: reading.roles.map((role) => ({
      id: `role-${role.slug}`,
      text: `${role.name} (in the ${role.family} work) — matched on "${joinList(
        role.quoted,
      )}"`,
      sources: [
        {
          kind: "application",
          label: "The posting you pasted",
          detail: `These exact words appear in the ${reading.characterCount} characters you pasted.`,
          date: target.application?.createdAt ?? null,
          verified: false,
        },
      ],
      caution:
        "This is the app matching words, not checking that the role suits you or exists.",
    })),
    gaps: [
      ...(reading.roles.length === 0
        ? [
            "No job family this app knows appeared in the text, so nothing here confirms what the role even is.",
          ]
        : []),
      "Whether the posting is real, still open, or open to you. Nothing here opened a link or contacted anyone.",
      "Whether you meet the seniority or years-of-experience line. This app does not turn those words into a verdict.",
    ],
    note: null,
  });

  // --- Words deliberately not used ----------------------------------------
  blocks.push({
    key: "tailor-not-used",
    title: `What the reader saw and did not use (${reading.ignored.length})`,
    purpose:
      "Lines a posting usually carries that this app refuses to turn into anything about you.",
    entries: [],
    gaps: [
      ...(reading.ignored.length > 0
        ? reading.ignored
        : ["Nothing about pay, location or seniority appeared in this posting."]),
      "Whether to apply. This comparison says what your records back, not what you should do about it.",
    ],
    note: target.application
      ? `Written against the saved application "${target.label}", whose status you set yourself.`
      : null,
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
  const untested = heldBack.filter(
    (position) => bySlug.get(position.slug)?.strength === "nothing",
  );

  return {
    reading,
    report,
    target,
    blocks,
    counts: {
      blocks: blocks.length,
      entries,
      cautions,
      gaps,
      postingSkills: report.total,
      required: report.requiredCount,
      preferred: report.preferredCount,
      claimable: claimable.length,
      heldBack: heldBack.length,
      untested: untested.length,
      projectsRanked: completed.length,
    },
    summary: `${
      report.total === 0
        ? `The reader matched 0 of the ${SKILLS.length} skills this app scores against the ${reading.characterCount} characters you pasted`
        : `This posting names ${pluralise(
            report.total,
            "skill",
            "skills",
          )} this app scores — ${report.requiredCount} asked for and ${
            report.preferredCount
          } listed as preferred`
    }. You can back ${claimable.length} of ${
      report.total
    } with finished work or a score at or above ${RESUME_LISTABLE_PERCENT} of 100, and ${
      untested.length
    } ${untested.length === 1 ? "has" : "have"} no record either way. ${report.focus}`,
  };
}
