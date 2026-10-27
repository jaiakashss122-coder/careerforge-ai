import { describe, expect, it } from "vitest";
import { defaultProfileInput } from "@/lib/profile/defaults";
import {
  parseProfileFormData,
  profileSchema,
  type ProfileInput,
} from "@/lib/profile/schema";

function profileFormData(overrides: Partial<ProfileInput> = {}) {
  const input = defaultProfileInput({
    fullName: "Jai Akash",
    ...overrides,
  });
  const formData = new FormData();

  for (const [key, value] of Object.entries(input)) {
    if (key === "learningPreferences" || key === "tools") {
      for (const item of value as string[]) {
        formData.append(key, item);
      }
      continue;
    }

    formData.set(key, value == null ? "" : String(value));
  }

  return formData;
}

describe("profileSchema", () => {
  it("accepts the brief's default profile once a name is provided", () => {
    const parsed = profileSchema.safeParse(
      defaultProfileInput({ fullName: "Jai Akash" }),
    );

    expect(parsed.success).toBe(true);
  });

  it("trims user-entered text", () => {
    const parsed = profileSchema.safeParse(
      defaultProfileInput({ fullName: "  Jai Akash  " }),
    );

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fullName).toBe("Jai Akash");
    }
  });

  it("rejects a decided career status without a target role", () => {
    const parsed = profileSchema.safeParse(
      defaultProfileInput({
        fullName: "Jai Akash",
        careerStatus: "decided",
        targetCareerSlug: null,
      }),
    );

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(["targetCareerSlug"]);
    }
  });

  it("rejects an unknown self-reported level", () => {
    const parsed = profileSchema.safeParse({
      ...defaultProfileInput({ fullName: "Jai Akash" }),
      pythonLevel: "expert",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("parseProfileFormData", () => {
  it("parses checkbox groups and numeric fields from FormData", () => {
    const formData = profileFormData({
      weeklyHours: 8,
      preferredSessionMinutes: 90,
      learningPreferences: ["practical-projects", "visual-explanations"],
      tools: ["vscode", "terminal"],
      internshipTargetMonth: "2027-06",
    });

    const parsed = parseProfileFormData(formData);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.weeklyHours).toBe(8);
      expect(parsed.data.preferredSessionMinutes).toBe(90);
      expect(parsed.data.learningPreferences).toEqual([
        "practical-projects",
        "visual-explanations",
      ]);
      expect(parsed.data.tools).toEqual(["vscode", "terminal"]);
      expect(parsed.data.internshipTargetMonth).toBe("2027-06");
    }
  });

  it("returns field errors without throwing for an empty name", () => {
    const formData = profileFormData({ fullName: "" });

    const parsed = parseProfileFormData(formData);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors.fullName?.length).toBeGreaterThan(0);
      expect(parsed.message).toContain("need attention");
    }
  });

  it("rejects a weekly availability of zero", () => {
    const parsed = parseProfileFormData(profileFormData({ weeklyHours: 0 }));

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors.weeklyHours?.length).toBeGreaterThan(0);
    }
  });

  it("rejects an empty learning-preferences selection", () => {
    const parsed = parseProfileFormData(
      profileFormData({ learningPreferences: [] }),
    );

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors.learningPreferences?.length).toBeGreaterThan(0);
    }
  });

  it("rejects malformed internship months", () => {
    const parsed = parseProfileFormData(
      profileFormData({ internshipTargetMonth: "summer-2027" }),
    );

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.fieldErrors.internshipTargetMonth?.length).toBeGreaterThan(0);
    }
  });
});
