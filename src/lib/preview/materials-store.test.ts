import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPreviewWorkspace,
  parsePreviewWorkspace,
  removePreviewJobApplication,
  removePreviewMaterialDraft,
  savePreviewMaterialDraft,
  savePreviewWorkspace,
} from "@/lib/preview/workspace-store";
import {
  MemoryStorage,
  makeDraftFingerprint,
  makeEvidenceRecord,
  makeJobApplication,
  makeMaterialDraft,
  makeProject,
} from "@/lib/test-support/fixtures";
import {
  MAX_DRAFT_LENGTH,
  MIN_DRAFT_LENGTH,
  type MaterialKind,
} from "@/lib/materials/types";
import { createEmptyWorkspace } from "@/lib/workspace/types";

const DRAFT =
  "I analyse sales data in SQL and Python, and I have finished two projects that " +
  "show it. I am looking for a data analyst role starting in spring.";

const TOO_SHORT = "Data analyst, three years of SQL.";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T10:00:00.000Z"));
  vi.stubGlobal("window", {
    localStorage: new MemoryStorage(),
    dispatchEvent: vi.fn(),
  });

  savePreviewWorkspace(createEmptyWorkspace());
});

function draftOf(kind: MaterialKind) {
  return loadPreviewWorkspace().materials.find((entry) => entry.kind === kind);
}

function save(input: Record<string, unknown> = {}) {
  return savePreviewMaterialDraft({
    kind: "resume",
    content: DRAFT,
    targetRole: null,
    applicationId: null,
    ...input,
  });
}

describe("preview application material drafts", () => {
  it("saves your own wording beside the generated lines", () => {
    const result = save();
    const draft = draftOf("resume");

    expect(result.ok).toBe(true);
    expect(draft?.content).toBe(DRAFT);
    expect(draft?.createdAt).toBe("2026-11-02T10:00:00.000Z");
  });

  it("keeps one draft per document and replaces the earlier wording", () => {
    save();
    const firstId = draftOf("resume")?.id;

    vi.setSystemTime(new Date("2026-11-03T10:00:00.000Z"));

    const rewritten =
      "Rewritten text that is comfortably longer than the sixty characters this " +
      "app needs before it agrees to store something as a document.";
    const replaced = save({ content: rewritten });

    expect(replaced.ok).toBe(true);
    expect(loadPreviewWorkspace().materials).toHaveLength(1);
    expect(draftOf("resume")).toMatchObject({
      id: firstId,
      content: rewritten,
      createdAt: "2026-11-02T10:00:00.000Z",
      updatedAt: "2026-11-03T10:00:00.000Z",
    });
    expect(replaced.message).toContain("was replaced");
  });

  it("stores two documents side by side without merging them", () => {
    save();
    save({ kind: "linkedin", content: DRAFT });

    expect(loadPreviewWorkspace().materials.map((entry) => entry.kind).sort()).toEqual(
      ["linkedin", "resume"],
    );
  });

  it("refuses wording too short to be a document and says how short", () => {
    const result = save({ content: TOO_SHORT });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(`${TOO_SHORT.trim().length} characters`);
    expect(result.message).toContain(String(MIN_DRAFT_LENGTH));
    expect(loadPreviewWorkspace().materials).toEqual([]);
  });

  it("refuses wording longer than the field can hold", () => {
    const result = save({ content: "a".repeat(MAX_DRAFT_LENGTH + 1) });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(MAX_DRAFT_LENGTH));
  });

  it("counts the records the draft was written against", () => {
    savePreviewWorkspace({
      ...createEmptyWorkspace(),
      projects: [
        makeProject({
          id: "project-1",
          title: "Synthetic expense analysis",
          status: "completed",
          repoUrl: "https://example.com/one",
          completedAt: "2026-11-01T10:00:00.000Z",
        }),
        makeProject({ id: "project-2", status: "in_progress" }),
      ],
      evidence: [
        makeEvidenceRecord({ skillSlug: "sql-filtering", sourceId: "project-1" }),
      ],
    });

    save();

    expect(draftOf("resume")?.builtFrom).toMatchObject({
      savedAt: "2026-11-02T10:00:00.000Z",
      latestProject: "Synthetic expense analysis",
      completedProjects: 1,
      linkedProjects: 1,
      skillRecords: 1,
      shownSkills: 1,
      assessmentTaken: false,
    });
  });

  it("points a draft at a role saved in this browser", () => {
    savePreviewWorkspace({
      ...createEmptyWorkspace(),
      jobApplications: [makeJobApplication({ id: "application-1" })],
    });

    const result = save({ applicationId: "application-1", targetRole: "Data Analyst" });

    expect(result.ok).toBe(true);
    expect(draftOf("resume")).toMatchObject({
      applicationId: "application-1",
      targetRole: "Data Analyst",
    });
  });

  it("keeps your wording when the role it pointed at is removed", () => {
    savePreviewWorkspace({
      ...createEmptyWorkspace(),
      jobApplications: [makeJobApplication({ id: "application-1" })],
    });
    save({ applicationId: "application-1" });

    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));

    const removed = removePreviewJobApplication("application-1");

    expect(removed.ok).toBe(true);
    expect(loadPreviewWorkspace().jobApplications).toEqual([]);
    expect(draftOf("resume")).toMatchObject({
      content: DRAFT,
      applicationId: null,
      createdAt: "2026-11-02T10:00:00.000Z",
      updatedAt: "2026-11-04T10:00:00.000Z",
    });
  });

  it("refuses a role that is not saved here", () => {
    const result = save({ applicationId: "application-999" });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("not saved in this browser");
    expect(loadPreviewWorkspace().materials).toEqual([]);
  });

  it("removes only the draft of the document you asked about", () => {
    save();
    save({ kind: "portfolio", content: DRAFT });

    const removed = removePreviewMaterialDraft("portfolio");

    expect(removed.ok).toBe(true);
    expect(loadPreviewWorkspace().materials.map((entry) => entry.kind)).toEqual([
      "resume",
    ]);
    expect(removed.message).toContain("Portfolio review");
  });

  it("says so when there is nothing of that kind to remove", () => {
    const removed = removePreviewMaterialDraft("linkedin");

    expect(removed.ok).toBe(false);
    expect(removed.message).toContain("no saved LinkedIn guidance draft");
  });

  it("keeps your wording and reports a damaged fingerprint as missing", () => {
    const raw = JSON.stringify({
      version: 1,
      ...createEmptyWorkspace(),
      materials: [
        makeMaterialDraft({ id: "draft-1", kind: "resume" }),
        makeMaterialDraft({ id: "draft-2", kind: "cover-letter" as MaterialKind }),
        { id: "draft-3", kind: "resume" },
        makeMaterialDraft({
          id: "draft-4",
          kind: "linkedin",
          builtFrom: makeDraftFingerprint({ completedProjects: -3 }),
        }),
      ],
    });
    const parsed = parsePreviewWorkspace(raw);

    expect(parsed.materials.map((entry) => entry.id)).toEqual([
      "draft-1",
      "draft-4",
    ]);
    expect(parsed.materials[0]?.builtFrom).not.toBeNull();
    expect(parsed.materials[1]).toMatchObject({
      builtFrom: null,
      content: makeMaterialDraft({ id: "draft-4", kind: "linkedin" }).content,
    });
  });
});
