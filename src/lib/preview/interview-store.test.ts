import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishPreviewMockInterview,
  loadPreviewWorkspace,
  recordPreviewInterviewAnswer,
  removePreviewInterviewAttempt,
  removePreviewJobApplication,
  removePreviewMockInterview,
  savePreviewJobApplication,
  savePreviewWorkspace,
  startPreviewMockInterview,
  updatePreviewApplicationProgress,
} from "@/lib/preview/workspace-store";
import { MemoryStorage } from "@/lib/test-support/fixtures";
import { getInterviewQuestion } from "@/lib/interview/questions";
import {
  ANSWER_RATING_META,
  MAX_ANSWER_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  type AnswerRating,
  type ApplicationSourceKind,
  type ApplicationStatus,
  type InterviewTopic,
  type MockInterviewRecord,
} from "@/lib/interview/types";
import { SKILLS } from "@/lib/skills/catalog";
import { createEmptyWorkspace } from "@/lib/workspace/types";

const SKILL_SLUGS = new Set(SKILLS.map((skill) => skill.slug));

const POSTING =
  "You will write SQL against our warehouse, use python and pandas for data cleaning, " +
  "and build regression models that the product team relies on every week.";

beforeEach(() => {
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });

  savePreviewWorkspace(createEmptyWorkspace());
});

function openInterview(topics: InterviewTopic[] = ["python"], count = 3) {
  const result = startPreviewMockInterview({ topics, track: null, count });
  const interview = loadPreviewWorkspace().mockInterviews[0];

  return { result, interview };
}

function rateEveryQuestion(
  interview: MockInterviewRecord,
  rating: AnswerRating,
) {
  for (const questionId of interview.questionIds) {
    const recorded = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: `My own words for ${questionId}.`,
      rating,
    });

    expect(recorded.ok).toBe(true);
  }
}

function interviewEvidence() {
  return loadPreviewWorkspace().evidence.filter(
    (record) => record.sourceType === "interview",
  );
}

function applicationInput(overrides: Record<string, unknown> = {}) {
  return {
    company: "Synthetic Analytics Co",
    roleTitle: "Data Scientist, Product Analytics",
    jobUrl: "",
    location: "",
    sourceKind: "real" as ApplicationSourceKind,
    status: "saved" as ApplicationStatus,
    appliedOn: "",
    nextAction: "",
    nextActionOn: "",
    notes: "",
    description: POSTING,
    ...overrides,
  };
}

function progressInput(
  applicationId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    applicationId,
    status: "prepared" as ApplicationStatus,
    appliedOn: "",
    nextAction: "",
    nextActionOn: "",
    notes: "",
    description: POSTING,
    ...overrides,
  };
}

describe("opening a practice interview in preview", () => {
  it("writes nothing to the skill records until the interview is finished", () => {
    const { result, interview } = openInterview();

    expect(result.ok).toBe(true);
    expect(interview.questionIds).toHaveLength(3);
    expect(interview.completedAt).toBeNull();
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(0);
    expect(interviewEvidence()).toHaveLength(0);
    expect(result.message).toContain("Nothing is written to your skill records");
  });

  it("refuses an interview with no area chosen", () => {
    const result = startPreviewMockInterview({ topics: [], track: null, count: 3 });

    expect(result).toEqual({
      ok: false,
      message: "Pick at least one area to practise.",
    });
    expect(loadPreviewWorkspace().mockInterviews).toHaveLength(0);
  });

  it("refuses a question count outside the range the bank can fill", () => {
    for (const count of [2, 13, 4.5]) {
      const result = startPreviewMockInterview({
        topics: ["python"],
        track: null,
        count,
      });

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Choose a whole number of questions");
    }

    expect(loadPreviewWorkspace().mockInterviews).toHaveLength(0);
  });

  it("keeps two open interviews separate", () => {
    const first = openInterview(["python"]);
    const second = openInterview(["sql"]);

    expect(first.interview.questionIds.some((id) =>
      second.interview.questionIds.includes(id),
    )).toBe(false);
    expect(loadPreviewWorkspace().mockInterviews).toHaveLength(2);
  });
});

describe("recording an answer in preview", () => {
  it("stores the question wording at the moment of answering", () => {
    const { interview } = openInterview();
    const [questionId] = interview.questionIds;
    const question = getInterviewQuestion(questionId);

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: "  I would move the default into the function body.  ",
      rating: "covered",
    });

    const [attempt] = loadPreviewWorkspace().interviewAttempts;

    expect(result.ok).toBe(true);
    expect(result.message).toContain(ANSWER_RATING_META.covered.label);
    expect(attempt.prompt).toBe(question?.prompt);
    expect(attempt.skills).toEqual(question?.skills);
    expect(attempt.answerText).toBe("I would move the default into the function body.");
    expect(attempt.topic).toBe(question?.topic);
    expect(interviewEvidence()).toHaveLength(0);
  });

  it("refuses a question that is not part of the open interview", () => {
    const { interview } = openInterview(["python"]);

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId: "sql-group-by-select",
      answerText: "An answer to a question this interview did not ask.",
      rating: "covered",
    });

    expect(result).toEqual({
      ok: false,
      message: "That question is not part of this interview.",
    });
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(0);
  });

  it("refuses a question id the bank does not contain", () => {
    const { interview } = openInterview();

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId: "invented-question",
      answerText: "Anything at all.",
      rating: "covered",
    });

    expect(result).toEqual({
      ok: false,
      message: "That question is not one this app asks.",
    });
  });

  it("refuses a second rating for the same question instead of overwriting it", () => {
    const { interview } = openInterview();
    const [questionId] = interview.questionIds;

    recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: "First version.",
      rating: "covered",
    });

    const second = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: "Second version.",
      rating: "not-covered",
    });

    expect(second.ok).toBe(false);
    expect(second.message).toContain("Remove the answer first");

    const attempts = loadPreviewWorkspace().interviewAttempts;

    expect(attempts).toHaveLength(1);
    expect(attempts[0].rating).toBe("covered");
    expect(attempts[0].answerText).toBe("First version.");
  });

  it("refuses an answer longer than the field holds", () => {
    const { interview } = openInterview();
    const [questionId] = interview.questionIds;

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: "a".repeat(MAX_ANSWER_LENGTH + 1),
      rating: "covered",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(`${MAX_ANSWER_LENGTH} characters`);
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(0);
  });

  it("refuses a rating that is not one of the three", () => {
    const { interview } = openInterview();
    const [questionId] = interview.questionIds;

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId,
      answerText: "An answer.",
      rating: "maybe" as AnswerRating,
    });

    expect(result).toEqual({
      ok: false,
      message: "Choose one of the three answers about how it went.",
    });
  });

  it("refuses to answer an interview that is not in this browser", () => {
    const { interview } = openInterview();
    const [questionId] = interview.questionIds;

    const result = recordPreviewInterviewAnswer({
      interviewId: "00000000-0000-4000-8000-000000000000",
      questionId,
      answerText: "An answer.",
      rating: "covered",
    });

    expect(result).toEqual({
      ok: false,
      message: "That interview is not open in this browser.",
    });
  });
});

describe("finishing a practice interview in preview", () => {
  it("refuses until every question carries a rating", () => {
    const { interview } = openInterview();

    recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId: interview.questionIds[0],
      answerText: "One answer out of three.",
      rating: "covered",
    });

    const result = finishPreviewMockInterview(interview.id);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("2 of the 3 questions");
    expect(result.message).toContain("no rating yet");
    expect(loadPreviewWorkspace().mockInterviews[0].completedAt).toBeNull();
    expect(interviewEvidence()).toHaveLength(0);
  });

  it("writes one unverified record per distinct skill you rated as answered", () => {
    const { interview } = openInterview();

    rateEveryQuestion(interview, "covered");

    const result = finishPreviewMockInterview(interview.id);
    const records = interviewEvidence();
    const expectedSlugs = new Set(
      loadPreviewWorkspace().interviewAttempts.flatMap((attempt) => attempt.skills),
    );

    expect(result.ok).toBe(true);
    expect([...expectedSlugs].every((slug) => SKILL_SLUGS.has(slug))).toBe(true);
    expect(records.map((record) => record.skillSlug).sort()).toEqual(
      [...expectedSlugs].sort(),
    );
    expect(records.every((record) => record.verified === false)).toBe(true);
    expect(records.every((record) => record.sourceType === "interview")).toBe(true);
    expect(
      records.every((record) => record.sourceId === interview.id),
    ).toBe(true);
    expect(records.every((record) => record.score === null)).toBe(true);
  });

  it("writes no skill record when every answer was part-answered or missed", () => {
    const { interview } = openInterview();

    rateEveryQuestion(interview, "partial");

    const result = finishPreviewMockInterview(interview.id);

    expect(result.ok).toBe(true);
    expect(result.message).toContain("No skill record was written");
    expect(interviewEvidence()).toHaveLength(0);
    expect(loadPreviewWorkspace().mockInterviews[0].completedAt).not.toBeNull();
  });

  it("refuses to finish the same interview twice", () => {
    const { interview } = openInterview();

    rateEveryQuestion(interview, "covered");
    expect(finishPreviewMockInterview(interview.id).ok).toBe(true);

    const before = interviewEvidence().length;
    const second = finishPreviewMockInterview(interview.id);

    expect(second).toEqual({ ok: false, message: "That interview is already finished." });
    expect(interviewEvidence()).toHaveLength(before);
  });

  it("refuses an interview id this browser does not hold", () => {
    expect(
      finishPreviewMockInterview("00000000-0000-4000-8000-000000000000"),
    ).toEqual({ ok: false, message: "That interview is not in this browser." });
  });

  it("closes the answers of a finished interview", () => {
    const { interview } = openInterview();

    rateEveryQuestion(interview, "covered");
    finishPreviewMockInterview(interview.id);

    const result = recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId: interview.questionIds[0],
      answerText: "Trying to rewrite a finished answer.",
      rating: "not-covered",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("already finished");
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(3);
  });

  it("keeps answers from a finished interview out of reach of removal", () => {
    const { interview } = openInterview();

    rateEveryQuestion(interview, "covered");
    finishPreviewMockInterview(interview.id);

    const [attempt] = loadPreviewWorkspace().interviewAttempts;
    const result = removePreviewInterviewAttempt(attempt.id);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Remove the interview itself");
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(3);
  });

  it("removes an open answer so it counts toward nothing", () => {
    const { interview } = openInterview();

    recordPreviewInterviewAnswer({
      interviewId: interview.id,
      questionId: interview.questionIds[0],
      answerText: "A draft answer I want to replace.",
      rating: "partial",
    });

    const [attempt] = loadPreviewWorkspace().interviewAttempts;
    const removed = removePreviewInterviewAttempt(attempt.id);

    expect(removed.ok).toBe(true);
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(0);
    expect(interviewEvidence()).toHaveLength(0);
  });

  it("refuses to remove an answer that is not there", () => {
    expect(removePreviewInterviewAttempt("missing-attempt")).toEqual({
      ok: false,
      message: "That answer no longer exists.",
    });
  });

  it("removing an interview also removes its answers and the records it wrote", () => {
    const other = openInterview(["sql"]);
    const { interview } = openInterview(["python"]);

    rateEveryQuestion(interview, "covered");
    finishPreviewMockInterview(interview.id);

    expect(interviewEvidence().length).toBeGreaterThan(0);

    const result = removePreviewMockInterview(interview.id);

    expect(result.ok).toBe(true);
    expect(loadPreviewWorkspace().mockInterviews).toHaveLength(1);
    expect(loadPreviewWorkspace().mockInterviews[0].id).toBe(other.interview.id);
    expect(loadPreviewWorkspace().interviewAttempts).toHaveLength(0);
    expect(interviewEvidence()).toHaveLength(0);
  });

  it("refuses to remove an interview that is not there", () => {
    expect(
      removePreviewMockInterview("00000000-0000-4000-8000-000000000000"),
    ).toEqual({
      ok: false,
      message: "That practice interview no longer exists.",
    });
  });
});

describe("saving a role in preview", () => {
  it("stores the skills read out of the pasted posting", () => {
    const result = savePreviewJobApplication(applicationInput());
    const [application] = loadPreviewWorkspace().jobApplications;

    expect(result.ok).toBe(true);
    expect(result.message).toContain(`${SKILLS.length} skills this app knows`);
    expect(application.description).toBe(POSTING);
    expect(application.skills).toContain("sql-filtering");
    expect(application.skills).toContain("python-basics");
    expect(application.skills).toContain("regression");
    expect(application.skills.every((slug) => SKILL_SLUGS.has(slug))).toBe(true);
  });

  it("saves a role with no posting text and says there is nothing to compare", () => {
    const result = savePreviewJobApplication(applicationInput({ description: "" }));
    const [application] = loadPreviewWorkspace().jobApplications;

    expect(result.ok).toBe(true);
    expect(result.message).toContain("no comparison is shown");
    expect(application.skills).toEqual([]);
  });

  it("refuses a posting too short to read anything out of", () => {
    const result = savePreviewJobApplication(
      applicationInput({ description: "Senior data scientist needed." }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain(`${MIN_JOB_DESCRIPTION_LENGTH} characters`);
    expect(loadPreviewWorkspace().jobApplications).toHaveLength(0);
  });

  it("refuses an applied role with no date attached", () => {
    const result = savePreviewJobApplication(
      applicationInput({ status: "applied", appliedOn: "" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("needs the date you sent it");
    expect(loadPreviewWorkspace().jobApplications).toHaveLength(0);
  });

  it("refuses a link that is not a web address and a date that is not a day", () => {
    const badLink = savePreviewJobApplication(
      applicationInput({ jobUrl: "javascript:alert(1)" }),
    );
    const badDate = savePreviewJobApplication(
      applicationInput({ appliedOn: "27-10-2026" }),
    );

    expect(badLink.message).toContain("must start with http:// or https://");
    expect(badDate.message).toContain("needs the date form 2026-10-27");
    expect(loadPreviewWorkspace().jobApplications).toHaveLength(0);
  });

  it("refuses a missing organisation or role title", () => {
    expect(
      savePreviewJobApplication(applicationInput({ company: "   " })),
    ).toEqual({ ok: false, message: "Write the organisation this role is at." });
    expect(
      savePreviewJobApplication(applicationInput({ roleTitle: "" })),
    ).toEqual({
      ok: false,
      message: "Write the role title as the posting words it.",
    });
  });
});

describe("changing a saved role in preview", () => {
  it("replaces the posting text and re-reads the skills from it", () => {
    savePreviewJobApplication(applicationInput({ description: "" }));
    const [application] = loadPreviewWorkspace().jobApplications;

    expect(application.skills).toEqual([]);

    const result = updatePreviewApplicationProgress(
      progressInput(application.id, { status: "prepared" }),
    );
    const updated = loadPreviewWorkspace().jobApplications[0];

    expect(result.ok).toBe(true);
    expect(result.message).toContain("were found in it");
    expect(updated.description).toBe(POSTING);
    expect(updated.skills.length).toBeGreaterThan(0);
    expect(updated.skills).toContain("pandas");
  });

  it("clears the posting text when the field is emptied", () => {
    savePreviewJobApplication(applicationInput());
    const [application] = loadPreviewWorkspace().jobApplications;

    const result = updatePreviewApplicationProgress(
      progressInput(application.id, { description: "   " }),
    );
    const updated = loadPreviewWorkspace().jobApplications[0];

    expect(result.ok).toBe(true);
    expect(result.message).toContain("posting text was cleared");
    expect(updated.description).toBe("");
    expect(updated.skills).toEqual([]);
  });

  it("refuses a half-pasted posting instead of saving it", () => {
    savePreviewJobApplication(applicationInput());
    const [application] = loadPreviewWorkspace().jobApplications;

    const result = updatePreviewApplicationProgress(
      progressInput(application.id, { description: "We use sql and python." }),
    );
    const updated = loadPreviewWorkspace().jobApplications[0];

    expect(result.ok).toBe(false);
    expect(result.message).toContain("or clear the field to store no text at all");
    expect(updated.description).toBe(POSTING);
    expect(updated.status).toBe("saved");
  });

  it("changes only the role it names and records what the new status means", () => {
    savePreviewJobApplication(applicationInput());
    savePreviewJobApplication(applicationInput({ company: "Second Co" }));

    const [second, first] = loadPreviewWorkspace().jobApplications;
    const result = updatePreviewApplicationProgress(
      progressInput(first.id, {
        status: "interviewing",
        nextAction: "Prep the system design round",
        nextActionOn: "2026-11-04",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Interviewing");

    const [unchangedSecond, changedFirst] =
      loadPreviewWorkspace().jobApplications;

    expect(unchangedSecond.id).toBe(second.id);
    expect(unchangedSecond.status).toBe("saved");
    expect(changedFirst.status).toBe("interviewing");
    expect(changedFirst.nextAction).toBe("Prep the system design round");
    expect(changedFirst.nextActionOn).toBe("2026-11-04");
  });

  it("refuses an applied status with no date and a date in the wrong form", () => {
    savePreviewJobApplication(applicationInput());
    const [application] = loadPreviewWorkspace().jobApplications;

    const noDate = updatePreviewApplicationProgress(
      progressInput(application.id, { status: "applied", appliedOn: "" }),
    );
    const wrongForm = updatePreviewApplicationProgress(
      progressInput(application.id, { nextActionOn: "next tuesday" }),
    );

    expect(noDate.ok).toBe(false);
    expect(noDate.message).toContain("needs the date you sent it");
    expect(wrongForm.ok).toBe(false);
    expect(wrongForm.message).toContain("needs the date form");
    expect(loadPreviewWorkspace().jobApplications[0].status).toBe("saved");
  });

  it("refuses a role that is not in this browser", () => {
    const result = updatePreviewApplicationProgress(
      progressInput("00000000-0000-4000-8000-000000000000"),
    );

    expect(result).toEqual({
      ok: false,
      message: "That saved role is not in this browser.",
    });
  });

  it("refuses a status this app does not record", () => {
    savePreviewJobApplication(applicationInput());
    const [application] = loadPreviewWorkspace().jobApplications;

    const result = updatePreviewApplicationProgress(
      progressInput(application.id, { status: "hired" as ApplicationStatus }),
    );

    expect(result).toEqual({
      ok: false,
      message: "That status is not one this app records.",
    });
  });

  it("removes a saved role and nothing else", () => {
    savePreviewJobApplication(applicationInput());
    const { interview } = openInterview();

    rateEveryQuestion(interview, "covered");
    finishPreviewMockInterview(interview.id);

    const [application] = loadPreviewWorkspace().jobApplications;
    const evidenceBefore = interviewEvidence().length;

    const result = removePreviewJobApplication(application.id);

    expect(result.ok).toBe(true);
    expect(loadPreviewWorkspace().jobApplications).toHaveLength(0);
    expect(loadPreviewWorkspace().mockInterviews).toHaveLength(1);
    expect(interviewEvidence()).toHaveLength(evidenceBefore);
  });

  it("refuses to remove a role that is not there", () => {
    expect(removePreviewJobApplication("missing-role")).toEqual({
      ok: false,
      message: "That saved role no longer exists.",
    });
  });
});
