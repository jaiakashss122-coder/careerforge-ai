"use client";

import {
  Bot,
  Loader2,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { buildLearnerContext } from "@/lib/ai/context";
import { buildDemoTutorReply } from "@/lib/ai/demo";
import { evaluateAiQuota, type AiQuotaCheck } from "@/lib/ai/quotas";
import {
  getTutorMode,
  TUTOR_MESSAGE_MAX_LENGTH,
  TUTOR_MODES,
  type AiRuntimeMode,
  type PublicAiStatus,
  type TutorConversationRecord,
  type TutorConversationSummary,
  type TutorMode,
} from "@/lib/ai/types";
import {
  deleteConversationAction,
  loadTutorConversationAction,
  sendTutorMessageAction,
} from "@/lib/ai/actions";
import {
  deletePreviewConversation,
  recordPreviewAiUsage,
  sendPreviewTutorMessage,
} from "@/lib/preview/ai-store";
import { usePreviewAiState } from "@/lib/preview/use-preview-ai";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { getActiveRoadmap, getLatestAssessment } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

export type TutorTaskOption = {
  id: string;
  weekNumber: number;
  title: string;
  status: string;
};

type ConversationSummary = Omit<TutorConversationSummary, "messageCount"> & {
  messageCount?: number;
};

function mergeSummaries(
  current: ConversationSummary[],
  incoming: TutorConversationRecord,
): ConversationSummary[] {
  const previous = current.find((entry) => entry.id === incoming.id);
  const summary: ConversationSummary = {
    id: incoming.id,
    title: incoming.title,
    mode: incoming.mode,
    updatedAt: incoming.updatedAt,
    messageCount: (previous?.messageCount ?? 0) + incoming.messages.length,
  };

  return [summary, ...current.filter((entry) => entry.id !== incoming.id)].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function statusBadge(mode: AiRuntimeMode, preview: boolean) {
  if (preview) {
    return (
      <Badge variant="muted">
        <ShieldCheck aria-hidden="true" className="size-3.5" />
        Local preview · demo replies
      </Badge>
    );
  }
  if (mode === "live") {
    return (
      <Badge variant="success">
        <Sparkles aria-hidden="true" className="size-3.5" />
        Live AI
      </Badge>
    );
  }
  if (mode === "misconfigured") {
    return (
      <Badge variant="danger">
        <TriangleAlert aria-hidden="true" className="size-3.5" />
        AI misconfigured
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <TriangleAlert aria-hidden="true" className="size-3.5" />
      Demo mode
    </Badge>
  );
}

const QUICK_STARTS = [
  "Explain the difference between a Python list and a NumPy array at my current level.",
  "My SQL query returns duplicate rows after a join. Walk me through debugging it.",
  "Ask me three interview questions for a junior data analyst role and give feedback criteria.",
];

export function TutorExperience({
  mode,
  status,
  initialConversations,
  initialQuota,
  tasks,
}: {
  mode: "preview" | "supabase";
  status: PublicAiStatus;
  initialConversations: TutorConversationSummary[];
  initialQuota: AiQuotaCheck | null;
  tasks: TutorTaskOption[];
}) {
  const previewMode = mode === "preview";
  const { state: aiState, hydrated } = usePreviewAiState(previewMode);
  const { profile: previewProfile } = usePreviewProfileSnapshot(
    null,
    previewMode,
  );
  const { workspace } = usePreviewWorkspaceSnapshot(
    EMPTY_WORKSPACE,
    previewMode,
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [serverConversation, setServerConversation] =
    useState<TutorConversationRecord | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>(
    initialConversations,
  );
  const [tutorMode, setTutorMode] = useState<TutorMode>("explain");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<AiQuotaCheck | null>(initialQuota);

  const previewQuota = useMemo(
    () => evaluateAiQuota(aiState.usage),
    [aiState.usage],
  );
  const activeQuota = previewMode ? previewQuota : quota;

  const previewConversation = previewMode
    ? (aiState.conversations.find((entry) => entry.id === activeId) ?? null)
    : null;
  const activeConversation = previewMode
    ? previewConversation
    : serverConversation;

  const previewSummaries = useMemo(
    () =>
      aiState.conversations
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          mode: conversation.mode,
          updatedAt: conversation.updatedAt,
          messageCount: conversation.messages.length,
        }))
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [aiState.conversations],
  );
  const conversationList = previewMode ? previewSummaries : summaries;

  const taskOptions = useMemo<TutorTaskOption[]>(() => {
    if (!previewMode) return tasks;
    const roadmap = getActiveRoadmap(workspace.roadmaps);
    return (roadmap?.tasks ?? [])
      .filter((task) => task.status !== "skipped")
      .map((task) => ({
        id: task.id,
        weekNumber: task.weekNumber,
        title: task.title,
        status: task.status,
      }));
  }, [previewMode, tasks, workspace.roadmaps]);

  function resetChat() {
    setActiveId(null);
    setServerConversation(null);
    setError(null);
    setDraft("");
  }

  async function openConversation(id: string) {
    setError(null);
    if (previewMode) {
      const conversation = aiState.conversations.find(
        (entry) => entry.id === id,
      );
      if (!conversation) {
        setError("That conversation is not available in this browser.");
        return;
      }
      setActiveId(id);
      setTutorMode(conversation.mode);
      return;
    }

    if (serverConversation?.id === id) return;

    setLoadingConversation(true);
    try {
      const result = await loadTutorConversationAction(id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setServerConversation(result.data.conversation);
      setActiveId(id);
      setTutorMode(result.data.conversation.mode);
    } catch {
      setError("That conversation could not be loaded. Try again.");
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handleDeleteConversation() {
    if (!activeId) return;
    if (
      !window.confirm(
        "Delete this conversation and its messages? This cannot be undone.",
      )
    ) {
      return;
    }

    setError(null);

    if (previewMode) {
      deletePreviewConversation(activeId);
      resetChat();
      return;
    }

    const previous = serverConversation;
    setServerConversation(null);
    setSummaries((current) =>
      current.filter((entry) => entry.id !== activeId),
    );
    const removedId = activeId;
    setActiveId(null);

    const result = await deleteConversationAction(removedId);
    if (!result.ok) {
      setError(result.message);
      if (previous) {
        setServerConversation(previous);
        setActiveId(previous.id);
      }
    }
  }

  function buildPreviewContext() {
    const roadmap = getActiveRoadmap(workspace.roadmaps);
    const task = selectedTaskId
      ? (roadmap?.tasks.find((entry) => entry.id === selectedTaskId) ?? null)
      : null;

    return buildLearnerContext({
      profile: previewProfile,
      assessment: getLatestAssessment(workspace.assessments),
      task,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;

    if (!activeQuota?.allowed) {
      setError(
        activeQuota?.allowed === false
          ? activeQuota.message
          : "AI usage limits could not be verified. Refresh and try again.",
      );
      return;
    }

    setError(null);
    setPending(true);

    try {
      if (previewMode) {
        const reply = buildDemoTutorReply({
          mode: tutorMode,
          message,
          context: buildPreviewContext(),
        });
        const result = sendPreviewTutorMessage({
          conversationId: activeId,
          mode: tutorMode,
          content: message,
          reply,
          isDemo: true,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        recordPreviewAiUsage("tutor", true);
        setActiveId(result.conversation.id);
        setDraft("");
        return;
      }

      const result = await sendTutorMessageAction({
        conversationId: activeId,
        mode: tutorMode,
        message,
        taskId: selectedTaskId || null,
      });

      if (!result.ok) {
        setError(
          result.retryable
            ? `${result.message} You can retry the same message.`
            : result.message,
        );
        return;
      }

      const incoming = result.data.conversation;
      setServerConversation((current) =>
        current && current.id === incoming.id
          ? {
              ...incoming,
              createdAt: current.createdAt,
              messages: [...current.messages, ...incoming.messages],
            }
          : incoming,
      );
      setActiveId(incoming.id);
      setSummaries((current) => mergeSummaries(current, incoming));
      setQuota((current) => {
        if (!current?.allowed) return current;
        const windowRemaining = Math.max(0, current.windowRemaining - 1);
        const dailyRemaining = Math.max(0, current.dailyRemaining - 1);

        if (windowRemaining === 0 || dailyRemaining === 0) {
          return {
            allowed: false,
            windowRemaining,
            dailyRemaining,
            message:
              "You have reached the current AI request limit. Wait for older requests to expire.",
            retryAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          };
        }

        return { allowed: true, windowRemaining, dailyRemaining };
      });
      setDraft("");
    } catch {
      setError(
        "The tutor request could not be completed. Your message was not saved on the server.",
      );
    } finally {
      setPending(false);
    }
  }

  if (previewMode && !hydrated) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Loading the tutor</span>
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
    );
  }

  const modeMeta = getTutorMode(tutorMode);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Tutor"
        title="Learn with a tutor that knows your plan"
        description="Eleven teaching modes, from patient hints to interview practice. Your profile, latest short assessment, and an optional roadmap task travel with each request — with self-reported levels marked unverified."
        actions={statusBadge(status.mode, previewMode)}
      />

      {status.mode === "misconfigured" && !previewMode ? (
        <Alert variant="danger" title="AI provider configuration is incomplete">
          {status.detail}
        </Alert>
      ) : (
        <Alert
          variant={previewMode || status.mode === "demo" ? "warning" : "info"}
          title={
            previewMode
              ? "Preview mode uses curated demo replies"
              : status.mode === "demo"
                ? "Demo mode: no AI provider is configured"
                : "Live AI is configured on the server"
          }
        >
          {previewMode
            ? "Conversations are stored in this browser only. Replies are deterministic curated guidance, not model output. Live AI requires a signed-in Supabase account."
            : status.detail}
        </Alert>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                {conversationList.length} saved in{" "}
                {previewMode ? "this browser" : "your account"}
              </CardDescription>
            </div>
            <Button size="sm" variant="secondary" onClick={resetChat}>
              <MessageSquarePlus aria-hidden="true" className="size-4" />
              New
            </Button>
          </CardHeader>
          <CardContent>
            {conversationList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-background/30 px-3 py-4 text-xs leading-5 text-muted">
                No conversations yet. Pick a mode and ask your first question.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {conversationList.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      aria-current={
                        conversation.id === activeId ? "true" : undefined
                      }
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                        conversation.id === activeId
                          ? "border-primary/35 bg-primary/10"
                          : "border-transparent hover:border-border hover:bg-surface-raised",
                      )}
                    >
                      <span className="block truncate text-sm font-medium text-foreground">
                        {conversation.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-muted">
                        {getTutorMode(conversation.mode).label}
                        {typeof conversation.messageCount === "number"
                          ? ` · ${conversation.messageCount} messages`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[34rem] flex-col">
          <CardHeader className="gap-4 border-b border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">
                  {activeConversation?.title ?? "New conversation"}
                </CardTitle>
                <CardDescription>{modeMeta.description}</CardDescription>
              </div>
              {activeConversation ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleDeleteConversation()}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tutor-mode">Teaching mode</Label>
                <Select
                  id="tutor-mode"
                  value={tutorMode}
                  onChange={(event) =>
                    setTutorMode(event.target.value as TutorMode)
                  }
                >
                  {TUTOR_MODES.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tutor-task">Roadmap task context (optional)</Label>
                <Select
                  id="tutor-task"
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                >
                  <option value="">No task selected</option>
                  {taskOptions.map((task) => (
                    <option key={task.id} value={task.id}>
                      Week {task.weekNumber}: {task.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>
                {activeQuota?.allowed
                  ? `${activeQuota.windowRemaining} requests left in this 10-minute window · ${activeQuota.dailyRemaining} today`
                  : activeQuota?.message ??
                    "AI usage limits are checked when you send."}
              </span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4 pt-5">
            {error ? (
              <Alert variant="danger" title="Tutor request failed">
                {error}
              </Alert>
            ) : null}

            <div
              className="flex-1 space-y-4 overflow-y-auto pr-1"
              aria-live="polite"
            >
              {loadingConversation ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Loading conversation…
                </p>
              ) : null}

              {!activeConversation || activeConversation.messages.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title="Start a tutoring session"
                  description="Choose a mode, optionally attach a roadmap task, and ask a specific question. The tutor will not claim you have mastered something just because it appears in your profile or degree."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_STARTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setDraft(prompt)}
                          className="max-w-xs rounded-xl border border-border bg-background/40 px-3 py-2 text-left text-xs leading-5 text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  }
                />
              ) : (
                <ul className="space-y-4">
                  {activeConversation.messages.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        "rounded-2xl border px-4 py-3",
                        message.role === "user"
                          ? "ml-6 border-primary/25 bg-primary/10 sm:ml-14"
                          : "mr-6 border-border bg-background/45 sm:mr-14",
                      )}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                        <span>{message.role === "user" ? "You" : "Tutor"}</span>
                        {message.role === "assistant" && message.isDemo ? (
                          <Badge variant="warning">Demo reply</Badge>
                        ) : null}
                        <span className="ml-auto normal-case tracking-normal">
                          {formatTimestamp(message.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-strong">
                        {message.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <Label htmlFor="tutor-message">Your message</Label>
              <Textarea
                id="tutor-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={TUTOR_MESSAGE_MAX_LENGTH}
                placeholder="Ask a specific question, paste an error, or share code for review…"
                disabled={pending}
                aria-describedby="tutor-message-hint"
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldHint id="tutor-message-hint">
                  {draft.length}/{TUTOR_MESSAGE_MAX_LENGTH} characters · Cmd/Ctrl
                  + Enter to send · output is text only and cannot run code or
                  change your data.
                </FieldHint>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    !draft.trim() ||
                    (activeQuota ? !activeQuota.allowed : false)
                  }
                >
                  {pending ? (
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Send aria-hidden="true" className="size-4" />
                  )}
                  {pending ? "Thinking…" : "Send"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
