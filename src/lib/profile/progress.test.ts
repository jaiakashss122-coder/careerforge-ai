import { describe, expect, it } from "vitest";
import { defaultProfileInput } from "@/lib/profile/defaults";
import { getProfileChecklist } from "@/lib/profile/progress";

describe("getProfileChecklist", () => {
  it("separates required and optional profile details", () => {
    const checklist = getProfileChecklist(
      defaultProfileInput({ fullName: "Jai Akash" }),
    );

    expect(checklist.items).toHaveLength(9);
    expect(checklist.requiredTotal).toBe(7);
    expect(checklist.requiredComplete).toBe(7);
    expect(checklist.percent).toBe(100);
    expect(checklist.items.filter((item) => item.required)).toHaveLength(7);
    expect(checklist.items.filter((item) => !item.required)).toHaveLength(2);
  });

  it("does not award completion for a missing name", () => {
    const checklist = getProfileChecklist(defaultProfileInput());

    expect(checklist.requiredComplete).toBe(6);
    expect(checklist.percent).toBe(86);
    expect(
      checklist.items.find((item) => item.id === "name")?.complete,
    ).toBe(false);
  });

  it("marks all required items complete for the default profile plus a name", () => {
    const checklist = getProfileChecklist(
      defaultProfileInput({ fullName: "Jai Akash" }),
    );

    expect(checklist.items.filter((item) => item.required).every((i) => i.complete)).toBe(
      true,
    );
    expect(checklist.items.find((item) => item.id === "internship")?.complete).toBe(
      false,
    );
    expect(checklist.items.find((item) => item.id === "constraints")?.complete).toBe(
      false,
    );
  });

  it("has unique item ids", () => {
    const checklist = getProfileChecklist(defaultProfileInput());
    const ids = checklist.items.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
