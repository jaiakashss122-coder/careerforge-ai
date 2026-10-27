"use client";

import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { CAREER_STATUS_META } from "@/lib/profile/constants";
import type { Profile } from "@/lib/profile/schema";

function formatSavedAt(value: string | undefined) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not saved yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function AccountSummary({
  mode,
  initialProfile,
  email,
}: {
  mode: "preview" | "supabase";
  initialProfile: Profile | null;
  email: string;
}) {
  const { profile, hydrated } = usePreviewProfileSnapshot(
    initialProfile,
    mode === "preview",
  );

  if (mode === "preview" && !hydrated) {
    return (
      <p className="text-xs leading-5 text-muted">
        Reading the profile saved in this browser…
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
      <div>
        <dt className="text-muted">Name</dt>
        <dd className="mt-1 truncate font-medium text-foreground">
          {profile?.fullName || "Not set"}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Email</dt>
        <dd className="mt-1 truncate font-medium text-foreground">{email}</dd>
      </div>
      <div>
        <dt className="text-muted">Career status</dt>
        <dd className="mt-1 font-medium text-foreground">
          {profile ? CAREER_STATUS_META[profile.careerStatus].label : "Not set"}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Last profile save</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatSavedAt(profile?.updatedAt)}
        </dd>
      </div>
    </dl>
  );
}
