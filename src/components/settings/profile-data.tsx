"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  clearPreviewAiState,
  loadPreviewAiState,
} from "@/lib/preview/ai-store";
import { clearPreviewProfile } from "@/lib/preview/profile-store";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import {
  clearPreviewWorkspace,
  loadPreviewWorkspace,
} from "@/lib/preview/workspace-store";
import type { Profile } from "@/lib/profile/schema";
import { deleteLearningDataAction } from "@/lib/workspace/actions";

type Message = {
  tone: "success" | "warning" | "danger";
  text: string;
};

export function ProfileDataControls({
  mode,
  initialProfile,
}: {
  mode: "preview" | "supabase";
  initialProfile: Profile | null;
}) {
  const router = useRouter();
  const previewMode = mode === "preview";
  const { profile } = usePreviewProfileSnapshot(initialProfile, previewMode);
  const [message, setMessage] = useState<Message | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  function downloadJson(payload: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportData() {
    const workspace = loadPreviewWorkspace();
    const ai = loadPreviewAiState();
    const hasAnything =
      profile !== null ||
      workspace.assessments.length > 0 ||
      workspace.roadmaps.length > 0 ||
      workspace.sessions.length > 0 ||
      workspace.projects.length > 0 ||
      workspace.evidence.length > 0 ||
      workspace.careerExperiments.length > 0 ||
      workspace.careerPreferences.length > 0 ||
      ai.conversations.length > 0 ||
      ai.prompts.length > 0;

    if (!hasAnything) {
      setMessage({
        tone: "warning",
        text: "There is no local preview data to export yet.",
      });
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    downloadJson(
      {
        exportedAt: new Date().toISOString(),
        source: "local-preview",
        note:
          "This export contains the profile, assessment responses, generated roadmaps, study sessions, projects with their milestones and links, skill evidence records, career experiments with their reflections, your recorded specialization choice with the reason you wrote, tutor conversations, and saved prompts stored in this browser. Demo AI output is flagged with isDemo, and each evidence record keeps its verified flag. It does not include any cloud account because none exists in preview mode.",
        profile,
        assessments: workspace.assessments,
        roadmaps: workspace.roadmaps,
        sessions: workspace.sessions,
        projects: workspace.projects,
        skillEvidence: workspace.evidence,
        careerExperiments: workspace.careerExperiments,
        careerChoice: workspace.careerPreferences[0] ?? null,
        prompts: ai.prompts,
        tutorConversations: ai.conversations,
      },
      `careerforge-preview-${date}.json`,
    );

    setMessage({
      tone: "success",
      text: "Local preview data downloaded as JSON.",
    });
  }

  async function handleDelete() {
    if (confirmation !== "DELETE") {
      setMessage({
        tone: "warning",
        text: "Type DELETE exactly to confirm.",
      });
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      if (previewMode) {
        clearPreviewAiState();
        clearPreviewWorkspace();
        clearPreviewProfile();
        setMessage({
          tone: "success",
          text: "All local preview data was removed from this browser: profile, assessments, roadmaps, sessions, projects, skill evidence, career experiments with your reflections and your recorded specialization choice, tutor conversations, and saved prompts.",
        });
      } else {
        const result = await deleteLearningDataAction("DELETE");
        setMessage({
          tone: result.ok ? "success" : "danger",
          text: result.message,
        });
        if (result.ok) router.refresh();
      }
      setConfirming(false);
      setConfirmation("");
    } catch {
      setMessage({
        tone: "danger",
        text: "The data could not be deleted. Nothing else changed; please retry.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {previewMode ? (
          <Button variant="secondary" size="sm" onClick={exportData}>
            <Download aria-hidden="true" className="size-4" />
            Export all local data
          </Button>
        ) : (
          <a href="/settings/export" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download aria-hidden="true" className="size-4" />
            Export my account data
          </a>
        )}

        {!confirming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirming(true);
              setMessage(null);
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {previewMode ? "Delete all local data" : "Delete learning data"}
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/8 p-4">
          <Alert variant="danger" title="This cannot be undone">
            {previewMode
              ? "This removes the preview profile, assessment results, roadmaps, study sessions, projects with their milestones and links, skill evidence, career experiments with your reflections, your recorded specialization choice, tutor conversations, and saved prompts stored in this browser."
              : "This permanently deletes your assessments, roadmaps, task states, study sessions, projects with their milestones and links, skill evidence, career experiments with your reflections, your recorded specialization choice, tutor conversations, and saved prompts. Your profile and sign-in account are kept."}{" "}
            Export a copy first if you need one.
          </Alert>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirmation">
              Type DELETE to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="max-w-48"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={pending || confirmation !== "DELETE"}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {pending ? "Deleting…" : "Confirm deletion"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setConfirmation("");
              }}
              disabled={pending}
            >
              Keep my data
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <Alert
          variant={
            message.tone === "success"
              ? "success"
              : message.tone === "danger"
                ? "danger"
                : "warning"
          }
        >
          {message.text}
        </Alert>
      ) : null}

      <p className="text-xs leading-5 text-muted">
        {previewMode
          ? "Preview data lives only in this browser's localStorage. Deleting it removes the profile along with all learning records and AI conversations; there is no cloud copy."
          : "The export includes your profile, every assessment with answers, roadmaps with task states and prerequisites, all study sessions, projects with milestones, links and rubric scores, the skill evidence records they created, career experiments with the work link and reflection you recorded, your specialization choice with the reason you wrote for it, saved prompts, and tutor conversations with messages. Demo AI content is flagged and evidence keeps its verified flag, so nothing self-submitted reads as externally confirmed. It excludes authentication secrets and AI usage counters. Account deletion is not available yet; the learning-data deletion above keeps your profile and sign-in intact."}
      </p>
    </div>
  );
}
