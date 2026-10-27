"use client";

import type { AssessmentAnswers } from "@/lib/assessment/types";

const STORAGE_KEY = "careerforge:assessment-draft:v1";
const DRAFT_UPDATED = "careerforge:assessment-draft-updated";

export type AssessmentDraft = {
  answers: AssessmentAnswers;
  startedAt: string;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseAssessmentDraft(raw: string | null): AssessmentDraft | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    !isRecord(value.answers) ||
    typeof value.startedAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const answers: AssessmentAnswers = {};
  for (const [key, answer] of Object.entries(value.answers)) {
    if (typeof answer === "string") {
      answers[key] = answer;
    }
  }

  return {
    answers,
    startedAt: value.startedAt,
    updatedAt: value.updatedAt,
  };
}

export function loadAssessmentDraft() {
  if (typeof window === "undefined") return null;
  return parseAssessmentDraft(
    window.localStorage.getItem(STORAGE_KEY),
  );
}

export function getAssessmentDraftSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function subscribeToAssessmentDraft(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(DRAFT_UPDATED, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(DRAFT_UPDATED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveAssessmentDraft(
  answers: AssessmentAnswers,
  startedAt: string,
) {
  if (typeof window === "undefined") return;

  const draft: AssessmentDraft = {
    answers,
    startedAt,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  window.dispatchEvent(new Event(DRAFT_UPDATED));
}

export function clearAssessmentDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(DRAFT_UPDATED));
}
