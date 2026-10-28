export const AUTH_ROUTES = ["/sign-in", "/sign-up"] as const;

export const PROTECTED_PREFIXES = [
  "/assessment",
  "/dashboard",
  "/roadmap",
  "/tutor",
  "/prompts",
  "/projects",
  "/careers",
  "/intelligence",
  "/interview",
  "/materials",
  "/progress",
  "/settings",
  "/account",
  "/onboarding",
] as const;

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function safeNextPath(value: unknown, fallback = "/dashboard") {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    isAuthRoute(value.split("?")[0] ?? value)
  ) {
    return fallback;
  }

  return value;
}
