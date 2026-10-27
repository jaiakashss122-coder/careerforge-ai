export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
