"use client";

import { Briefcase, ChevronDown, Target } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CAREER_ROLE_PROFILE_DISCLAIMER, getRoleProfile, getRolePortfolioProjectSlugs, getRoleSkills } from "@/lib/career/role-profiles";
import { CAREER_TRACKS, type CareerTrackSlug } from "@/lib/career/tracks";
import { PROJECT_LEVEL_META } from "@/lib/projects/types";

function Section({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
        {title} ({items.length})
      </p>
      <ul className="space-y-1 text-sm leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

function ProfileRow({ slug }: { slug: CareerTrackSlug }) {
  const [open, setOpen] = useState(false);
  const track = CAREER_TRACKS.find((entry) => entry.slug === slug);
  const profile = getRoleProfile(slug);
  const skills = getRoleSkills(slug);
  const projects = getRolePortfolioProjectSlugs(slug);

  if (!track) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-raised/40">
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{track.family}</Badge>
            <Badge variant="muted">
              {skills.length} {skills.length === 1 ? "skill" : "skills"}
            </Badge>
            <Badge variant="muted">
              {projects.length}{" "}
              {projects.length === 1 ? "portfolio project" : "portfolio projects"}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-foreground">{track.name}</p>
          <p className="text-sm leading-6 text-muted">{track.summary}</p>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border p-4">
          <Section title="What the work consists of" items={profile.responsibilities} />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Tools this kind of work normally uses ({profile.tools.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.tools.map((tool) => (
                <Badge key={tool} variant="muted">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Skills this workspace can show evidence for ({skills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.slug} variant="accent">
                  {skill.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted">
              Listing a skill here does not mark it as mastered. It only means
              the assessment and the projects decide whether you have
              demonstrated it.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Projects that produce work for this role ({projects.length})
            </p>
            <ul className="space-y-1 text-sm leading-6 text-muted">
              {projects.map((project) => (
                <li key={project.slug}>
                  · {project.title} ({PROJECT_LEVEL_META[project.level].label})
                </li>
              ))}
            </ul>
          </div>

          <Section title="What you would be asked about" items={profile.interviewTopics} />
          <Section title="What you would need to show" items={profile.entryBar} />

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              Where the work usually leads
            </p>
            <p className="text-sm leading-6 text-muted">{profile.progression}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoleProfileBoard() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase aria-hidden="true" className="size-4" />
            Nine role profiles
          </CardTitle>
          <CardDescription>
            Open a role to see what the day-to-day work is, which tools it names,
            what you would be asked in an interview, and what you would need to
            show. {CAREER_ROLE_PROFILE_DISCLAIMER}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {CAREER_TRACKS.map((track) => (
            <ProfileRow key={track.slug} slug={track.slug} />
          ))}
        </CardContent>
      </Card>

      <Alert variant="warning" title="Entry bars are not market data">
        The entry requirements describe work you could put in front of a reader
        today. They are not a claim about what employers currently ask for, and
        nothing here was fetched from a job board.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target aria-hidden="true" className="size-4" />
            How the ranking is calculated
          </CardTitle>
          <CardDescription>
            Each role score has two parts. The first is the fit your assessment
            answers produce, out of 100: how much you rated the interests that
            role depends on, how your working style and preferred activity match
            it, how your skill readiness compares, and whether it is the target
            role saved in your profile. The second part is only added after you
            test the role: your reflection moves the score by up to 15 points in
            either direction, based on interest, enjoyment and willingness to
            practise. Difficulty is recorded but never added, because a hard
            activity you would still practise is a stronger signal than an easy
            one you found comfortable.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
