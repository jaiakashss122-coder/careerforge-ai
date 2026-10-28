import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/lib/navigation";
import {
  isAuthRoute,
  isProtectedRoute,
  safeNextPath,
} from "@/lib/auth/routes";

describe("auth route boundaries", () => {
  it("recognizes auth routes and their children", () => {
    expect(isAuthRoute("/sign-in")).toBe(true);
    expect(isAuthRoute("/sign-up")).toBe(true);
    expect(isAuthRoute("/sign-in/reset")).toBe(true);
    expect(isAuthRoute("/dashboard")).toBe(false);
    expect(isAuthRoute("/sign-in-again")).toBe(false);
  });

  it("protects every workspace route", () => {
    /**
     * The proxy is what keeps an anonymous request off a page that reads the
     * session, so a destination that is reachable in the navigation has to be in
     * the protected list too. Reading the list from the navigation means adding
     * a screen cannot silently skip that step.
     */
    const routes = [
      ...NAV_ITEMS.map((item) => item.href),
      "/onboarding",
      "/account/close",
    ];

    for (const route of routes) {
      expect(isProtectedRoute(route), route).toBe(true);
    }

    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/sign-in")).toBe(false);
    expect(isProtectedRoute("/settings-extra")).toBe(false);
    expect(isProtectedRoute("/account-not-closed")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps internal destinations", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/roadmap?phase=1")).toBe("/roadmap?phase=1");
    expect(safeNextPath("/settings#environment")).toBe(
      "/settings#environment",
    );
  });

  it("falls back for external, protocol-relative, or malformed targets", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("dashboard")).toBe("/dashboard");
    expect(safeNextPath("/%2F%2Fevil.example.com")).toBe(
      "/%2F%2Fevil.example.com",
    );
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(`/${"a".repeat(513)}`)).toBe("/dashboard");
  });

  it("does not bounce back into auth screens after sign-in", () => {
    expect(safeNextPath("/sign-in")).toBe("/dashboard");
    expect(safeNextPath("/sign-in?next=/settings")).toBe("/dashboard");
    expect(safeNextPath("/sign-up/confirm")).toBe("/dashboard");
  });

  it("supports a caller-defined fallback", () => {
    expect(safeNextPath("https://evil.example.com", "/onboarding")).toBe(
      "/onboarding",
    );
  });
});
