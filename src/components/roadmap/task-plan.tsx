import {
  BookOpen,
  ExternalLink,
  HelpCircle,
  ListChecks,
  RefreshCw,
  Target,
} from "lucide-react";
import type { RoadmapResources } from "@/lib/roadmap/types";

export function TaskPlanDetails({
  resources,
}: {
  resources: RoadmapResources;
}) {
  const safeLinks = resources.links.filter(
    (link) => link.href.startsWith("https://") || link.href.startsWith("http://"),
  );

  return (
    <div className="space-y-4">
      {resources.assessmentGap ? (
        <p className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/8 p-3 text-xs leading-5 text-muted-strong">
          <Target
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-[#b8c3ff]"
          />
          {resources.assessmentGap}
        </p>
      ) : null}

      {resources.sessionPlan.learn.length > 0 ? (
        <div>
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            <BookOpen aria-hidden="true" className="size-3.5" />
            Learn
          </p>
          <ul className="mt-1.5 space-y-1 text-xs leading-5 text-muted-strong">
            {resources.sessionPlan.learn.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1 shrink-0 rounded-full bg-primary"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resources.sessionPlan.exercise ? (
        <div>
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            <ListChecks aria-hidden="true" className="size-3.5" />
            Coding exercise
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-strong">
            {resources.sessionPlan.exercise}
          </p>
        </div>
      ) : null}

      {resources.sessionPlan.check.length > 0 ? (
        <div>
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            <HelpCircle aria-hidden="true" className="size-3.5" />
            Knowledge check
          </p>
          <div className="mt-1.5 space-y-2">
            {resources.sessionPlan.check.map((item) => (
              <details
                key={item.question}
                className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs leading-5"
              >
                <summary className="cursor-pointer text-muted-strong">
                  {item.question}
                </summary>
                <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {resources.sessionPlan.revision ? (
        <div>
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Revision
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-strong">
            {resources.sessionPlan.revision}
          </p>
        </div>
      ) : null}

      {safeLinks.length > 0 ? (
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
            References
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {safeLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs text-muted-strong transition-colors hover:border-border-strong hover:text-foreground"
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
