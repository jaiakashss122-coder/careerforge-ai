"use client";

import {
  ClipboardCopy,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
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
import {
  FieldHint,
  Input,
  Label,
  Textarea,
} from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  deletePromptAction,
  generatePromptAction,
  savePromptAction,
} from "@/lib/ai/actions";
import { buildLearnerContext } from "@/lib/ai/context";
import { evaluateAiQuota, type AiQuotaCheck } from "@/lib/ai/quotas";
import { buildPromptTemplate, PROMPT_GUIDES } from "@/lib/ai/templates";
import { parseTagInput } from "@/lib/ai/text";
import { getCareerTrack } from "@/lib/career/tracks";
import {
  CAREER_STATUS_META,
  LEARNING_PREFERENCES,
  TOOLS,
} from "@/lib/profile/constants";
import {
  PROMPT_BODY_MAX_LENGTH,
  PROMPT_CATEGORIES,
  PROMPT_TITLE_MAX_LENGTH,
  getPromptCategory,
  type AiRuntimeMode,
  type PromptBuilderInput,
  type PromptCategoryId,
  type PromptGeneration,
  type PublicAiStatus,
  type SavedPromptRecord,
} from "@/lib/ai/types";
import {
  deletePreviewPrompt,
  recordPreviewAiUsage,
  savePreviewPrompt,
} from "@/lib/preview/ai-store";
import { usePreviewAiState } from "@/lib/preview/use-preview-ai";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import { usePreviewWorkspaceSnapshot } from "@/lib/preview/use-preview-workspace";
import { getLatestAssessment } from "@/lib/workspace/progress";
import { createEmptyWorkspace } from "@/lib/workspace/types";
import { cn } from "@/lib/utils";

const EMPTY_WORKSPACE = createEmptyWorkspace();

export type PromptStudioDefaults = {
  goal: string;
  targetRole: string;
  careerStatus: string;
  weeklyHours: number;
  timeBudget: string;
  tools: string;
  teachingStyle: string;
  constraints: string;
};

type BuilderFields = {
  goal: string;
  targetRole: string;
  timeBudget: string;
  tools: string;
  teachingStyle: string;
  deliverable: string;
  evaluationFocus: string;
  constraints: string;
};

function statusBadge(mode: AiRuntimeMode, preview: boolean) {
  if (preview) {
    return (
      <Badge variant="muted">
        <ShieldCheck aria-hidden="true" className="size-3.5" />
        Local preview · demo templates
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

function upsertPrompt(
  current: SavedPromptRecord[],
  prompt: SavedPromptRecord,
): SavedPromptRecord[] {
  return [prompt, ...current.filter((entry) => entry.id !== prompt.id)].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function PromptStudio({
  mode,
  status,
  initialPrompts,
  initialQuota,
  defaults,
}: {
  mode: "preview" | "supabase";
  status: PublicAiStatus;
  initialPrompts: SavedPromptRecord[];
  initialQuota: AiQuotaCheck | null;
  defaults: PromptStudioDefaults;
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

  const [serverPrompts, setServerPrompts] = useState(initialPrompts);
  const [category, setCategory] = useState<PromptCategoryId>("learning-plan");
  const [fields, setFields] = useState<BuilderFields>({
    goal: defaults.goal,
    targetRole: defaults.targetRole,
    timeBudget: defaults.timeBudget,
    tools: defaults.tools,
    teachingStyle: defaults.teachingStyle,
    deliverable: "",
    evaluationFocus: "",
    constraints: defaults.constraints,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDemoDraft, setIsDemoDraft] = useState(false);
  const [generated, setGenerated] = useState<PromptGeneration | null>(null);
  const [pending, setPending] = useState<"generate" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quota, setQuota] = useState<AiQuotaCheck | null>(initialQuota);

  const previewQuota = useMemo(
    () => evaluateAiQuota(aiState.usage),
    [aiState.usage],
  );
  const activeQuota = previewMode ? previewQuota : quota;

  const savedPrompts = previewMode ? aiState.prompts : serverPrompts;

  const filteredPrompts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return savedPrompts;

    return savedPrompts.filter((prompt) => {
      const label = getPromptCategory(prompt.category).label.toLowerCase();
      return (
        prompt.title.toLowerCase().includes(query) ||
        prompt.body.toLowerCase().includes(query) ||
        prompt.tags.some((tag) => tag.includes(query)) ||
        label.includes(query)
      );
    });
  }, [savedPrompts, search]);

  const categoryMeta = getPromptCategory(category);
  const guide = PROMPT_GUIDES[category];

  function buildBuilder(): PromptBuilderInput {
    const previewTrack = getCareerTrack(previewProfile?.targetCareerSlug);
    const previewTools =
      previewProfile?.tools
        .map((value) => TOOLS.find((tool) => tool.value === value)?.label ?? value)
        .join(", ") ?? "";
    const previewPreferences =
      previewProfile?.learningPreferences
        .map(
          (value) =>
            LEARNING_PREFERENCES.find((entry) => entry.value === value)?.label ??
            value,
        )
        .join(", ") ?? "";

    return {
      category,
      goal:
        fields.goal.trim() ||
        defaults.goal ||
        previewProfile?.primaryGoal ||
        guide.focus,
      targetRole:
        fields.targetRole.trim() ||
        defaults.targetRole ||
        previewTrack?.name ||
        "exploring options, no single target role",
      careerStatus:
        previewProfile && defaults.careerStatus === "not specified"
          ? CAREER_STATUS_META[previewProfile.careerStatus].label
          : defaults.careerStatus,
      weeklyHours: previewProfile?.weeklyHours ?? defaults.weeklyHours,
      timeBudget:
        fields.timeBudget.trim() ||
        defaults.timeBudget ||
        (previewProfile
          ? `${previewProfile.preferredSessionMinutes}-minute sessions`
          : `${defaults.weeklyHours} hours per week`),
      tools: fields.tools.trim() || defaults.tools || previewTools,
      teachingStyle:
        fields.teachingStyle.trim() ||
        defaults.teachingStyle ||
        previewPreferences ||
        "clear explanations with practice",
      deliverable: fields.deliverable.trim() || guide.deliverable,
      evaluationFocus: fields.evaluationFocus.trim() || guide.evaluation,
      constraints:
        fields.constraints.trim() ||
        defaults.constraints ||
        previewProfile?.constraints ||
        "",
      learnerContext: buildLearnerContext({
        profile: previewProfile,
        assessment: getLatestAssessment(workspace.assessments),
        task: null,
      }),
    };
  }

  function applyGeneration(generation: PromptGeneration) {
    setGenerated(generation);
    setTitle(generation.title);
    setBody(generation.body);
    setTagsInput(generation.tags.join(", "));
    setIsDemoDraft(generation.isDemo);
    setEditingId(null);
  }

  async function handleGenerate() {
    if (!activeQuota?.allowed) {
      setError(
        activeQuota?.message ??
          "AI usage limits could not be verified. Refresh and try again.",
      );
      return;
    }

    setPending("generate");
    setError(null);
    setNotice(null);

    try {
      if (previewMode) {
        const generation = buildPromptTemplate(buildBuilder(), { demo: true });
        applyGeneration(generation);
        recordPreviewAiUsage("prompt", true);
        setNotice(
          "Demo template created. It is labeled as demo output and stored only when you save it.",
        );
        return;
      }

      const result = await generatePromptAction({
        category,
        ...fields,
      });

      if (!result.ok) {
        setError(
          result.retryable
            ? `${result.message} You can retry generation.`
            : result.message,
        );
        return;
      }

      applyGeneration(result.data);
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
    } catch {
      setError("The prompt could not be generated. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleSave() {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle) {
      setError("Add a title before saving.");
      return;
    }
    if (cleanBody.length < 10) {
      setError("The prompt body is too short to save.");
      return;
    }

    setPending("save");
    setError(null);
    setNotice(null);

    const tags = parseTagInput(tagsInput);
    const demo = generated?.isDemo ?? isDemoDraft;

    try {
      if (previewMode) {
        const result = savePreviewPrompt({
          id: editingId,
          title: cleanTitle,
          category,
          body: cleanBody,
          tags,
          source: editingId ? "edited" : generated ? "generated" : "edited",
          isDemo: demo,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setEditingId(result.prompt.id);
        setNotice(
          editingId
            ? "Saved changes in this browser."
            : "Saved in this browser. It will persist after a refresh.",
        );
        return;
      }

      const result = await savePromptAction({
        id: editingId,
        title: cleanTitle,
        category,
        body: cleanBody,
        tags,
        source: editingId ? "edited" : generated ? "generated" : "edited",
        isDemo: demo,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setServerPrompts((current) => upsertPrompt(current, result.data.prompt));
      setEditingId(result.data.prompt.id);
      setNotice(editingId ? "Prompt updated." : "Prompt saved to your account.");
    } catch {
      setError("The prompt could not be saved. Try again.");
    } finally {
      setPending(null);
    }
  }

  function loadPrompt(prompt: SavedPromptRecord) {
    setEditingId(prompt.id);
    setCategory(prompt.category);
    setTitle(prompt.title);
    setBody(prompt.body);
    setTagsInput(prompt.tags.join(", "));
    setIsDemoDraft(prompt.isDemo);
    setGenerated(null);
    setError(null);
    setNotice("Loaded into the editor. Saving will update this prompt.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyPrompt(text: string) {
    setError(null);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setNotice("Prompt copied to the clipboard.");
    } catch {
      setError(
        "Copy is unavailable in this browser. Select the prompt text and copy it manually.",
      );
    }
  }

  async function handleDelete(prompt: SavedPromptRecord) {
    if (
      !window.confirm(
        `Delete "${prompt.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    setNotice(null);

    if (previewMode) {
      deletePreviewPrompt(prompt.id);
      if (editingId === prompt.id) {
        setEditingId(null);
      }
      setNotice("Prompt removed from this browser.");
      return;
    }

    const result = await deletePromptAction(prompt.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setServerPrompts((current) =>
      current.filter((entry) => entry.id !== prompt.id),
    );
    if (editingId === prompt.id) {
      setEditingId(null);
    }
    setNotice("Prompt deleted.");
  }

  function startBlank() {
    setEditingId(null);
    setGenerated(null);
    setTitle("");
    setBody("");
    setTagsInput("");
    setIsDemoDraft(false);
    setError(null);
    setNotice(null);
  }

  if (previewMode && !hydrated) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Loading Prompt Studio</span>
        <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prompt Studio"
        title="Prompts that carry your real context"
        description="Choose one of sixteen categories, generate a reusable prompt, then edit, tag, copy, and save it. Every prompt includes your goal, available time, tools, teaching preference, deliverable, and evaluation rubric — without inventing mastery."
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
              ? "Preview mode uses curated templates"
              : status.mode === "demo"
                ? "Demo mode: no AI provider is configured"
                : "Live AI is configured on the server"
          }
        >
          {previewMode
            ? "Generated prompts come from a deterministic template, not a live model, and are labeled as demo output. Saved prompts stay in this browser. Live AI requires a signed-in Supabase account."
            : status.detail}
        </Alert>
      )}

      {error ? (
        <Alert variant="danger" title="Prompt Studio problem">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert variant="success" title="Prompt Studio">
          {notice}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Choose a category</CardTitle>
          <CardDescription>{categoryMeta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PROMPT_CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={entry.id === category}
                onClick={() => setCategory(entry.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  entry.id === category
                    ? "border-primary/40 bg-primary/15 text-[#c7d0ff]"
                    : "border-border bg-background/40 text-muted-strong hover:border-border-strong hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>2. Add context (optional overrides)</CardTitle>
            <CardDescription>
              Blank fields fall back to your profile and the category guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prompt-goal">Goal</Label>
                <Input
                  id="prompt-goal"
                  value={fields.goal}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      goal: event.target.value,
                    }))
                  }
                  maxLength={500}
                  placeholder={guide.focus}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-role">Target role</Label>
                <Input
                  id="prompt-role"
                  value={fields.targetRole}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      targetRole: event.target.value,
                    }))
                  }
                  maxLength={120}
                  placeholder="Data analyst internship"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-time">Available time</Label>
                <Input
                  id="prompt-time"
                  value={fields.timeBudget}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      timeBudget: event.target.value,
                    }))
                  }
                  maxLength={120}
                  placeholder="45-minute sessions, 3 per week"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-tools">Tools and environment</Label>
                <Input
                  id="prompt-tools"
                  value={fields.tools}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      tools: event.target.value,
                    }))
                  }
                  maxLength={200}
                  placeholder="Python, VS Code, Jupyter"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt-style">Preferred teaching method</Label>
                <Input
                  id="prompt-style"
                  value={fields.teachingStyle}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      teachingStyle: event.target.value,
                    }))
                  }
                  maxLength={200}
                  placeholder="Worked examples before independent practice"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prompt-deliverable">Deliverable</Label>
                <Input
                  id="prompt-deliverable"
                  value={fields.deliverable}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      deliverable: event.target.value,
                    }))
                  }
                  maxLength={300}
                  placeholder={guide.deliverable}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prompt-evaluation">Evaluation rubric</Label>
                <Input
                  id="prompt-evaluation"
                  value={fields.evaluationFocus}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      evaluationFocus: event.target.value,
                    }))
                  }
                  maxLength={300}
                  placeholder={guide.evaluation}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prompt-constraints">Constraints</Label>
                <Input
                  id="prompt-constraints"
                  value={fields.constraints}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      constraints: event.target.value,
                    }))
                  }
                  maxLength={500}
                  placeholder="Shared laptop, unreliable internet on weekends"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldHint>
                {activeQuota?.allowed
                  ? `${activeQuota.windowRemaining} generations left in this 10-minute window · ${activeQuota.dailyRemaining} today`
                  : activeQuota?.message ??
                    "AI usage limits are checked when you generate."}
              </FieldHint>
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={
                  pending !== null ||
                  (activeQuota ? !activeQuota.allowed : false)
                }
              >
                {pending === "generate" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <WandSparkles aria-hidden="true" className="size-4" />
                )}
                {pending === "generate" ? "Generating…" : "Generate prompt"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>3. Edit and save</CardTitle>
              <CardDescription>
                Review the generated prompt before reusing it. Placeholders in
                square brackets are yours to fill.
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={startBlank}>
              <Plus aria-hidden="true" className="size-4" />
              Blank
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{categoryMeta.label}</Badge>
              {isDemoDraft ? (
                <Badge variant="warning">Demo prompt</Badge>
              ) : generated ? (
                <Badge variant="success">Generated</Badge>
              ) : null}
              {editingId ? <Badge variant="muted">Editing saved</Badge> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prompt-title">Title</Label>
              <Input
                id="prompt-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={PROMPT_TITLE_MAX_LENGTH}
                placeholder="Generate or write a title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prompt-body">Prompt body</Label>
              <Textarea
                id="prompt-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={PROMPT_BODY_MAX_LENGTH}
                className="min-h-64 font-mono text-xs leading-5"
                placeholder="Generate a prompt or write one from scratch."
              />
              <FieldHint>
                {body.length}/{PROMPT_BODY_MAX_LENGTH} characters
              </FieldHint>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prompt-tags">Tags</Label>
              <Input
                id="prompt-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="sql, joins, practice"
              />
              <FieldHint>
                Comma-separated. Up to eight short tags.
              </FieldHint>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={pending !== null || !title.trim() || !body.trim()}
              >
                {pending === "save" ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" className="size-4" />
                )}
                {editingId ? "Update prompt" : "Save prompt"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyPrompt(body)}
                disabled={!body.trim()}
              >
                <ClipboardCopy aria-hidden="true" className="size-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Saved prompts</CardTitle>
              <CardDescription>
                {savedPrompts.length} saved in{" "}
                {previewMode ? "this browser" : "your account"}. Search matches
                titles, bodies, tags, and category names.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved prompts"
                aria-label="Search saved prompts"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {savedPrompts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No saved prompts yet"
              description="Generate a prompt, review it, and save it. Saved prompts appear here for editing, copying, and reuse across sessions."
            />
          ) : filteredPrompts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-background/30 px-4 py-6 text-center text-sm text-muted">
              No saved prompts match “{search.trim()}”.
            </p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {filteredPrompts.map((prompt) => (
                <li
                  key={prompt.id}
                  className="flex flex-col rounded-xl border border-border bg-background/35 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {prompt.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          {getPromptCategory(prompt.category).label}
                        </Badge>
                        {prompt.isDemo ? (
                          <Badge variant="warning">Demo</Badge>
                        ) : null}
                        {prompt.source === "edited" ? (
                          <Badge variant="muted">Edited</Badge>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-[0.6875rem] text-muted">
                      {prompt.updatedAt.slice(0, 10)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted">
                    {prompt.body}
                  </p>

                  {prompt.tags.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {prompt.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[0.6875rem] text-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadPrompt(prompt)}
                    >
                      <Pencil aria-hidden="true" className="size-3.5" />
                      Reuse
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void copyPrompt(prompt.body)}
                    >
                      <ClipboardCopy aria-hidden="true" className="size-3.5" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-danger hover:text-danger"
                      onClick={() => void handleDelete(prompt)}
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
