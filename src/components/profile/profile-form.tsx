"use client";

import {
  Info,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { CAREER_TRACKS } from "@/lib/career/tracks";
import { saveProfileAction } from "@/lib/profile/actions";
import {
  CAREER_STATUSES,
  CAREER_STATUS_META,
  LEARNING_PREFERENCES,
  SELF_REPORTED_SKILLS,
  SESSION_LENGTHS,
  SKILL_LEVELS,
  SKILL_LEVEL_META,
  TOOLS,
  YEAR_OF_STUDY,
  type LearningPreference,
  type SkillLevel,
  type ToolId,
} from "@/lib/profile/constants";
import {
  createDefaultPreviewProfile,
  savePreviewProfile,
} from "@/lib/preview/profile-store";
import { usePreviewProfileSnapshot } from "@/lib/preview/use-preview-profile";
import {
  parseProfileFormData,
  type Profile,
  type ProfileFieldErrors,
  type ProfileInput,
} from "@/lib/profile/schema";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
  mode: "preview" | "supabase";
  initialProfile: Profile | null;
  variant: "onboarding" | "settings";
};

type StatusMessage = { tone: "success" | "danger"; message: string } | null;

function FormSection({
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs leading-5 text-muted">{description}</p>
        </div>
        {badge}
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <FieldHint id={`${id}-hint`}>{hint}</FieldHint> : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function describedBy(id: string, error?: string, hint = false) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

function ProfileFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only">Loading your saved preview profile…</span>
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60" />
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-surface/60" />
    </div>
  );
}

function PreviewProfileForm(props: ProfileFormProps) {
  const { profile, hydrated } = usePreviewProfileSnapshot(null, true);

  if (!hydrated) {
    return <ProfileFormSkeleton />;
  }

  return (
    <ProfileFormInner
      {...props}
      initialProfile={profile ?? createDefaultPreviewProfile()}
    />
  );
}

export function ProfileForm(props: ProfileFormProps) {
  if (props.mode === "preview") {
    return <PreviewProfileForm {...props} />;
  }

  return <ProfileFormInner {...props} />;
}

function ProfileFormInner({
  mode,
  initialProfile,
  variant,
}: ProfileFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Profile>(() => {
    return initialProfile ?? createDefaultPreviewProfile();
  });
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [status, setStatus] = useState<StatusMessage>(null);
  const [pending, setPending] = useState(false);

  function setField<K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function togglePreference(value: LearningPreference, checked: boolean) {
    setDraft((previous) => ({
      ...previous,
      learningPreferences: checked
        ? [...previous.learningPreferences, value]
        : previous.learningPreferences.filter((item) => item !== value),
    }));
  }

  function toggleTool(value: ToolId, checked: boolean) {
    setDraft((previous) => ({
      ...previous,
      tools: checked
        ? [...previous.tools, value]
        : previous.tools.filter((item) => item !== value),
    }));
  }

  function focusFirstError(form: HTMLFormElement | null) {
    window.requestAnimationFrame(() => {
      const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]');
      target?.focus();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus(null);

    const parsed = parseProfileFormData(new FormData(form));

    if (!parsed.success) {
      setErrors(parsed.fieldErrors);
      setStatus({ tone: "danger", message: parsed.message });
      focusFirstError(form);
      return;
    }

    setErrors({});
    setPending(true);

    try {
      if (mode === "preview") {
        const saved = savePreviewProfile(parsed.data, draft);
        setDraft(saved);
        setStatus({
          tone: "success",
          message: "Profile saved in this browser.",
        });

        if (variant === "onboarding") {
          router.push("/assessment");
        }
        return;
      }

      const result = await saveProfileAction(new FormData(form));

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setStatus({ tone: "danger", message: result.message });
        focusFirstError(form);
        return;
      }

      setStatus({ tone: "success", message: result.message });

      if (variant === "onboarding") {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch {
      setStatus({
        tone: "danger",
        message:
          "Something went wrong while saving. Your form was not submitted — please try again.",
      });
    } finally {
      setPending(false);
    }
  }

  const emailLabel =
    mode === "preview" ? "Local preview profile" : draft.email || "Your account";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {status ? (
        <Alert
          variant={status.tone === "success" ? "success" : "danger"}
          title={status.tone === "success" ? "Saved" : "Check your profile"}
        >
          {status.message}
        </Alert>
      ) : null}

      <FormSection
        title="About you and your programme"
        description="The basics used to address you and reason about your timeline."
        badge={<Badge variant="muted">Required</Badge>}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="full-name"
            label="Full name"
            hint="Used in your dashboard greeting and tutor context."
            error={errors.fullName?.[0]}
          >
            <Input
              id="full-name"
              name="fullName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={draft.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={describedBy("full-name", errors.fullName?.[0], true)}
              placeholder="Your name"
            />
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium leading-6 text-muted-strong">
              Account email
            </p>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background/40 px-3.5 text-sm text-muted">
              {mode === "preview" ? (
                <Lock aria-hidden="true" className="size-4 text-muted" />
              ) : (
                <Mail aria-hidden="true" className="size-4 text-muted" />
              )}
              <span className="truncate">{emailLabel}</span>
            </div>
            <FieldHint>
              {mode === "preview"
                ? "Accounts are disabled until Supabase is configured."
                : "Managed by Supabase Auth. It cannot be edited here."}
            </FieldHint>
          </div>

          <Field id="degree" label="Degree or programme" error={errors.degree?.[0]}>
            <Input
              id="degree"
              name="degree"
              value={draft.degree}
              onChange={(event) => setField("degree", event.target.value)}
              aria-invalid={Boolean(errors.degree)}
              aria-describedby={describedBy("degree", errors.degree?.[0])}
              placeholder="B.Tech CSE"
            />
          </Field>

          <Field
            id="specialization"
            label="Degree specialization"
            error={errors.degreeSpecialization?.[0]}
          >
            <Input
              id="specialization"
              name="degreeSpecialization"
              value={draft.degreeSpecialization}
              onChange={(event) =>
                setField("degreeSpecialization", event.target.value)
              }
              aria-invalid={Boolean(errors.degreeSpecialization)}
              aria-describedby={describedBy(
                "specialization",
                errors.degreeSpecialization?.[0],
              )}
              placeholder="Data Science"
            />
          </Field>

          <Field
            id="year-of-study"
            label="Current year"
            error={errors.yearOfStudy?.[0]}
          >
            <Select
              id="year-of-study"
              name="yearOfStudy"
              value={draft.yearOfStudy}
              onChange={(event) =>
                setField(
                  "yearOfStudy",
                  event.target.value as ProfileInput["yearOfStudy"],
                )
              }
              aria-invalid={Boolean(errors.yearOfStudy)}
              aria-describedby={describedBy("year-of-study", errors.yearOfStudy?.[0])}
            >
              {YEAR_OF_STUDY.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="graduation-year"
            label="Graduation year (optional)"
            hint="Used to plan backwards from internship season."
            error={errors.graduationYear?.[0]}
          >
            <Input
              id="graduation-year"
              name="graduationYear"
              type="number"
              inputMode="numeric"
              min={2024}
              max={2040}
              value={draft.graduationYear ?? ""}
              onChange={(event) =>
                setField(
                  "graduationYear",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              aria-invalid={Boolean(errors.graduationYear)}
              aria-describedby={describedBy(
                "graduation-year",
                errors.graduationYear?.[0],
                true,
              )}
              placeholder="2029"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Your self-reported starting point"
        description="Be honest — this only shapes the starting difficulty."
        badge={
          <Badge variant="warning">
            <Info aria-hidden="true" className="size-3.5" />
            Self-reported, not verified
          </Badge>
        }
      >
        <Alert variant="info">
          These levels are your own estimate. They do not count as skill evidence
          or mastery. The adaptive assessment separately tests what you can
          demonstrate.
        </Alert>

        <div className="grid gap-5 sm:grid-cols-2">
          {SELF_REPORTED_SKILLS.map((skill) => {
            const id = `skill-${skill.key}`;
            const error = errors[skill.key]?.[0];
            const level = draft[skill.key];

            return (
              <Field
                key={skill.key}
                id={id}
                label={skill.label}
                hint={SKILL_LEVEL_META[level].description}
                error={error}
              >
                <Select
                  id={id}
                  name={skill.key}
                  value={level}
                  onChange={(event) =>
                    setField(skill.key, event.target.value as SkillLevel)
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy(id, error, true)}
                >
                  {SKILL_LEVELS.map((option) => (
                    <option key={option} value={option}>
                      {SKILL_LEVEL_META[option].label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          })}
        </div>
      </FormSection>

      <FormSection
        title="Career direction"
        description="Undecided is a valid, intentional starting point."
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">Career status</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {CAREER_STATUSES.map((careerStatus) => {
              const meta = CAREER_STATUS_META[careerStatus];
              const checked = draft.careerStatus === careerStatus;

              return (
                <label
                  key={careerStatus}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-background/40 hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="careerStatus"
                    value={careerStatus}
                    checked={checked}
                    onChange={() => setField("careerStatus", careerStatus)}
                    className="mt-1 size-4 shrink-0 accent-[#7c8cff]"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-foreground">
                      {meta.label}
                    </span>
                    <span className="block text-xs leading-5 text-muted">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="career-status-error">
            {errors.careerStatus?.[0]}
          </FieldError>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="target-career"
            label={
              draft.careerStatus === "decided"
                ? "Target role"
                : "Leading interest (optional)"
            }
            hint="You can change this whenever new evidence appears."
            error={errors.targetCareerSlug?.[0]}
          >
            <Select
              id="target-career"
              name="targetCareerSlug"
              value={draft.targetCareerSlug ?? ""}
              onChange={(event) =>
                setField(
                  "targetCareerSlug",
                  (event.target.value || null) as ProfileInput["targetCareerSlug"],
                )
              }
              aria-invalid={Boolean(errors.targetCareerSlug)}
              aria-describedby={describedBy(
                "target-career",
                errors.targetCareerSlug?.[0],
                true,
              )}
            >
              <option value="">No target yet</option>
              {CAREER_TRACKS.map((track) => (
                <option key={track.slug} value={track.slug}>
                  {track.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="career-note"
            label="What draws you to a direction? (optional)"
            error={errors.careerNote?.[0]}
          >
            <Textarea
              id="career-note"
              name="careerNote"
              value={draft.careerNote}
              onChange={(event) => setField("careerNote", event.target.value)}
              aria-invalid={Boolean(errors.careerNote)}
              aria-describedby={describedBy("career-note", errors.careerNote?.[0])}
              placeholder="e.g. I enjoy explaining business patterns, but want to test whether I like model building."
              maxLength={500}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Time, tools, and how you learn"
        description="Used to size sessions, projects, and explanations."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="weekly-hours"
            label="Available study time per week"
            hint="Hours. The default plan assumes 10."
            error={errors.weeklyHours?.[0]}
          >
            <Input
              id="weekly-hours"
              name="weeklyHours"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              required
              value={draft.weeklyHours}
              onChange={(event) =>
                setField("weeklyHours", Number(event.target.value))
              }
              aria-invalid={Boolean(errors.weeklyHours)}
              aria-describedby={describedBy(
                "weekly-hours",
                errors.weeklyHours?.[0],
                true,
              )}
            />
          </Field>

          <Field
            id="session-length"
            label="Preferred default session"
            hint="Quick, focused, or deep project work."
            error={errors.preferredSessionMinutes?.[0]}
          >
            <Select
              id="session-length"
              name="preferredSessionMinutes"
              value={draft.preferredSessionMinutes}
              onChange={(event) =>
                setField(
                  "preferredSessionMinutes",
                  Number(event.target.value) as ProfileInput["preferredSessionMinutes"],
                )
              }
              aria-invalid={Boolean(errors.preferredSessionMinutes)}
              aria-describedby={describedBy(
                "session-length",
                errors.preferredSessionMinutes?.[0],
                true,
              )}
            >
              {SESSION_LENGTHS.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label} — {session.description}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-muted-strong">
            How do you prefer to learn?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARNING_PREFERENCES.map((preference) => {
              const checked = draft.learningPreferences.includes(
                preference.value,
              );

              return (
                <label
                  key={preference.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors",
                    checked
                      ? "border-primary/35 bg-primary/8"
                      : "border-border bg-background/40 hover:border-border-strong",
                  )}
                >
                  <input
                    type="checkbox"
                    name="learningPreferences"
                    value={preference.value}
                    checked={checked}
                    onChange={(event) =>
                      togglePreference(preference.value, event.target.checked)
                    }
                    className="mt-1 size-4 shrink-0 accent-[#7c8cff]"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">
                      {preference.label}
                    </span>
                    <span className="block text-xs leading-5 text-muted">
                      {preference.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="learning-preferences-error">
            {errors.learningPreferences?.[0]}
          </FieldError>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-muted-strong">
            Tools you can use
          </legend>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((tool) => {
              const checked = draft.tools.includes(tool.value);

              return (
                <label
                  key={tool.value}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                    checked
                      ? "border-primary/35 bg-primary/10 text-foreground"
                      : "border-border bg-background/40 text-muted hover:border-border-strong hover:text-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    name="tools"
                    value={tool.value}
                    checked={checked}
                    onChange={(event) =>
                      toggleTool(tool.value, event.target.checked)
                    }
                    className="size-3.5 accent-[#7c8cff]"
                  />
                  {tool.label}
                </label>
              );
            })}
          </div>
          <FieldError id="tools-error">{errors.tools?.[0]}</FieldError>
        </fieldset>
      </FormSection>

      <FormSection
        title="Goal and constraints"
        description="The outcomes and limits the plan has to respect."
      >
        <Field
          id="primary-goal"
          label="Primary goal"
          hint="A concrete outcome helps the roadmap choose what to include."
          error={errors.primaryGoal?.[0]}
        >
          <Textarea
            id="primary-goal"
            name="primaryGoal"
            required
            value={draft.primaryGoal}
            onChange={(event) => setField("primaryGoal", event.target.value)}
            aria-invalid={Boolean(errors.primaryGoal)}
            aria-describedby={describedBy(
              "primary-goal",
              errors.primaryGoal?.[0],
              true,
            )}
            placeholder="What should be different in your skills or opportunities?"
            maxLength={500}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="internship-target"
            label="Internship target month (optional)"
            hint="For example, summer 2027. Plans are sized backwards from this."
            error={errors.internshipTargetMonth?.[0]}
          >
            <Input
              id="internship-target"
              name="internshipTargetMonth"
              type="month"
              value={draft.internshipTargetMonth ?? ""}
              onChange={(event) =>
                setField("internshipTargetMonth", event.target.value || null)
              }
              aria-invalid={Boolean(errors.internshipTargetMonth)}
              aria-describedby={describedBy(
                "internship-target",
                errors.internshipTargetMonth?.[0],
                true,
              )}
            />
          </Field>

          <Field
            id="constraints"
            label="Constraints (optional)"
            hint="Internet stability, budget, shared laptop, exam periods — anything the plan should account for."
            error={errors.constraints?.[0]}
          >
            <Textarea
              id="constraints"
              name="constraints"
              value={draft.constraints}
              onChange={(event) => setField("constraints", event.target.value)}
              aria-invalid={Boolean(errors.constraints)}
              aria-describedby={describedBy(
                "constraints",
                errors.constraints?.[0],
                true,
              )}
              placeholder="e.g. Limited internet during commutes; no paid tools."
              maxLength={1000}
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-2.5 text-xs leading-5 text-muted">
          {mode === "preview" ? (
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
          ) : (
            <Lock
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
          )}
          <p>
            {mode === "preview"
              ? "Preview mode stores this profile in localStorage on this device only."
              : "Saved to your private Supabase profile and protected by row-level security."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {variant === "settings" ? (
            <Link
              href="/dashboard"
              className={buttonStyles({ variant: "ghost" })}
            >
              Cancel
            </Link>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Sparkles aria-hidden="true" className="size-4 animate-pulse" />
                Saving…
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="size-4" />
                {variant === "onboarding"
                  ? "Save and open dashboard"
                  : "Save changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
