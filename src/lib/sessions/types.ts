export const SESSION_MODE_VALUES = [
  "quick",
  "focused",
  "project",
  "review",
] as const;

export type SessionMode = (typeof SESSION_MODE_VALUES)[number];
export type SessionStatus = "active" | "completed" | "abandoned";

export const SESSION_PRESETS = [
  {
    mode: "quick",
    minutes: 20,
    label: "Quick learn",
    description: "A 20-minute refresh or one focused exercise.",
  },
  {
    mode: "focused",
    minutes: 45,
    label: "Focused session",
    description: "A 45-minute block for study and practice.",
  },
  {
    mode: "project",
    minutes: 90,
    label: "Project session",
    description: "90 minutes of applied project work.",
  },
  {
    mode: "project",
    minutes: 120,
    label: "Deep project",
    description: "120 minutes for a substantial build step.",
  },
] as const;

export function isSessionPreset(mode: string, minutes: number) {
  return SESSION_PRESETS.some(
    (preset) => preset.mode === mode && preset.minutes === minutes,
  );
}

export function getSessionModeLabel(mode: SessionMode) {
  switch (mode) {
    case "quick":
      return "Quick learn";
    case "focused":
      return "Focused session";
    case "project":
      return "Project session";
    case "review":
      return "Review session";
  }
}

export type LearningSessionRecord = {
  id: string;
  taskId: string | null;
  mode: SessionMode;
  status: SessionStatus;
  plannedMinutes: number;
  actualMinutes: number | null;
  startedAt: string;
  endedAt: string | null;
  notes: string;
  createdAt: string;
};

export type SessionSummary = {
  active: LearningSessionRecord | null;
  sessions: LearningSessionRecord[];
  totalRecordedMinutes: number;
  weekRecordedMinutes: number;
  weekSessionCount: number;
};
