"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getPreviewWorkspaceSnapshot,
  parsePreviewWorkspace,
  subscribeToPreviewWorkspace,
} from "@/lib/preview/workspace-store";
import type { WorkspaceSnapshot } from "@/lib/workspace/types";

const SERVER_SNAPSHOT = "\u0000careerforge-workspace-server";

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function usePreviewWorkspaceSnapshot(
  initialWorkspace: WorkspaceSnapshot,
  enabled: boolean,
) {
  const raw = useSyncExternalStore(
    subscribeToPreviewWorkspace,
    getPreviewWorkspaceSnapshot,
    getServerSnapshot,
  );
  const hydrated = raw !== SERVER_SNAPSHOT;
  const workspace = useMemo(
    () =>
      enabled && hydrated
        ? parsePreviewWorkspace(raw)
        : initialWorkspace,
    [enabled, hydrated, initialWorkspace, raw],
  );

  return { workspace, hydrated };
}
