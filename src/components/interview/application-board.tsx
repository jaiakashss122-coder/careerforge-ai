"use client";

import { BriefcaseBusiness, Trash2 } from "lucide-react";
import { useState } from "react";
import type { InterviewActions } from "@/components/interview/use-interview-actions";import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { EVIDENCE_LEVEL_LABELS, type EvidenceLevel } from "@/lib/evidence/types";
import { SKILLS } from "@/lib/skills/catalog";
import {
  DESCRIPTION_DISCLAIMER,
  buildGapReport,
  readJobDescription,
  type GapReport,
  type SkillPosition,
} from "@/lib/interview/description";
import {
  APPLICATION_SOURCE_KINDS,
  APPLICATION_SOURCE_META,
  APPLICATION_STATUS_META,
  INTERVIEW_STATUSES,
  MAX_APPLICATION_FIELD_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
  MIN_JOB_DESCRIPTION_LENGTH,
  type ApplicationSourceKind,
  type ApplicationStatus,
  type JobApplicationRecord,
} from "@/lib/interview/types";

const POSITION_STATE_META: Record<
  SkillPosition["state"],
  { label: string; variant: BadgeVariant }
> = {
  supported: { label: "Your records support it", variant: "success" },
  partial: { label: "Part of the way", variant: "warning" },
  untested: { label: "No record either way", variant: "muted" },
  gap: { label: "Below the line", variant: "danger" },
};

const STATUS_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  saved: "muted",
  prepared: "accent",
  applied: "accent",
  interviewing: "warning",
  offer: "success",
  closed: "danger",
};

const EMPTY_DRAFT = {
  company: "",
  roleTitle: "",
  jobUrl: "",
  location: "",
  sourceKind: "real" as ApplicationSourceKind,
  status: "saved" as ApplicationStatus,
  appliedOn: "",
  nextAction: "",
  nextActionOn: "",
  notes: "",
  description: "",
};

function levelLabel(value: string | null) {
  if (!value) return null;
  return EVIDENCE_LEVEL_LABELS[value as EvidenceLevel] ?? value;
}

function SkillPositionRow({ position }: { position: SkillPosition }) {
  const state = POSITION_STATE_META[position.state];
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-raised/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{position.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={position.wanted === "required" ? "outline" : "muted"}>
            {position.wanted === "required"
              ? "Asked for plainly"
              : "Named as a bonus"}
          </Badge>
          <Badge variant={state.variant}>{state.label}</Badge>
          {position.evidencedAs ? (
            <button
              type="button"
              className="rounded-md px-1.5 py-1 text-xs font-medium text-muted-strong underline decoration-dotted hover:bg-surface-raised hover:text-foreground"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
            >
              {open ? "Hide the record" : "Show the record"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{position.evidenceNote}</p>
      {position.quoted.length > 0 ? (
        <p className="mt-1.5 text-xs leading-5 text-muted">
          Words from the posting you pasted:{" "}
          {position.quoted.map((phrase) => `“${phrase}”`).join(", ")}
        </p>
      ) : null}
      {open && position.evidencedAs ? (
        <p className="mt-2 text-xs leading-5 text-muted">
          Your own records place this skill at “{levelLabel(position.evidencedAs)}”.
          That level was written by you, and no reviewer outside this app has
          confirmed it.
        </p>
      ) : null}
    </div>
  );
}

function GapReportPanel({
  report,
  reading,
}: {
  report: GapReport;
  reading: ReturnType<typeof readJobDescription>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
          What the posting asks for against what you have recorded
        </p>
        <Badge variant="muted">
          {report.total} skill{report.total === 1 ? "" : "s"} read ·{" "}
          {report.requiredCount} asked for plainly, {report.preferredCount} named
          as a bonus
        </Badge>
      </div>

      {reading.roles.length > 0 ? (
        <p className="text-sm leading-6 text-muted">
          The text also reads like{" "}
          {reading.roles.map((role) => role.name).join(", ")} work. That is a
          guess from the words, not a decision about whether you fit the role.
        </p>
      ) : null}

      <p className="text-sm leading-6 text-muted-strong">{report.focus}</p>

      {report.positions.length === 0 ? (
        <p className="text-sm leading-6 text-muted">{report.note}</p>
      ) : (
        <>
          <div className="space-y-2">
            {report.positions.map((position) => (
              <SkillPositionRow key={position.slug} position={position} />
            ))}
          </div>
          <p className="text-xs leading-5 text-muted">{report.note}</p>
        </>
      )}

      {reading.ignored.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
            Parts of the posting this app leaves out ({reading.ignored.length})
          </p>
          {reading.ignored.map((line) => (
            <p key={line} className="text-xs leading-5 text-muted">
              · {line}
            </p>
          ))}
        </div>
      ) : null}

      <p className="text-xs leading-5 text-muted">{DESCRIPTION_DISCLAIMER}</p>
    </div>
  );
}

function SaveRoleForm({ actions }: { actions: InterviewActions }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [showReading, setShowReading] = useState(false);

  const description = draft.description.trim();
  const reading = readJobDescription(description);
  const busy = actions.busyId === "application:save";

  const set = <K extends keyof typeof EMPTY_DRAFT>(
    key: K,
    value: (typeof EMPTY_DRAFT)[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const needsAppliedDate = draft.status === "applied" && draft.appliedOn === "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role-company">Organisation</Label>
          <Input
            id="role-company"
            value={draft.company}
            maxLength={MAX_APPLICATION_FIELD_LENGTH}
            onChange={(event) => set("company", event.target.value)}
            placeholder="The name on the posting"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-title">Role title</Label>
          <Input
            id="role-title"
            value={draft.roleTitle}
            maxLength={MAX_APPLICATION_FIELD_LENGTH}
            onChange={(event) => set("roleTitle", event.target.value)}
            placeholder="Exactly as the posting words it"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-url">Link to the posting</Label>
          <Input
            id="role-url"
            value={draft.jobUrl}
            onChange={(event) => set("jobUrl", event.target.value)}
            placeholder="https:// — or leave empty"
          />
          <FieldHint>
            Stored as text. This app never opens the link, so nothing here knows
            whether the page still exists.
          </FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-location">Location as the posting writes it</Label>
          <Input
            id="role-location"
            value={draft.location}
            maxLength={MAX_APPLICATION_FIELD_LENGTH}
            onChange={(event) => set("location", event.target.value)}
            placeholder="City, country, or the wording used"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-source">Where this role came from</Label>
          <Select
            id="role-source"
            value={draft.sourceKind}
            onChange={(event) =>
              set("sourceKind", event.target.value as ApplicationSourceKind)
            }
          >
            {APPLICATION_SOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {APPLICATION_SOURCE_META[kind].label}
              </option>
            ))}
          </Select>
          <FieldHint>{APPLICATION_SOURCE_META[draft.sourceKind].meaning}</FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-status">Where it stands</Label>
          <Select
            id="role-status"
            value={draft.status}
            onChange={(event) =>
              set("status", event.target.value as ApplicationStatus)
            }
          >
            {INTERVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_META[status].label}
              </option>
            ))}
          </Select>
          <FieldHint>{APPLICATION_STATUS_META[draft.status].meaning}</FieldHint>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-applied-on">Date you sent it</Label>
          <Input
            id="role-applied-on"
            type="date"
            value={draft.appliedOn}
            onChange={(event) => set("appliedOn", event.target.value)}
          />
          {needsAppliedDate ? (
            <FieldHint>
              The date is needed while the status reads “Applied”, so the record
              stays checkable later.
            </FieldHint>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-next-action">Next action you owe it</Label>
          <Input
            id="role-next-action"
            value={draft.nextAction}
            maxLength={MAX_APPLICATION_FIELD_LENGTH}
            onChange={(event) => set("nextAction", event.target.value)}
            placeholder="For example: send the follow-up email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-next-on">Date of that next action</Label>
          <Input
            id="role-next-on"
            type="date"
            value={draft.nextActionOn}
            onChange={(event) => set("nextActionOn", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-notes">Notes to yourself</Label>
          <Textarea
            id="role-notes"
            value={draft.notes}
            maxLength={MAX_NOTES_LENGTH}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Who you spoke to, what you were told, what you still need to check."
          />
          <FieldHint>
            {draft.notes.length} of {MAX_NOTES_LENGTH} characters.
          </FieldHint>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-description">Paste the posting text</Label>
        <Textarea
          id="role-description"
          value={draft.description}
          maxLength={MAX_JOB_DESCRIPTION_LENGTH}
          rows={8}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Paste the responsibilities and requirements section. The comparison below only reads these words."
        />
        <FieldHint>
          {description.length} of {MAX_JOB_DESCRIPTION_LENGTH} characters used.
          {description.length === 0
            ? " Leave it empty if you only want to track the role, and no comparison is shown."
            : description.length < MIN_JOB_DESCRIPTION_LENGTH
              ? ` At least ${MIN_JOB_DESCRIPTION_LENGTH} characters are needed before anything useful can be read out of it — ${MIN_JOB_DESCRIPTION_LENGTH - description.length} more to go.`
              : ` This app knows ${SKILLS.length} skills and finds the ones whose words appear here.`}
        </FieldHint>
      </div>

      {description.length >= MIN_JOB_DESCRIPTION_LENGTH ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface/50 p-3">
          <p className="text-sm leading-6 text-muted-strong">
            Read from these words right now: {reading.skills.length} skill
            {reading.skills.length === 1 ? "" : "s"} named, in{" "}
            {reading.characterCount} characters and {reading.wordCount} words.
          </p>
          {reading.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reading.skills.map((skill) => (
                <Badge key={skill.slug} variant="muted">
                  {skill.name} ·{" "}
                  {skill.wanted === "required" ? "asked for plainly" : "a bonus"}
                </Badge>
              ))}
            </div>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReading((current) => !current)}
            aria-expanded={showReading}
          >
            {showReading
              ? "Hide which words were matched"
              : "Show which words were matched"}
          </Button>
          {showReading ? (
            <ul className="space-y-1 text-xs leading-5 text-muted">
              {reading.skills.map((skill) => (
                <li key={skill.slug}>
                  · {skill.name}: {skill.quoted.map((phrase) => `“${phrase}”`).join(", ")}
                </li>
              ))}
              {reading.skills.length === 0 ? (
                <li>
                  · Nothing matched, so no words are listed. That usually means
                  the pasted text is a title or a summary.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Button
        size="sm"
        disabled={
          busy ||
          draft.company.trim() === "" ||
          draft.roleTitle.trim() === "" ||
          needsAppliedDate
        }
        onClick={() => {
          void actions.saveApplication(draft).then((ok) => {
            if (ok) setDraft(EMPTY_DRAFT);
          });
        }}
      >
        {busy ? "Saving…" : "Save this role"}
      </Button>
      {draft.company.trim() === "" || draft.roleTitle.trim() === "" ? (
        <FieldHint>
          Both the organisation and the role title are needed before this can be
          saved.
        </FieldHint>
      ) : null}
    </div>
  );
}

function SavedRoleCard({
  application,
  skillPercents,
  evidenceLevels,
  actions,
}: {
  application: JobApplicationRecord;
  skillPercents: Map<string, number>;
  evidenceLevels: Map<string, string>;
  actions: InterviewActions;
}) {
  const [draft, setDraft] = useState({
    status: application.status,
    appliedOn: application.appliedOn ?? "",
    nextAction: application.nextAction ?? "",
    nextActionOn: application.nextActionOn ?? "",
    notes: application.notes,
    description: application.description,
  });
  const [showUpdate, setShowUpdate] = useState(false);

  const reading = readJobDescription(application.description);
  const report =
    application.description.trim().length >= MIN_JOB_DESCRIPTION_LENGTH
      ? buildGapReport({ reading, skillPercents, evidenceLevels })
      : null;
  const busy = actions.busyId === `progress:${application.id}`;
  const needsAppliedDate = draft.status === "applied" && draft.appliedOn === "";
  const draftDescription = draft.description.trim();
  const pendingReading = readJobDescription(draftDescription);
  const textTooShort =
    draftDescription !== "" &&
    draftDescription.length < MIN_JOB_DESCRIPTION_LENGTH;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {application.roleTitle} · {application.company}
          </p>
          <p className="text-xs leading-5 text-muted">
            Saved {application.createdAt.slice(0, 10)}
            {application.location ? ` · ${application.location}` : ""}
            {application.appliedOn ? ` · sent ${application.appliedOn}` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant={STATUS_VARIANT[application.status]}>
              {APPLICATION_STATUS_META[application.status].label}
            </Badge>
            <Badge variant="outline">
              {APPLICATION_SOURCE_META[application.sourceKind].label}
            </Badge>
            {application.description.trim() === "" ? (
              <Badge variant="muted">No posting text</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-muted-strong underline decoration-dotted"
            >
              Open the link you stored
            </a>
          ) : null}
          <Button
            size="sm"
            variant="danger"
            disabled={
              actions.busyId === `application:remove:${application.id}`
            }
            onClick={() => void actions.removeApplication(application.id)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Remove
          </Button>
        </div>
      </div>

      {application.nextAction ? (
        <p className="text-sm leading-6 text-muted">
          Next action: {application.nextAction}
          {application.nextActionOn ? ` on ${application.nextActionOn}` : ""}.
        </p>
      ) : null}

      {application.notes ? (
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface-raised/40 p-3 text-sm leading-6 text-muted">
          {application.notes}
        </p>
      ) : null}

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-sm leading-6 text-muted">
          {APPLICATION_STATUS_META[application.status].meaning}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowUpdate((current) => !current)}
          aria-expanded={showUpdate}
        >
          {showUpdate
            ? "Hide the update form"
            : "Update where this role stands"}
        </Button>
      </div>

      {showUpdate ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`status-${application.id}`}>Where it stands</Label>
              <Select
                id={`status-${application.id}`}
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ApplicationStatus,
                  }))
                }
              >
                {INTERVIEW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {APPLICATION_STATUS_META[status].label}
                  </option>
                ))}
              </Select>
              <FieldHint>
                {APPLICATION_STATUS_META[draft.status].meaning}
              </FieldHint>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`applied-${application.id}`}>Date you sent it</Label>
              <Input
                id={`applied-${application.id}`}
                type="date"
                value={draft.appliedOn}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    appliedOn: event.target.value,
                  }))
                }
              />
              {needsAppliedDate ? (
                <FieldHint>
                  Needed while the status reads “Applied”. Saving is blocked
                  until it is filled in.
                </FieldHint>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`next-${application.id}`}>Next action</Label>
              <Input
                id={`next-${application.id}`}
                value={draft.nextAction}
                maxLength={MAX_APPLICATION_FIELD_LENGTH}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nextAction: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`next-on-${application.id}`}>
                Date of that next action
              </Label>
              <Input
                id={`next-on-${application.id}`}
                type="date"
                value={draft.nextActionOn}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nextActionOn: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`notes-${application.id}`}>Notes to yourself</Label>
            <Textarea
              id={`notes-${application.id}`}
              value={draft.notes}
              maxLength={MAX_NOTES_LENGTH}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
            />
            <FieldHint>
              {draft.notes.length} of {MAX_NOTES_LENGTH} characters.
            </FieldHint>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`description-${application.id}`}>
              Posting text (this is what the comparison reads)
            </Label>
            <Textarea
              id={`description-${application.id}`}
              value={draft.description}
              rows={6}
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
            <FieldHint>
              {draftDescription.length} of {MAX_JOB_DESCRIPTION_LENGTH}{" "}
              characters.
              {draftDescription === ""
                ? application.description.trim() === ""
                  ? " Nothing has been pasted yet, so this role has no comparison."
                  : " Clearing this removes the stored text and every comparison built from it."
                : draftDescription.length < MIN_JOB_DESCRIPTION_LENGTH
                  ? ` At least ${MIN_JOB_DESCRIPTION_LENGTH} characters are needed, so ${
                      MIN_JOB_DESCRIPTION_LENGTH - draftDescription.length
                    } more are missing. Paste the responsibilities and requirements, or empty the field.`
                  : ` Read right now: ${pendingReading.skills.length} of the ${SKILLS.length} skills this app knows appear in these words.`}
            </FieldHint>
          </div>
          <Button
            size="sm"
            disabled={busy || needsAppliedDate || textTooShort}
            onClick={() =>
              void actions.updateProgress({
                applicationId: application.id,
                ...draft,
              })
            }
          >
            {busy ? "Saving…" : "Save the update"}
          </Button>
        </div>
      ) : null}

      {report ? (
        <GapReportPanel report={report} reading={reading} />
      ) : (
        <p className="text-sm leading-6 text-muted">
          No posting text is stored with this role, so there is nothing to compare
          against your records. Open “Update where this role stands” above and
          paste the responsibilities and requirements into the posting text field.
        </p>
      )}
    </div>
  );
}

export function ApplicationBoard({
  applications,
  skillPercents,
  evidenceLevels,
  actions,
}: {
  applications: JobApplicationRecord[];
  skillPercents: Map<string, number>;
  evidenceLevels: Map<string, string>;
  actions: InterviewActions;
}) {
  const withText = applications.filter(
    (application) => application.description.trim() !== "",
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BriefcaseBusiness aria-hidden="true" className="size-4" />
          Roles you are tracking
        </CardTitle>
        <CardDescription>
          Record a role, paste its posting text, and this app reads that text
          against the {SKILLS.length} skills it knows and the records on your own
          account. {applications.length}{" "}
          {applications.length === 1 ? "role is" : "roles are"} saved here,{" "}
          {withText} of them with posting text to compare. Nothing here contacts
          an employer, checks that a vacancy exists, or turns pay or seniority
          wording into a claim about you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SaveRoleForm actions={actions} />

        {applications.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No role has been recorded yet"
            description="Save one above with the organisation, the role title and the posting text. The comparison appears underneath it as soon as there are words to read."
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <SavedRoleCard
                key={application.id}
                application={application}
                skillPercents={skillPercents}
                evidenceLevels={evidenceLevels}
                actions={actions}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
