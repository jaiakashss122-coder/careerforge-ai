import { describe, expect, it } from "vitest";
import { isCareerTrackSlug } from "@/lib/career/tracks";
import { SKILLS } from "@/lib/skills/catalog";
import {
  INTERVIEW_EVIDENCE_RULE,
  INTERVIEW_QUESTIONS,
  INTERVIEW_TOPIC_SUMMARY,
  countQuestionsForTopic,
  getInterviewQuestion,
  listQuestionsForTopic,
  listQuestionsForTrack,
} from "@/lib/interview/questions";
import {
  ANSWER_RATING_META,
  INTERVIEW_TOPIC_META,
  INTERVIEW_TOPICS,
  MAX_ANSWER_LENGTH,
  type InterviewAttemptRecord,
} from "@/lib/interview/types";
import {
  SKILL_PHRASE_CATALOGUE,
  readJobDescription,
  buildGapReport,
} from "@/lib/interview/description";
import {
  MOCK_INTERVIEW_MAX_QUESTIONS,
  buildInterviewEvidence,
  buildPracticeMaterials,
  chooseMockQuestions,
  summarizeInterview,
} from "@/lib/interview/mock";
import {
  makeInterviewAttempt,
  makeMockInterview,
} from "@/lib/test-support/fixtures";

const SKILL_SLUGS = new Set(SKILLS.map((skill) => skill.slug));

const SAMPLE_POSTING = `Senior Data Analyst

Responsibilities
- Write complex SQL queries with joins and aggregations against a warehouse.
- Clean data and check data quality before anyone reads a dashboard.
- Present findings to non-technical stakeholders every fortnight.

Required
- 4 years of experience with Python and pandas.
- You have strong statistics, including hypothesis testing and confidence intervals.

Nice to have
- Familiarity with dbt and star schema modelling.
- Experience with a BI tool such as Tableau.
`;

describe("interview question bank", () => {
  it("names only skills and roles this app actually has", () => {
    expect(INTERVIEW_QUESTIONS.length).toBeGreaterThan(30);

    for (const question of INTERVIEW_QUESTIONS) {
      expect(question.skills.length).toBeGreaterThan(0);

      for (const slug of question.skills) {
        expect(SKILL_SLUGS.has(slug)).toBe(true);
      }

      for (const track of question.tracks ?? []) {
        expect(isCareerTrackSlug(track)).toBe(true);
      }
    }
  });

  it("keeps every id, prompt, and helper in step with the list", () => {
    const ids = INTERVIEW_QUESTIONS.map((question) => question.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      const question = getInterviewQuestion(id);

      expect(question).not.toBeNull();
      expect(question?.prompt.length).toBeGreaterThan(12);
      expect(question?.goodAnswerCovers.length).toBeGreaterThan(1);
      expect(question?.followUps.length).toBeGreaterThan(0);
      expect(question?.askedWhy.length).toBeGreaterThan(20);
    }
  });

  it("gives every topic enough questions to fill an interview", () => {
    for (const topic of INTERVIEW_TOPICS) {
      const listed = listQuestionsForTopic(topic);

      expect(listed.length).toBeGreaterThan(2);
      expect(countQuestionsForTopic(topic)).toBe(listed.length);
      expect(listed.every((question) => question.topic === topic)).toBe(true);
    }

    const summaryTotal = INTERVIEW_TOPIC_SUMMARY.reduce(
      (total, row) => total + row.count,
      0,
    );

    expect(summaryTotal).toBe(INTERVIEW_QUESTIONS.length);
  });

  it("lists at least two role-specific questions for every track", () => {
    const tracksWithQuestions = new Set<string>();

    for (const question of INTERVIEW_QUESTIONS) {
      for (const track of question.tracks ?? []) tracksWithQuestions.add(track);
    }

    for (const question of INTERVIEW_QUESTIONS) {
      if (question.topic !== "role-specific") continue;

      expect(question.tracks?.length).toBeGreaterThan(0);
    }

    expect(tracksWithQuestions.size).toBe(9);
  });

  it("says plainly that no company's real questions were used", () => {
    expect(INTERVIEW_EVIDENCE_RULE).toContain("unverified");
    expect(INTERVIEW_EVIDENCE_RULE).toContain("records no evidence on its own");
    expect(
      INTERVIEW_QUESTIONS.some((question) =>
        /at Google|at Meta|at Amazon|from Google|from Meta/i.test(
          question.prompt,
        ),
      ),
    ).toBe(false);
  });
});

describe("job description reading", () => {
  it("finds the skills a posting names and quotes the words it used", () => {
    const reading = readJobDescription(SAMPLE_POSTING);

    const bySlug = new Map(reading.skills.map((skill) => [skill.slug, skill]));

    for (const slug of ["sql-joins", "pandas", "hypothesis-testing", "data-cleaning"]) {
      const found = bySlug.get(slug);

      expect(found, `${slug} should be read out of the sample posting`).toBeDefined();
      expect(found?.quoted.length).toBeGreaterThan(0);

      for (const phrase of found?.quoted ?? []) {
        expect(SAMPLE_POSTING.toLowerCase()).toContain(phrase);
      }
    }
  });

  it("separates what the posting requires from what it would prefer", () => {
    const reading = readJobDescription(SAMPLE_POSTING);
    const bySlug = new Map(reading.skills.map((skill) => [skill.slug, skill]));

    expect(bySlug.get("database-design")?.wanted).toBe("preferred");
    expect(bySlug.get("sql-joins")?.wanted).toBe("required");
    expect(reading.skills.filter((skill) => skill.wanted === "preferred").length)
      .toBeGreaterThan(0);
  });

  it("reads the role from the title instead of inventing one", () => {
    const reading = readJobDescription(SAMPLE_POSTING);

    expect(reading.roles.map((role) => role.slug)).toContain("data-analyst");

    for (const role of reading.roles) {
      expect(SAMPLE_POSTING.toLowerCase()).toContain(role.quoted[0] ?? "");
    }
  });

  it("will not turn a pay figure or a seniority word into a claim", () => {
    const reading = readJobDescription(
      `${SAMPLE_POSTING}\nSalary band: 90,000 to 110,000. This is a senior role.`,
    );

    expect(reading.ignored.join(" ")).toContain("money");
    expect(reading.ignored.join(" ")).toContain("seniority");
  });

  it("reports honestly when the text names nothing it knows", () => {
    const reading = readJobDescription(
      "We need someone who has done this before, at the right level, for our team.",
    );

    expect(reading.skills).toEqual([]);
    expect(reading.wordCount).toBeGreaterThan(5);
  });

  it("does not match a phrase inside an unrelated longer word", () => {
    const reading = readJobDescription(
      "Our team maintains a legacy report. You answer phones and explain the plan in a plain tone of R and JSON files.",
    );

    const slugs = reading.skills.map((skill) => skill.slug);

    expect(slugs).not.toContain("python-basics");
    expect(slugs).not.toContain("git-github");
  });

  it("only uses phrases that belong to a catalogue skill", () => {
    for (const slug of Object.keys(SKILL_PHRASE_CATALOGUE)) {
      expect(SKILL_SLUGS.has(slug)).toBe(true);
    }

    for (const skill of SKILLS) {
      expect(SKILL_PHRASE_CATALOGUE[skill.slug]).toBeDefined();
    }
  });
});

describe("skill gap comparison", () => {
  const reading = readJobDescription(SAMPLE_POSTING);

  it("labels a skill by the learner's own score, never by the posting", () => {
    const report = buildGapReport({
      reading,
      skillPercents: new Map([
        ["pandas", 20],
        ["sql-joins", 85],
      ]),
      evidenceLevels: new Map(),
    });
    const bySlug = new Map(report.positions.map((row) => [row.slug, row]));

    expect(bySlug.get("pandas")?.state).toBe("gap");
    expect(bySlug.get("sql-joins")?.state).toBe("supported");
    expect(bySlug.get("pandas")?.evidenceNote).toContain("20 of 100");
    expect(bySlug.get("data-cleaning")?.state).toBe("untested");
  });

  it("counts required and preferred separately and explains the total", () => {
    const report = buildGapReport({
      reading,
      skillPercents: new Map(),
      evidenceLevels: new Map(),
    });

    expect(report.total).toBe(report.positions.length);
    expect(report.requiredCount + report.preferredCount).toBe(report.total);
    expect(report.note).toContain(String(report.total));
    expect(report.note).toContain("36 skills");
  });

  it("names an unbacked preference instead of claiming full support", () => {
    const reading = readJobDescription(
      "Requirements: you write SQL with joins and grouping. Preferred: experience " +
        "with automated testing of the data pipeline, which our team relies on.",
    );
    const preferred = reading.skills.find((skill) => skill.wanted === "preferred");
    expect(preferred).toBeDefined();

    const report = buildGapReport({
      reading,
      skillPercents: new Map([
        ["sql-joins", 90],
        ["sql-aggregation", 90],
      ]),
      evidenceLevels: new Map(),
    });

    expect(report.focus).toContain("only as a preference");
    expect(report.focus).not.toContain("already support");

    const allBacked = buildGapReport({
      reading,
      skillPercents: new Map(
        reading.skills.map((skill) => [skill.slug, 90] as [string, number]),
      ),
      evidenceLevels: new Map(),
    });

    expect(allBacked.focus).toContain("already support");
  });

  it("points at one next action instead of a list of worries", () => {
    const withGap = buildGapReport({
      reading,
      skillPercents: new Map([["pandas", 15]]),
      evidenceLevels: new Map(),
    });

    expect(withGap.focus).toContain("first thing to study");

    const empty = buildGapReport({
      reading: readJobDescription("A short note about the team and our values."),
      skillPercents: new Map(),
      evidenceLevels: new Map(),
    });

    expect(empty.total).toBe(0);
    expect(empty.focus).toContain("Paste the responsibilities");
  });

  it("treats finished project work as support for a posting's skill", () => {
    const report = buildGapReport({
      reading,
      skillPercents: new Map(),
      evidenceLevels: new Map([["data-cleaning", "project_evidence"]]),
    });
    const row = report.positions.find((item) => item.slug === "data-cleaning");

    expect(row?.state).toBe("supported");
    expect(row?.evidenceNote).toContain("work you finished in a project");
  });
});

describe("practice interview planning", () => {
  it("fills the requested length from the chosen areas", () => {
    const plan = chooseMockQuestions({ topics: ["sql", "python"], count: 5 });

    expect(plan.questionIds.length).toBe(5);
    expect(new Set(plan.questionIds).size).toBe(5);

    for (const id of plan.questionIds) {
      expect(getInterviewQuestion(id)).not.toBeNull();
    }

    expect(plan.shortfall).toBeNull();
    expect(plan.label).toContain("5 questions");
  });

  it("refuses to build a plan shorter than it can run", () => {
    const plan = chooseMockQuestions({ topics: ["sql"], count: 1 });

    expect(plan.questionIds.length).toBeGreaterThanOrEqual(3);

    const capped = chooseMockQuestions({ topics: [], count: 99 });

    expect(capped.questionIds.length).toBe(MOCK_INTERVIEW_MAX_QUESTIONS);
  });

  it("says out loud when the bank cannot fill the plan", () => {
    const plan = chooseMockQuestions({
      topics: ["sql"],
      count: MOCK_INTERVIEW_MAX_QUESTIONS,
    });

    if (plan.questionIds.length < MOCK_INTERVIEW_MAX_QUESTIONS) {
      expect(plan.shortfall).toContain("instead of 12");
      expect(plan.shortfall).toContain(String(plan.questionIds.length));
    } else {
      expect(plan.shortfall).toBeNull();
    }
  });

  it("puts the least-practised questions first on a second pass", () => {
    const first = chooseMockQuestions({ topics: ["sql"], count: 4 });
    const attempts = first.questionIds.map((id, index) =>
      makeInterviewAttempt({
        id: `attempt-${index}`,
        questionId: id,
        topic: "sql",
      }),
    );
    const second = chooseMockQuestions({
      topics: ["sql"],
      count: 4,
      attempts,
    });

    const repeated = second.questionIds.filter((id) =>
      first.questionIds.includes(id),
    );

    expect(second.reasons.join(" ")).toMatch(/no attempt on record|repeats earlier practice/);
    expect(new Set(second.questionIds).size).toBe(second.questionIds.length);
    expect(repeated.length).toBeLessThanOrEqual(second.questionIds.length);
  });

  it("pulls in the role's own questions when a track is chosen", () => {
    const plan = chooseMockQuestions({
      topics: ["behavioural"],
      track: "data-engineer",
      count: 6,
    });
    const roleQuestions = plan.questionIds.filter((id) =>
      listQuestionsForTrack("data-engineer").some(
        (question) => question.id === id,
      ),
    );

    expect(roleQuestions.length).toBeGreaterThan(0);
    expect(plan.reasons.join(" ")).toContain("Data Engineer");
  });
});

describe("recording answers and finishing", () => {
  const attempts: InterviewAttemptRecord[] = [
    makeInterviewAttempt({
      id: "a1",
      questionId: "sql-group-by-select",
      topic: "sql",
      skills: ["sql-filtering"],
      rating: "covered",
    }),
    makeInterviewAttempt({
      id: "a2",
      questionId: "sql-left-join-null",
      topic: "sql",
      skills: ["sql-joins"],
      rating: "partial",
    }),
  ];

  it("counts only the questions with a rating", () => {
    const outcome = summarizeInterview({
      questionIds: ["sql-group-by-select", "sql-left-join-null", "python-read-traceback"],
      attempts,
    });

    expect(outcome.total).toBe(3);
    expect(outcome.answered).toBe(2);
    expect(outcome.covered).toBe(1);
    expect(outcome.partial).toBe(1);
    expect(outcome.missed).toBe(0);
    expect(outcome.ready).toBe(false);
    expect(outcome.notReadyMessage).toContain("1 of the 3 questions");
    expect(outcome.coveredPercent).toBe(33);
  });

  it("writes evidence only for a finished interview and only for answered it", () => {
    const finished = summarizeInterview({
      questionIds: ["sql-group-by-select", "sql-left-join-null"],
      attempts,
    });
    const interview = makeMockInterview({
      id: "interview-1",
      questionIds: ["sql-group-by-select", "sql-left-join-null"],
    });
    const drafts = buildInterviewEvidence({
      interview,
      attempts,
      outcome: finished,
    });

    expect(drafts.length).toBe(1);
    expect(drafts[0]?.skillSlug).toBe("sql-filtering");
    expect(drafts[0]?.notes).toContain("you rated");
    expect(drafts[0]?.notes).toContain("finished 2026-11-02");

    const unfinished = buildInterviewEvidence({
      interview: makeMockInterview({
        id: "interview-2",
        questionIds: ["sql-group-by-select"],
        completedAt: null,
      }),
      attempts,
      outcome: summarizeInterview({
        questionIds: ["sql-group-by-select"],
        attempts,
      }),
    });

    expect(unfinished).toEqual([]);
  });

  it("writes nothing for a skill outside the catalogue", () => {
    const attempt = makeInterviewAttempt({
      id: "a9",
      questionId: "sql-group-by-select",
      topic: "sql",
      skills: ["tableau-reporting"],
      rating: "covered",
    });
    const questionIds = ["sql-group-by-select"];
    const drafts = buildInterviewEvidence({
      interview: makeMockInterview({ id: "interview-3", questionIds }),
      attempts: [attempt],
      outcome: summarizeInterview({ questionIds, attempts: [attempt] }),
    });

    expect(drafts).toEqual([]);
  });

  it("counts each skill once even when two questions need it", () => {
    const pair = [
      makeInterviewAttempt({
        id: "b1",
        questionId: "sql-group-by-select",
        topic: "sql",
        skills: ["sql-filtering"],
        rating: "covered",
      }),
      makeInterviewAttempt({
        id: "b2",
        questionId: "sql-having-vs-where",
        topic: "sql",
        skills: ["sql-filtering"],
        rating: "covered",
      }),
    ];
    const questionIds = ["sql-group-by-select", "sql-having-vs-where"];
    const drafts = buildInterviewEvidence({
      interview: makeMockInterview({ id: "interview-4", questionIds }),
      attempts: pair,
      outcome: summarizeInterview({ questionIds, attempts: pair }),
    });

    expect(drafts.length).toBe(1);
  });

  it("keeps the three rating labels honest about what they prove", () => {
    expect(ANSWER_RATING_META.covered.countsAsEvidence).toBe(true);
    expect(ANSWER_RATING_META.partial.countsAsEvidence).toBe(false);
    expect(ANSWER_RATING_META["not-covered"].countsAsEvidence).toBe(false);
    expect(INTERVIEW_TOPIC_META.sql.whatItProbes.length).toBeGreaterThan(30);
  });
});

describe("practice materials from records", () => {
  it("builds a study list from a low score and a missed answer", () => {
    const rows = buildPracticeMaterials({
      skillPercents: new Map([["sql-joins", 25]]),
      attempts: [
        makeInterviewAttempt({
          id: "c1",
          questionId: "sql-group-by-select",
          topic: "sql",
          skills: ["sql-filtering"],
          rating: "not-covered",
        }),
      ],
    });
    const slugs = rows.map((row) => row.skillSlug);

    expect(slugs).toContain("sql-joins");
    expect(slugs).toContain("sql-filtering");

    for (const row of rows) {
      expect(row.questions.length).toBeGreaterThan(0);
      expect(row.advice).toContain("Worth a study block because");
      expect(row.skillName.length).toBeGreaterThan(2);
    }
  });

  it("produces nothing when no record shows a weakness", () => {
    const rows = buildPracticeMaterials({
      skillPercents: new Map([["sql-joins", 90]]),
      attempts: [],
    });

    expect(rows).toEqual([]);
  });

  it("caps the list so it stays a plan rather than a wall", () => {
    const many = new Map<string, number>();

    for (const skill of SKILLS.slice(0, 12)) {
      many.set(skill.slug, 10);
    }

    const rows = buildPracticeMaterials({ skillPercents: many, attempts: [] });

    expect(rows.length).toBeLessThanOrEqual(6);
  });

  it("refuses an answer longer than the field can hold", () => {
    expect(MAX_ANSWER_LENGTH).toBe(1_500);
  });
});
