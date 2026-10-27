import { describe, expect, it } from "vitest";
import { defaultProfileInput } from "@/lib/profile/defaults";
import type { Profile } from "@/lib/profile/schema";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";
import { SKILLS, type SkillCategory } from "@/lib/skills/catalog";
import type {
  SkillResult,
  TechnicalSection,
} from "@/lib/assessment/types";
import {
  LINKEDIN_ABOUT_LIMIT,
  LINKEDIN_HEADLINE_LIMIT,
  MAX_ENTRY_LENGTH,
  NEVER_FROM_THIS_APP,
  PORTFOLIO_NOT_IN_RECORDS,
  RESUME_LISTABLE_PERCENT,
  isDraftBuiltFrom,
  type MaterialBlock,
} from "@/lib/materials/types";
import {
  buildSkillProofs,
  describeDraftFingerprint,
  draftDrift,
  draftFingerprint,
  gapMaps,
  isListable,
  listableProofs,
  proofSources,
  proofBySlug,
  summarizeProofs,
} from "@/lib/materials/backing";
import { buildResume } from "@/lib/materials/resume";
import { buildLinkedIn } from "@/lib/materials/linkedin";
import { buildPortfolio, checkNeeds } from "@/lib/materials/portfolio";
import { tailorToPosting } from "@/lib/materials/tailoring";
import {
  clipText,
  countInstructionSlots,
  formatMaterialDay,
  joinList,
  pluralise,
  renderBlocksAsText,
  withoutInstructionSlots,
} from "@/lib/materials/text";
import {
  assessmentRecord,
  makeCareerExperiment,
  makeEvidenceRecord,
  makeInterviewAttempt,
  makeJobApplication,
  makeMockInterview,
  makeMilestone,
  makeProject,
  makeSection,
  makeSkillResult,
  emptySummary,
} from "@/lib/test-support/fixtures";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    email: "learner@example.com",
    ...defaultProfileInput({
      fullName: "Rani Menon",
      degree: "BSc Information Technology",
      degreeSpecialization: "Data analytics",
      graduationYear: 2026,
      pythonLevel: "intermediate",
      targetCareerSlug: "data-scientist",
      primaryGoal: "Become internship-ready in data science.",
    }),
    onboardingCompleted: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Any number of skills can be given a score. The section each one is filed under
 * carries no meaning for these tests — the materials rules read only the slug and
 * the percentage — so skills from categories the assessment does not score are
 * filed with the data-science questions rather than dropped.
 */
const SECTION_FOR_CATEGORY: Record<SkillCategory, TechnicalSection> = {
  programming: "programming",
  sql: "sql",
  "data-science": "data-science",
  "machine-learning": "data-science",
  "software-development": "software-development",
  "ai-engineering": "data-science",
  career: "data-science",
};

function workspaceWithScores(
  percents: Record<string, number>,
): WorkspaceSnapshot {
  const workspace = createEmptyWorkspace();
  const buckets = new Map<TechnicalSection, SkillResult[]>();

  for (const [slug, percent] of Object.entries(percents)) {
    const skill = SKILLS.find((candidate) => candidate.slug === slug);

    if (!skill) {
      throw new Error(`${slug} is not a skill this app scores.`);
    }

    const section = SECTION_FOR_CATEGORY[skill.category];
    const list = buckets.get(section) ?? [];

    list.push(
      makeSkillResult({ skillSlug: slug, percent, score: percent, maxScore: 100 }),
    );
    buckets.set(section, list);
  }

  workspace.assessments = [
    assessmentRecord({
      id: "assessment-1",
      completedAt: "2026-10-05T09:00:00.000Z",
      summary: emptySummary({
        sections: [...buckets].map(
          ([section, skills]) => makeSection(section, skills),
        ),
      }),
    }),
  ];

  return workspace;
}

/** Any build made of blocks can be asked for one of its sections. */
function block<T extends { blocks: readonly MaterialBlock[] }>(
  build: T,
  key: string,
) {
  const found = build.blocks.find((entry) => entry.key === key);

  if (!found) throw new Error(`No ${key} block was built.`);

  return found;
}

describe("buildSkillProofs", () => {
  it("calls every skill unrecorded when nothing has been stored", () => {
    const proofs = buildSkillProofs({
      workspace: createEmptyWorkspace(),
      profile: makeProfile(),
    });

    expect(proofs).toHaveLength(SKILLS.length);
    expect(summarizeProofs(proofs).counts).toEqual({
      shown: 0,
      screened: 0,
      practised: 0,
      weak: 0,
      nothing: SKILLS.length,
    });
    expect(summarizeProofs(proofs).listable).toEqual([]);
  });

  it("puts a score at the line on the listable side, and one under it on the other", () => {
    const proofs = proofBySlug(
      buildSkillProofs({
        workspace: workspaceWithScores({
          "python-basics": RESUME_LISTABLE_PERCENT,
          "python-debugging": RESUME_LISTABLE_PERCENT - 1,
        }),
        profile: makeProfile(),
      }),
    );

    expect(proofs.get("python-basics")!.strength).toBe("screened");
    expect(proofs.get("python-debugging")!.strength).toBe("weak");
    expect(isListable("screened")).toBe(true);
    expect(isListable("practised")).toBe(false);
  });

  it("lets finished work outrank a low score", () => {
    const workspace = workspaceWithScores({ "sql-filtering": 34 });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Churn report",
        status: "completed",
        repoUrl: "https://example.com/churn",
        completedAt: "2026-11-04T10:00:00.000Z",
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-filtering", sourceId: "project-1" }),
    ];

    const proof = proofBySlug(
      buildSkillProofs({ workspace, profile: makeProfile() }),
    ).get("sql-filtering")!;

    expect(proof.strength).toBe("shown");
    expect(proof.percent).toBe(34);
    expect(proof.projects.map((project) => project.title)).toEqual([
      "Churn report",
    ]);
    expect(proof.nextStep).toBeNull();
    expect(proof.reason).toContain("Churn report");
  });

  it("does not count an evidence row whose project is still open or gone", () => {
    const openOnly = createEmptyWorkspace();

    openOnly.projects = [
      makeProject({ id: "project-1", title: "Half a report", status: "in_progress" }),
    ];
    openOnly.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-joins", sourceId: "project-1" }),
    ];

    const dangling = createEmptyWorkspace();

    dangling.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-joins", sourceId: "deleted-project" }),
    ];

    expect(
      proofBySlug(buildSkillProofs({ workspace: openOnly, profile: null })).get(
        "sql-joins",
      )!.strength,
    ).toBe("nothing");
    expect(
      proofBySlug(buildSkillProofs({ workspace: dangling, profile: null })).get(
        "sql-joins",
      )!.strength,
    ).toBe("nothing");
  });

  it("reads a finished interview as practice only, and ignores an open one", () => {
    const finished = createEmptyWorkspace();

    finished.mockInterviews = [
      makeMockInterview({
        id: "interview-1",
        label: "SQL round",
        completedAt: "2026-11-03T10:00:00.000Z",
      }),
    ];
    finished.evidence = [
      makeEvidenceRecord({
        skillSlug: "sql-aggregation",
        sourceType: "interview",
        evidenceLevel: "interview_evidence",
        sourceId: "interview-1",
      }),
    ];

    const open = createEmptyWorkspace();

    open.mockInterviews = [makeMockInterview({ id: "interview-2", completedAt: null })];
    open.evidence = [
      makeEvidenceRecord({
        skillSlug: "sql-aggregation",
        sourceType: "interview",
        evidenceLevel: "interview_evidence",
        sourceId: "interview-2",
      }),
    ];

    expect(
      proofBySlug(buildSkillProofs({ workspace: finished, profile: null })).get(
        "sql-aggregation",
      )!.strength,
    ).toBe("practised");
    expect(
      proofBySlug(buildSkillProofs({ workspace: open, profile: null })).get(
        "sql-aggregation",
      )!.strength,
    ).toBe("nothing");
  });

  it("keeps your own profile rating out of the claim, but shows it", () => {
    const proofs = proofBySlug(
      buildSkillProofs({
        workspace: createEmptyWorkspace(),
        profile: makeProfile({ pythonLevel: "intermediate", machineLearningLevel: "none" }),
      }),
    );

    expect(proofs.get("python-basics")!.selfReport).toEqual({
      label: "Python",
      value: "Intermediate",
    });
    expect(proofs.get("python-basics")!.strength).toBe("nothing");
    expect(proofs.get("ml-fundamentals")!.selfReport).toBeNull();
    expect(proofs.get("llm-applications")!.selfReport).toBeNull();
  });

  it("sorts stored evidence levels from the strongest", () => {
    const workspace = workspaceWithScores({ "data-cleaning": 20 });

    workspace.projects = [
      makeProject({ id: "project-1", status: "completed", repoUrl: "https://example.com/clean" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({
        skillSlug: "data-cleaning",
        evidenceLevel: "interview_evidence",
        sourceType: "interview",
        sourceId: null,
      }),
      makeEvidenceRecord({ skillSlug: "data-cleaning", sourceId: "project-1" }),
    ];

    const proof = proofBySlug(
      buildSkillProofs({ workspace, profile: null }),
    ).get("data-cleaning")!;

    expect(proof.levels[0]).toBe("interview_evidence");
    expect(proof.strength).toBe("shown");
  });

  it("counts what a posting asked for against what this learner can write", () => {
    const workspace = workspaceWithScores({
      "python-basics": 80,
      "sql-filtering": 12,
    });
    const summary = summarizeProofs(
      buildSkillProofs({ workspace, profile: makeProfile() }),
    );

    const coverage = summary.coveredBy([
      "python-basics",
      "sql-filtering",
      "not-a-real-skill",
    ]);

    expect(coverage).toEqual({
      wanted: 2,
      listable: 1,
      unbacked: ["SQL filtering and sorting"],
    });
  });

  it("cites the record behind each claim, including a missing link", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "No link yet",
        status: "completed",
        completedAt: "2026-11-07T08:00:00.000Z",
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "numpy", sourceId: "project-1" }),
    ];

    const proof = proofBySlug(
      buildSkillProofs({ workspace, profile: null }),
    ).get("numpy")!;
    const sources = proofSources(proof);

    expect(sources).toHaveLength(1);
    expect(sources[0].detail).toContain("no repository link");
    expect(sources[0].verified).toBe(false);
    expect(sources[0].date).toBe("2026-11-07T08:00:00.000Z");
  });
});

describe("buildResume", () => {
  it("keeps the sections a learner must fill themselves empty rather than invented", () => {
    const build = buildResume({
      workspace: createEmptyWorkspace(),
      profile: null,
      proofs: buildSkillProofs({ workspace: createEmptyWorkspace(), profile: null }),
    });

    expect(block(build, "employment").entries).toHaveLength(0);
    expect(block(build, "employment").gaps).toEqual([...NEVER_FROM_THIS_APP]);
    expect(block(build, "header").entries).toHaveLength(0);
    expect(block(build, "education").entries).toHaveLength(0);
    expect(build.headline).toContain("has nothing to say yet");
    expect(build.counts.entries).toBe(0);
  });

  it("prefers the role you saved over the one in your profile, and says where it came from", () => {
    const workspace = createEmptyWorkspace();

    workspace.careerPreferences = [
      {
        id: "pref-1",
        specializationChoice: "data-engineer",
        alternativeChoice: "data-scientist",
        overrideReason: "I like the pipeline work more than the modelling.",
        updatedAt: "2026-11-01T10:00:00.000Z",
      },
    ];

    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });

    expect(build.target?.name).toBe("Data Engineer");
    expect(build.target?.from).toContain("Career Explorer");

    const profileOnly = buildResume({
      workspace: createEmptyWorkspace(),
      profile: makeProfile({ targetCareerSlug: "data-scientist" }),
      proofs: buildSkillProofs({ workspace: createEmptyWorkspace(), profile: null }),
    });

    expect(profileOnly.target?.name).toBe("Data Scientist");
    expect(profileOnly.target?.from).toContain("profile");
  });

  it("writes a project line from what is stored, and not one word more", () => {
    const workspace = workspaceWithScores({ "python-basics": 90 });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Retry dashboard",
        problemStatement: "Show which jobs fail and how often.",
        status: "completed",
        repoUrl: "https://example.com/retry",
        deploymentUrl: "https://retry.example.com",
        completedAt: "2026-11-08T10:00:00.000Z",
        milestones: [
          makeMilestone({
            id: "m1",
            status: "completed",
            evidenceUrl: "https://example.com/commit-1",
          }),
          makeMilestone({ id: "m2", status: "completed", evidenceUrl: null }),
          makeMilestone({ id: "m3", status: "pending" }),
        ],
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "python-basics", sourceId: "project-1" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildResume({ workspace, profile: makeProfile(), proofs });
    const entry = block(build, "projects").entries[0];

    expect(entry.text).toContain("Retry dashboard");
    expect(entry.text).toContain("Show which jobs fail and how often.");
    expect(entry.text).toContain("Steps completed with the work attached: 1 of 3");
    expect(entry.text).toContain("Repository: https://example.com/retry");
    expect(entry.text).toContain("Live link: https://retry.example.com");
    expect(entry.text).toContain("Skills this app recorded from it: Python basics");
    expect(entry.caution).toContain("not a result");
    expect(block(build, "projects").note).toContain("does not mean anyone reviewed");
    expect(entry.sources[0].date).toBe("2026-11-08T10:00:00.000Z");
  });

  it("keeps a scored skill and a worked skill in separate sections", () => {
    const workspace = workspaceWithScores({
      "python-basics": 88,
      "sql-filtering": 91,
    });

    workspace.projects = [
      makeProject({ id: "project-1", title: "Wages study", status: "completed", repoUrl: "https://example.com/wages" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-filtering", sourceId: "project-1" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildResume({ workspace, profile: makeProfile(), proofs });

    expect(block(build, "skills-shown").entries.map((entry) => entry.id)).toEqual([
      "skill-sql-filtering",
    ]);
    expect(block(build, "skills-screened").entries.map((entry) => entry.id)).toEqual([
      "skill-python-basics",
    ]);
    expect(block(build, "skills-screened").entries[0].text).toContain(
      "88 of 100 on the skills assessment in this app",
    );
    expect(block(build, "skills-screened").entries[0].caution).toContain(
      "not a proctored exam",
    );
    expect(build.counts.skillsWithWork).toBe(1);
    expect(build.counts.listableSkills).toBe(2);
  });

  it("holds back practice-only and low-scored skills, and names the count with no record", () => {
    const workspace = workspaceWithScores({
      "python-basics": 40,
      "sql-aggregation": 30,
    });

    workspace.mockInterviews = [
      makeMockInterview({ id: "interview-1", label: "Python round", completedAt: "2026-11-02T10:00:00.000Z" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({
        skillSlug: "pandas",
        sourceType: "interview",
        evidenceLevel: "interview_evidence",
        sourceId: "interview-1",
      }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildResume({ workspace, profile: makeProfile(), proofs });
    const held = block(build, "skills-held-back");

    expect(held.entries.map((entry) => entry.id).sort()).toEqual([
      "held-pandas",
      "held-python-basics",
      "held-sql-aggregation",
    ]);
    expect(held.entries[0].text).toMatch(/^Do not write /);
    expect(held.gaps[0]).toContain(
      `${SKILLS.length - 3} of the ${SKILLS.length} skills`,
    );
    expect(build.unrecordedSkills).toHaveLength(SKILLS.length - 3);
  });

  it("lists an unfinished project with exactly what it is missing", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Half a report",
        status: "in_progress",
        repoUrl: null,
        milestones: [
          makeMilestone({ id: "m1", title: "Get the data", status: "completed", evidenceUrl: "https://example.com/m1" }),
          makeMilestone({ id: "m2", title: "Clean it", status: "pending" }),
          makeMilestone({ id: "m3", title: "Write it up", status: "pending" }),
        ],
      }),
    ];

    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });
    const open = block(build, "projects-open");

    expect(open.entries).toHaveLength(1);
    expect(open.entries[0].text).toContain("2 steps not submitted (Clean it, Write it up)");
    expect(open.entries[0].text).toContain("no repository link stored");
    expect(block(build, "projects").entries).toHaveLength(0);
  });

  it("counts a finished interview as practice, never as experience", () => {
    const workspace = createEmptyWorkspace();

    workspace.mockInterviews = [
      makeMockInterview({ id: "interview-1", label: "SQL round", completedAt: "2026-11-06T10:00:00.000Z" }),
      makeMockInterview({ id: "interview-2", label: "Still open", completedAt: null }),
    ];
    workspace.interviewAttempts = [
      makeInterviewAttempt({ id: "a1", questionId: "sql-filtering-basics", topic: "sql", interviewId: "interview-1", rating: "covered" }),
      makeInterviewAttempt({ id: "a2", questionId: "sql-joins-basic", topic: "sql", interviewId: "interview-1", rating: "partial" }),
      makeInterviewAttempt({ id: "a3", questionId: "python-read-traceback", topic: "python", interviewId: "interview-2", rating: "covered" }),
    ];

    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });
    const practice = block(build, "practice");

    expect(practice.entries).toHaveLength(1);
    expect(practice.entries[0].text).toContain(
      "of the 2 questions you answered, you rated 1 as answered, 1 as part-answered",
    );
    expect(practice.entries[0].caution).toContain("never as work experience");
  });

  it("reports a tested role from its linked output and flags the self-rating", () => {
    const workspace = createEmptyWorkspace();

    workspace.careerExperiments = [
      makeCareerExperiment({ id: "exp-1", careerSlug: "data-analyst", title: "One question, one query" }),
      makeCareerExperiment({ id: "exp-2", careerSlug: "data-scientist", status: "in_progress", completedAt: null }),
    ];

    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });
    const development = block(build, "development");

    expect(development.entries).toHaveLength(1);
    expect(development.entries[0].text).toContain("Tested the work of a Data Analyst");
    expect(development.entries[0].text).toContain("Output: https://example.com/work-produced");
    expect(development.entries[0].caution).toContain("not how well you did the work");
  });

  it("prints the degree you typed and still refuses to name an institution", () => {
    const workspace = createEmptyWorkspace();
    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });
    const education = block(build, "education");

    expect(education.entries[0].text).toBe(
      "BSc Information Technology, Data analytics, 2026",
    );
    expect(education.entries[0].caution).toContain("has not seen a transcript");
    expect(education.gaps.join(" ")).toContain("name of your institution");
  });

  it("counts its own lines, cautions and gaps without double adding", () => {
    const workspace = workspaceWithScores({ "python-basics": 95 });

    workspace.projects = [
      makeProject({ id: "project-1", title: "Score study", status: "completed", repoUrl: "https://example.com/score" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "python-basics", sourceId: "project-1" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildResume({ workspace, profile: makeProfile(), proofs });

    expect(build.counts.blocks).toBe(build.blocks.length);
    expect(build.counts.entries).toBe(
      build.blocks.reduce((sum, b) => sum + b.entries.length, 0),
    );
    expect(build.counts.cautions).toBe(
      build.blocks.reduce(
        (sum, b) => sum + b.entries.filter((e) => e.caution !== null).length,
        0,
      ),
    );
    expect(build.counts.gaps).toBe(
      build.blocks.reduce((sum, b) => sum + b.gaps.length, 0),
    );
    expect(build.headline).toContain("For Data Scientist");
    expect(build.headline).toContain("1 completed project");
  });

  it("marks a line too long for one page instead of cutting it silently", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Long statement",
        problemStatement: "measure ".repeat(60),
        status: "completed",
        repoUrl: "https://example.com/long",
      }),
    ];

    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });
    const entry = block(build, "projects").entries[0];

    expect(entry.text.length).toBeGreaterThan(MAX_ENTRY_LENGTH);
    expect(build.counts.longLines).toBe(1);
  });

  it("orders the listable skills work first, then by score", () => {
    const workspace = workspaceWithScores({
      "python-basics": 72,
      "sql-filtering": 99,
      "sql-joins": 60,
    });

    workspace.projects = [
      makeProject({ id: "project-1", status: "completed", repoUrl: "https://example.com/x" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-joins", sourceId: "project-1" }),
    ];

    const ordered = listableProofs(
      buildSkillProofs({ workspace, profile: makeProfile() }),
    ).map((proof) => proof.slug);

    expect(ordered).toEqual(["sql-joins", "sql-filtering", "python-basics"]);
  });
});

describe("text helpers", () => {
  it("cuts at a word boundary and says where it cut", () => {
    expect(clipText("short line")).toBe("short line");

    const long = "alpha beta ".repeat(40).trim();
    const cut = clipText(long, 60);

    expect(cut.length).toBeLessThanOrEqual(60 + "… (cut at 60 characters)".length);
    expect(cut).toContain("… (cut at 60 characters)");
    expect(cut.endsWith(" ")).toBe(false);
  });

  it("joins a list the way the document reads it", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["one"])).toBe("one");
    expect(joinList(["one", "two"])).toBe("one and two");
    expect(joinList(["one", "two", "three"])).toBe("one, two and three");
    expect(joinList(["SQL filtering and sorting", "Data cleaning"])).toBe(
      "SQL filtering and sorting, and Data cleaning",
    );
    expect(pluralise(1, "project", "projects")).toBe("1 project");
    expect(pluralise(3, "project", "projects")).toBe("3 projects");
  });

  it("writes a stored date the way the screen writes it", () => {
    expect(formatMaterialDay("2026-11-05T10:00:00.000Z")).toBe("5 November 2026");
    expect(formatMaterialDay(null)).toBeNull();
    expect(formatMaterialDay("not a date")).toBeNull();
  });

  it("keeps cautions and provenance out of the pasted document", () => {
    const workspace = workspaceWithScores({ "python-basics": 91 });
    const build = buildResume({
      workspace,
      profile: makeProfile(),
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
    });

    const text = renderBlocksAsText({
      title: "Rani Menon — application record",
      blocks: build.blocks,
      generatedOn: "2026-11-10T09:00:00.000Z",
    });

    expect(text).toContain("Rani Menon — application record");
    expect(text).toContain("SKILLS YOUR ASSESSMENT SCORED");
    expect(text).toContain("Python basics — 91 of 100");
    expect(text).toContain("10 November 2026");
    expect(text).not.toContain("not a proctored exam");
    expect(text).not.toContain("the questions covering this skill");
    expect(text).toContain("SECTIONS THIS APP LEFT EMPTY FOR YOU TO FILL");
    expect(text).toContain("Employment history");
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("keeps an instruction slot out of the pasted text and counts it instead", () => {
    const withSlot =
      "I build dashboards. [Add the one number you can explain.] They update hourly.";

    expect(countInstructionSlots(withSlot)).toBe(1);
    expect(withoutInstructionSlots(withSlot)).toBe(
      "I build dashboards.  They update hourly.",
    );

    const build = buildResume({
      workspace: createEmptyWorkspace(),
      profile: makeProfile(),
      proofs: buildSkillProofs({
        workspace: createEmptyWorkspace(),
        profile: makeProfile(),
      }),
    });
    const text = renderBlocksAsText({
      title: "With a slot",
      blocks: [
        {
          key: "slot",
          title: "A block with a slot",
          purpose: "Testing.",
          entries: [
            {
              id: "slot-1",
              text: "Two sentences. [Write the third yourself.]",
              sources: [],
              caution: null,
            },
          ],
          gaps: [],
          note: null,
        },
        ...build.blocks,
      ],
      generatedOn: "2026-11-10T09:00:00.000Z",
    });

    expect(text).toContain("Two sentences.");
    expect(text).not.toContain("Write the third yourself");
    expect(text).toContain("1 bracketed line was taken out");
  });
});

describe("gapMaps", () => {
  it("reads your score and the strongest level stored for a skill", () => {
    const workspace = workspaceWithScores({ "sql-filtering": 55 });

    workspace.evidence = [
      makeEvidenceRecord({
        skillSlug: "sql-filtering",
        evidenceLevel: "project_evidence",
      }),
      makeEvidenceRecord({
        skillSlug: "sql-filtering",
        evidenceLevel: "interview_evidence",
        sourceType: "interview",
      }),
    ];

    const maps = gapMaps(workspace);

    expect(maps.skillPercents.get("sql-filtering")).toBe(55);
    expect(maps.evidenceLevels.get("sql-filtering")).toBe("interview_evidence");
  });

  it("returns empty maps when this account has no records", () => {
    const maps = gapMaps(createEmptyWorkspace());

    expect(maps.skillPercents.size).toBe(0);
    expect(maps.evidenceLevels.size).toBe(0);
  });
});

describe("buildLinkedIn", () => {
  it("builds nothing when the workspace holds no records", () => {
    const workspace = createEmptyWorkspace();
    const build = buildLinkedIn({
      workspace,
      profile: null,
      proofs: buildSkillProofs({ workspace, profile: null }),
    });

    expect(build.headline).toBe("");
    expect(build.about).toBe("");
    expect(build.counts.entries).toBe(0);
    expect(block(build, "headline").gaps[0]).toContain(
      "Nothing to build a headline from",
    );
    expect(block(build, "about").gaps[0]).toContain("No profile is stored");
    expect(block(build, "experience").gaps[0]).toContain(
      "No completed project",
    );
    expect(build.usage.headline.over).toBe(false);
    expect(build.summary).toContain("With no target role saved");
  });

  it("assembles a headline from the role, the top skills and the linked work", () => {
    const workspace = workspaceWithScores({
      "sql-filtering": 81,
      "python-basics": 92,
    });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Wages study",
        status: "completed",
        repoUrl: "https://example.com/wages",
        deploymentUrl: "https://wages.example.com",
        completedAt: "2026-11-08T10:00:00.000Z",
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-filtering", sourceId: "project-1" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildLinkedIn({ workspace, profile: makeProfile(), proofs });

    expect(build.headline).toBe(
      "Looking for Data Scientist work | SQL filtering and sorting, Python basics | 1 project with the code linked",
    );
    expect(build.usage.headline.characters).toBe(build.headline.length);
    expect(build.usage.headline.room).toBe(
      LINKEDIN_HEADLINE_LIMIT - build.headline.length,
    );
    expect(block(build, "headline").title).toBe(
      `Headline (${build.headline.length} of ${LINKEDIN_HEADLINE_LIMIT} characters)`,
    );
    expect(block(build, "headline").entries[0].caution).toContain(
      "Never write a title no employer gave you",
    );
    expect(block(build, "headline").note).toContain("October 2026");
    expect(build.counts.links).toBe(2);
  });

  it("names three skills in a headline however many you can list", () => {
    const workspace = workspaceWithScores({
      "python-basics": 90,
      "python-debugging": 85,
      "problem-solving": 80,
      "sql-filtering": 75,
    });
    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildLinkedIn({ workspace, profile: makeProfile(), proofs });

    expect(build.counts.listableSkills).toBe(4);
    expect(build.headline).toContain("Python basics");
    expect(build.headline).not.toContain("SQL filtering and sorting");
    expect(block(build, "skills").entries).toHaveLength(4);
  });

  it("writes an about section that leaves the one figure it cannot supply visible", () => {
    const workspace = workspaceWithScores({ "python-basics": 92 });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Wages study",
        problemStatement: "Which roles pay below the local median?",
        status: "completed",
        repoUrl: "https://example.com/wages",
      }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildLinkedIn({ workspace, profile: makeProfile(), proofs });

    expect(build.about).toContain(
      "studying BSc Information Technology (Data analytics)",
    );
    expect(build.about).toContain("Which roles pay below the local median?");
    expect(build.about).toContain("[Add the one number you can explain");
    expect(countInstructionSlots(build.about)).toBe(1);
    expect(build.usage.about.characters).toBe(build.about.length);
    expect(build.usage.about.over).toBe(false);
    expect(build.usage.about.limit).toBe(LINKEDIN_ABOUT_LIMIT);
    expect(block(build, "about").entries[0].caution).toContain(
      "not a sentence to keep",
    );
    expect(build.counts.paragraphs).toBe(4);
  });

  it("says a graduated profile studied, not that it is studying", () => {
    const profile = makeProfile({ yearOfStudy: "Graduated" });
    const workspace = createEmptyWorkspace();
    const build = buildLinkedIn({
      workspace,
      profile,
      proofs: buildSkillProofs({ workspace, profile }),
    });

    expect(build.about.split("\n\n")[0]).toContain("I studied BSc");
    expect(build.about).not.toContain("I am a graduated");
  });

  it("labels every work line as project or self-directed, never a job", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Wages study",
        status: "completed",
        repoUrl: "https://example.com/wages",
      }),
    ];
    workspace.careerExperiments = [
      makeCareerExperiment({
        id: "exp-1",
        careerSlug: "data-analyst",
        title: "One question, one query",
      }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildLinkedIn({ workspace, profile: makeProfile(), proofs });
    const experience = block(build, "experience");

    expect(experience.entries).toHaveLength(2);
    expect(experience.entries[0].text).toContain("Project work — Wages study");
    expect(experience.entries[0].caution).toContain("not a job");
    expect(experience.entries[1].text).toContain("Self-directed work — ");
    expect(experience.gaps).toEqual([...NEVER_FROM_THIS_APP]);
    expect(block(build, "featured").entries).toHaveLength(2);
  });

  it("holds a screened skill in the list but flags what it rests on", () => {
    const workspace = workspaceWithScores({
      "python-basics": 88,
      "sql-filtering": 40,
    });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Wages study",
        status: "completed",
        repoUrl: "https://example.com/wages",
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "problem-solving", sourceId: "project-1" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = buildLinkedIn({ workspace, profile: makeProfile(), proofs });
    const skills = block(build, "skills");

    expect(skills.entries.map((entry) => entry.id)).toEqual([
      "skill-problem-solving",
      "skill-python-basics",
    ]);
    expect(skills.entries[0].caution).toBeNull();
    expect(skills.entries[1].caution).toContain("looks identical");
    expect(skills.gaps[0]).toContain("SQL filtering and sorting");
    expect(build.counts.cautions).toBeGreaterThan(0);
  });
});

describe("buildPortfolio", () => {
  const expenses = makeProject({
    id: "project-1",
    title: "Personal expense analysis",
    templateSlug: "personal-expense-analysis",
    status: "completed",
    repoUrl: "https://example.com/expenses",
    completedAt: "2026-11-08T10:00:00.000Z",
    milestones: [
      makeMilestone({
        id: "m1",
        title: "Load the data",
        status: "completed",
        evidenceUrl: "https://example.com/commit-1",
        completedAt: "2026-11-06T10:00:00.000Z",
      }),
      makeMilestone({ id: "m2", title: "Clean it", status: "pending" }),
    ],
  });

  it("counts a stored repository link as a check a reviewer can open", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [expenses];

    const build = buildPortfolio({ workspace });

    expect(checkNeeds("README states the question in the first screen")).toBe(
      "repository",
    );
    expect(checkNeeds("The dashboard is deployed and the link works")).toBe(
      "live",
    );
    expect(checkNeeds("Figures are readable without reading the code")).toBeNull();
    expect(build.counts).toMatchObject({
      checks: 4,
      reachable: 3,
      noLink: 0,
      notCheckable: 1,
      completedProjects: 1,
      projectsWithTemplate: 1,
      linksStored: 1,
    });
    expect(build.counts.reachable + build.counts.noLink + build.counts.notCheckable).toBe(
      build.counts.checks,
    );
    expect(build.summary).toContain(
      "0 have no link stored behind them, and 1 asks about what is inside the work",
    );
    expect(block(build, "checks-reachable").entries[0].text).toContain(
      "README states the question",
    );
    expect(block(build, "checks-reachable").entries[0].caution).toContain(
      "nothing here opened it",
    );
    expect(block(build, "checks-reachable").note).toContain(
      "A matching link means a reviewer can look",
    );
  });

  it("reports every link-shaped check as unbacked when no link is stored", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({ ...expenses, repoUrl: null }),
    ];

    const build = buildPortfolio({ workspace });
    const missing = block(build, "checks-no-link");

    expect(build.counts).toMatchObject({
      reachable: 0,
      noLink: 3,
      notCheckable: 1,
    });
    expect(missing.entries[0].text).toContain(
      "No repository link is stored on this project",
    );
    expect(missing.entries[0].caution).toContain("Add the repository address");
    expect(missing.entries[0].sources[0].date).toBe(
      "2026-11-08T10:00:00.000Z",
    );
  });

  it("separates a missing live page from a missing repository", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-2",
        title: "Exploratory analysis and dashboard",
        templateSlug: "exploratory-analysis-dashboard",
        status: "completed",
        repoUrl: "https://example.com/dash",
        deploymentUrl: null,
      }),
    ];

    const build = buildPortfolio({ workspace });

    expect(build.counts).toMatchObject({
      checks: 4,
      reachable: 1,
      noLink: 1,
      notCheckable: 2,
    });
    expect(build.checks.find((check) => check.state === "no-link")?.needs).toBe(
      "live",
    );
    expect(block(build, "checks-no-link").entries[0].caution).toContain(
      "Add the live address",
    );
  });

  it("keeps an open project out of the checks and says what it still needs", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        ...expenses,
        status: "in_progress",
        repoUrl: null,
        milestones: [
          makeMilestone({ id: "m1", title: "Load the data", status: "completed" }),
          makeMilestone({ id: "m2", title: "Clean it", status: "pending" }),
          makeMilestone({ id: "m3", title: "Write it up", status: "pending" }),
        ],
      }),
    ];

    const build = buildPortfolio({ workspace });

    expect(build.counts.checks).toBe(0);
    expect(block(build, "portfolio-overview").entries).toHaveLength(0);
    expect(block(build, "portfolio-open").entries[0].text).toContain(
      "2 steps of 3 still unsubmitted, and no repository link is stored",
    );
  });

  it("names a project built from your own description as having no checklist", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({ ...expenses, templateSlug: null, title: "My own question" }),
    ];

    const build = buildPortfolio({ workspace });

    expect(build.counts.checks).toBe(0);
    expect(build.counts.projectsWithTemplate).toBe(0);
    expect(block(build, "portfolio-overview").gaps[0]).toContain(
      "started from your own description",
    );
    expect(
      block(build, "portfolio-overview").entries[0].sources[0].detail,
    ).toContain("no plan and no checklist");
  });

  it("attaches the milestone link it quotes, and lists what no record can supply", () => {
    const workspace = createEmptyWorkspace();

    workspace.projects = [expenses];

    const build = buildPortfolio({ workspace });
    const overview = block(build, "portfolio-overview").entries[0];

    expect(overview.text).toContain("Steps with the work attached: 1 of 2");
    expect(overview.text).toContain("Links: https://example.com/expenses");
    expect(overview.sources[1].kind).toBe("milestone");
    expect(overview.sources[1].detail).toContain(
      "You attached https://example.com/commit-1",
    );
    expect(block(build, "portfolio-gaps").entries).toHaveLength(0);
    expect(block(build, "portfolio-gaps").gaps).toEqual([
      ...PORTFOLIO_NOT_IN_RECORDS,
    ]);
  });

  it("summarises an empty workspace without inventing a project", () => {
    const build = buildPortfolio({ workspace: createEmptyWorkspace() });

    expect(build.summary).toContain("0 finished projects in this workspace");
    expect(block(build, "portfolio-overview").gaps[0]).toContain(
      "No project is finished here",
    );
    expect(build.counts.entries).toBe(0);
  });
});

describe("tailorToPosting", () => {
  const POSTING = [
    "Data Analyst, Business Intelligence team.",
    "Required: you write SQL with group by and join two tables.",
    "Required: Python basics, pandas and careful data cleaning.",
    "Nice to have: visualization in a dashboard.",
    "Salary: 55000 a year. Remote working. Minimum 3 years of experience.",
  ].join("\n");

  it("splits the posting's skills into what you can write and what you must not", () => {
    const workspace = workspaceWithScores({
      "python-basics": 90,
      pandas: 40,
    });
    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = tailorToPosting({
      workspace,
      proofs,
      postingText: POSTING,
    });

    expect(build.counts.postingSkills).toBeGreaterThanOrEqual(6);
    expect(build.counts.preferred).toBe(1);
    expect(
      block(build, "tailor-claim").entries.map((entry) => entry.id),
    ).toContain("claim-python-basics");
    expect(block(build, "tailor-claim").entries[0].caution).toContain(
      "your own 90 of 100",
    );

    const cannot = block(build, "tailor-cannot");

    expect(cannot.entries.map((entry) => entry.id)).toContain("cannot-pandas");
    expect(
      cannot.entries.find((entry) => entry.id === "cannot-pandas")!.text,
    ).toContain(
      `under the ${RESUME_LISTABLE_PERCENT} this app treats as listable`,
    );
    expect(cannot.note).toBe(build.report.focus);
    expect(build.summary).toContain("You can back 1 of");
  });

  it("quotes the posting's own words beside each claim it makes", () => {
    const workspace = workspaceWithScores({ "python-basics": 90 });
    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = tailorToPosting({
      workspace,
      proofs,
      postingText: POSTING,
    });
    const entry = block(build, "tailor-claim").entries.find(
      (candidate) => candidate.id === "claim-python-basics",
    )!;

    expect(entry.sources[0].kind).toBe("application");
    expect(entry.sources[0].detail).toContain('"python"');
    expect(entry.sources[1].kind).toBe("assessment");
  });

  it("ranks finished work by how many of the posting's skills it names", () => {
    const workspace = workspaceWithScores({ "sql-joins": 80 });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "No overlap",
        status: "completed",
        repoUrl: "https://example.com/none",
        completedAt: "2026-11-09T10:00:00.000Z",
      }),
      makeProject({
        id: "project-2",
        title: "Order history joins",
        status: "completed",
        repoUrl: "https://example.com/joins",
        completedAt: "2026-11-01T10:00:00.000Z",
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({
        skillSlug: "sql-joins",
        sourceId: "project-2",
      }),
    ];

    const build = tailorToPosting({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
      postingText: POSTING,
    });
    const ranked = block(build, "tailor-projects");

    expect(ranked.entries.map((entry) => entry.id)).toEqual([
      "project-project-2",
      "project-project-1",
    ]);
    expect(ranked.entries[0].text).toContain(
      "1. Order history joins — names 1 skill this posting asks for (SQL joins)",
    );
    expect(ranked.entries[1].text).toContain(
      "names none of the skills this posting asks for",
    );
    expect(ranked.entries[1].caution).toContain("your first line");
  });

  it("keeps a project with no stored code link from leading the application", () => {
    const workspace = workspaceWithScores({ "sql-joins": 80 });

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Order history joins",
        status: "completed",
        repoUrl: null,
      }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({
        skillSlug: "sql-joins",
        sourceId: "project-1",
      }),
    ];

    const build = tailorToPosting({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
      postingText: POSTING,
    });

    expect(block(build, "tailor-projects").entries[0].caution).toContain(
      "Store the repository link",
    );
  });

  it("says when the reader matched nothing rather than reporting an empty list", () => {
    const workspace = createEmptyWorkspace();
    const build = tailorToPosting({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
      postingText:
        "We are a small team looking for someone careful to file paperwork, answer the phone and keep the office stocked.",
    });

    expect(build.counts.postingSkills).toBe(0);
    expect(block(build, "tailor-claim").gaps[0]).toContain(
      "nothing to compare",
    );
    expect(build.summary).toContain("matched 0 of the 36 skills");
  });

  it("names the roles it read and refuses to judge whether the posting is real", () => {
    const workspace = createEmptyWorkspace();
    const build = tailorToPosting({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
      postingText: POSTING,
    });
    const roleBlock = block(build, "tailor-role");

    expect(
      roleBlock.entries.some((entry) => entry.text.includes("Data Analyst")),
    ).toBe(true);
    expect(roleBlock.entries[0].caution).toContain("matching words");
    expect(roleBlock.gaps.join(" ")).toContain("Whether the posting is real");
    expect(block(build, "tailor-not-used").entries).toHaveLength(0);
    expect(block(build, "tailor-not-used").gaps).toEqual([
      ...build.reading.ignored,
      "Whether to apply. This comparison says what your records back, not what you should do about it.",
    ]);
    expect(build.reading.ignored.length).toBe(3);
  });

  it("writes against a saved application when one is given", () => {
    const application = makeJobApplication({
      id: "app-1",
      company: "Northwind Retail",
      roleTitle: "Reporting Analyst",
      description: POSTING,
    });
    const workspace = createEmptyWorkspace();

    workspace.jobApplications = [application];

    const build = tailorToPosting({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: makeProfile() }),
      postingText: application.description,
      application,
    });

    expect(build.target.label).toBe("Reporting Analyst at Northwind Retail");
    expect(build.target.application?.id).toBe("app-1");
    expect(block(build, "tailor-not-used").note).toContain(
      "the saved application",
    );
  });

  it("counts its own blocks, entries and gaps against what it built", () => {
    const workspace = workspaceWithScores({ "python-basics": 90 });

    workspace.projects = [
      makeProject({ id: "project-1", title: "Wages study", status: "completed" }),
    ];

    const proofs = buildSkillProofs({ workspace, profile: makeProfile() });
    const build = tailorToPosting({
      workspace,
      proofs,
      postingText: POSTING,
    });

    expect(build.counts.blocks).toBe(build.blocks.length);
    expect(build.counts.entries).toBe(
      build.blocks.reduce((sum, entry) => sum + entry.entries.length, 0),
    );
    expect(build.counts.gaps).toBe(
      build.blocks.reduce((sum, entry) => sum + entry.gaps.length, 0),
    );
    expect(
      build.counts.claimable + build.counts.heldBack,
    ).toBe(build.counts.postingSkills);
  });
});

describe("saved drafts", () => {
  const savedAt = "2026-11-02T10:00:00.000Z";

  function draftWorkspace(): WorkspaceSnapshot {
    const workspace = createEmptyWorkspace();

    workspace.projects = [
      makeProject({
        id: "project-1",
        title: "Synthetic expense analysis",
        status: "completed",
        repoUrl: "https://example.com/one",
        completedAt: "2026-11-01T10:00:00.000Z",
      }),
      makeProject({ id: "project-2", status: "in_progress" }),
    ];
    workspace.evidence = [
      makeEvidenceRecord({ skillSlug: "sql-filtering", sourceId: "project-1" }),
    ];

    return workspace;
  }

  function fingerprintOf(workspace: WorkspaceSnapshot, at = savedAt) {
    return draftFingerprint({
      workspace,
      proofs: buildSkillProofs({ workspace, profile: null }),
      savedAt: at,
    });
  }

  it("counts only what the records say", () => {
    const fingerprint = fingerprintOf(draftWorkspace());

    expect(fingerprint).toEqual({
      savedAt,
      latestProject: "Synthetic expense analysis",
      completedProjects: 1,
      linkedProjects: 1,
      skillRecords: 1,
      shownSkills: 1,
      screenedSkills: 0,
      finishedInterviews: 0,
      testedRoles: 0,
      assessmentTaken: false,
      listableSkills: 1,
    });
  });

  it("names every number it quotes, so the sentence reads without this app", () => {
    expect(describeDraftFingerprint(fingerprintOf(draftWorkspace()))).toBe(
      "Saved on 2 November 2026, when this workspace held 1 finished project (1 with a link a reviewer can open), 1 skill your finished work backs, 0 skills carried only by a score, 0 practice interviews you rated yourself, 0 roles you tested with the work linked, 1 row in your skill record and no completed skills assessment. The newest finished project was “Synthetic expense analysis”.",
    );
  });

  it("says which fields moved underneath a saved draft, and stays silent when none did", () => {
    const workspace = draftWorkspace();
    const saved = fingerprintOf(workspace);

    workspace.projects.push(
      makeProject({
        id: "project-3",
        title: "Store footfall report",
        status: "completed",
        completedAt: "2026-11-09T10:00:00.000Z",
      }),
    );
    workspace.careerExperiments = [
      makeCareerExperiment({ id: "experiment-1", careerSlug: "data-scientist" }),
    ];

    expect(draftDrift({ saved, current: fingerprintOf(workspace, "2026-11-10T10:00:00.000Z") })).toEqual([
      "Finished projects: 1 when this draft was saved, 2 today.",
      "Roles you tested with the work linked: 0 when this draft was saved, 1 today.",
      "The newest finished project was “Synthetic expense analysis” when this was saved, and is “Store footfall report” today.",
    ]);
    expect(draftDrift({ saved, current: saved })).toEqual([]);
  });

  it("refuses a fingerprint whose counts are not counts", () => {
    const saved = fingerprintOf(draftWorkspace());

    expect(isDraftBuiltFrom(saved)).toBe(true);
    expect(isDraftBuiltFrom({ ...saved, completedProjects: -1 })).toBe(false);
    expect(isDraftBuiltFrom({ ...saved, completedProjects: 1.5 })).toBe(false);
    expect(isDraftBuiltFrom({ ...saved, assessmentTaken: "yes" })).toBe(false);
    expect(isDraftBuiltFrom({ ...saved, savedAt: undefined })).toBe(false);
    expect(isDraftBuiltFrom(null)).toBe(false);
    expect(isDraftBuiltFrom([])).toBe(false);
  });
});
