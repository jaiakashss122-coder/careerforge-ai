"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getPreviewProfileSnapshot,
  parsePreviewProfile,
  subscribeToPreviewProfile,
} from "@/lib/preview/profile-store";
import type { Profile } from "@/lib/profile/schema";

const SERVER_SNAPSHOT = "\u0000careerforge-server";

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function usePreviewProfileSnapshot(
  initialProfile: Profile | null,
  enabled: boolean,
) {
  const raw = useSyncExternalStore(
    subscribeToPreviewProfile,
    getPreviewProfileSnapshot,
    getServerSnapshot,
  );
  const hydrated = raw !== SERVER_SNAPSHOT;
  const profile = useMemo(
    () =>
      enabled && hydrated ? parsePreviewProfile(raw) : initialProfile,
    [enabled, hydrated, initialProfile, raw],
  );

  return { profile, hydrated };
}

export function usePreviewProfile(
  initialProfile: Profile | null,
  enabled: boolean,
) {
  return usePreviewProfileSnapshot(initialProfile, enabled).profile;
}
