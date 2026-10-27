"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  createEmptyAiState,
  getPreviewAiSnapshot,
  parsePreviewAiState,
  subscribeToPreviewAi,
  type PreviewAiState,
} from "@/lib/preview/ai-store";

const SERVER_SNAPSHOT = "\u0000careerforge-ai-server";

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function usePreviewAiState(enabled: boolean) {
  const raw = useSyncExternalStore(
    subscribeToPreviewAi,
    getPreviewAiSnapshot,
    getServerSnapshot,
  );
  const hydrated = raw !== SERVER_SNAPSHOT;
  const state = useMemo(
    () =>
      enabled && hydrated
        ? parsePreviewAiState(raw)
        : createEmptyAiState(),
    [enabled, hydrated, raw],
  );

  return { state, hydrated };
}

export function previewInitialAiState(): PreviewAiState {
  return createEmptyAiState();
}
