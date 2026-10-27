import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultProfileInput } from "@/lib/profile/defaults";
import {
  clearPreviewProfile,
  createDefaultPreviewProfile,
  loadPreviewProfile,
  parsePreviewProfile,
  PREVIEW_EMAIL,
  PREVIEW_PROFILE_ID,
  savePreviewProfile,
} from "@/lib/preview/profile-store";

function validRaw(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    ...defaultProfileInput({ fullName: "Jai Akash" }),
    id: "not-the-preview-id",
    email: "not@preview.local",
    onboardingCompleted: true,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
    ...overrides,
  });
}

describe("preview profile parsing", () => {
  it("validates stored input and forces the preview identity", () => {
    const profile = parsePreviewProfile(validRaw());

    expect(profile).not.toBeNull();
    expect(profile?.id).toBe(PREVIEW_PROFILE_ID);
    expect(profile?.email).toBe(PREVIEW_EMAIL);
    expect(profile?.fullName).toBe("Jai Akash");
    expect(profile?.onboardingCompleted).toBe(true);
    expect(profile?.updatedAt).toBe("2026-10-02T10:00:00.000Z");
  });

  it("returns null for missing, malformed, or tampered storage", () => {
    expect(parsePreviewProfile(null)).toBeNull();
    expect(parsePreviewProfile("{")).toBeNull();
    expect(parsePreviewProfile("[]")).toBeNull();
    expect(
      parsePreviewProfile(validRaw({ pythonLevel: "world-class" })),
    ).toBeNull();
    expect(
      parsePreviewProfile(validRaw({ learningPreferences: [] })),
    ).toBeNull();
  });
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preview profile persistence", () => {
  it("saves, reloads, and clears a browser-local profile", () => {
    vi.stubGlobal("window", {
      localStorage: new MemoryStorage(),
      dispatchEvent: vi.fn(),
    });

    const saved = savePreviewProfile(
      defaultProfileInput({ fullName: "Jai Akash" }),
      null,
    );

    expect(saved.onboardingCompleted).toBe(true);
    expect(loadPreviewProfile()?.fullName).toBe("Jai Akash");
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);

    clearPreviewProfile();
    expect(loadPreviewProfile()).toBeNull();
  });

  it("builds an unsaved default that becomes valid once a name is added", () => {
    const profile = createDefaultPreviewProfile();

    expect(profile.fullName).toBe("");
    expect(profile.onboardingCompleted).toBe(false);
    expect(profile.weeklyHours).toBe(10);
    expect(parsePreviewProfile(JSON.stringify(profile))).toBeNull();
    expect(
      parsePreviewProfile(
        JSON.stringify({ ...profile, fullName: "Jai Akash" }),
      ),
    ).not.toBeNull();
  });
});
