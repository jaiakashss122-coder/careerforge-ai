"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  countInstructionSlots,
  formatMaterialDay,
} from "@/lib/materials/text";
import type { MaterialBlock, MaterialEntry, MaterialSource } from "@/lib/materials/types";

function SourceList({ sources }: { sources: MaterialSource[] }) {
  return (
    <ul className="space-y-1.5">
      {sources.map((source, index) => (
        <li
          // The same label can appear twice on one line, so the position is part of the key.
          key={`${source.kind}-${source.label}-${index}`}
          className="text-xs leading-5 text-muted"
        >
          <span className="font-medium text-muted-strong">{source.label}</span>
          {" — "}
          {source.detail}
          {source.date
            ? ` (${formatMaterialDay(source.date) ?? "a date this app cannot read"})`
            : ""}
          {source.verified ? " · confirmed by someone outside this app" : ""}
        </li>
      ))}
    </ul>
  );
}

function EntryRow({ entry }: { entry: MaterialEntry }) {
  const [open, setOpen] = useState(false);
  const slots = countInstructionSlots(entry.text);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-raised/40 p-3.5">
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
        {entry.text}
      </p>

      {slots > 0 ? (
        <p className="text-xs leading-5 text-warning">
          {slots === 1
            ? "One bracketed line here is an instruction to you, not wording for the document. The exported text leaves it out."
            : `${slots} bracketed lines here are instructions to you, not wording for the document. The exported text leaves them out.`}
        </p>
      ) : null}

      {entry.caution ? (
        <p className="rounded-lg border-l-2 border-warning/70 bg-warning/8 py-1.5 pl-3 pr-2 text-xs leading-5 text-muted-strong">
          {entry.caution}
        </p>
      ) : null}

      {entry.sources.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-strong underline decoration-dotted underline-offset-4"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
            {open
              ? "Hide the records this line came from"
              : `Show the ${entry.sources.length} record${
                  entry.sources.length === 1 ? "" : "s"
                } this line came from`}
          </button>
          {open ? <SourceList sources={entry.sources} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function BlockSection({ block }: { block: MaterialBlock }) {
  return (
    <section
      aria-labelledby={`block-${block.key}`}
      className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4"
    >
      <div className="space-y-1.5">
        <h3
          id={`block-${block.key}`}
          className="text-sm font-semibold text-foreground"
        >
          {block.title}
        </h3>
        <p className="text-sm leading-6 text-muted">{block.purpose}</p>
      </div>

      {block.entries.length > 0 ? (
        <div className="space-y-2.5">
          {block.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border-strong px-3 py-4 text-sm leading-6 text-muted">
          This app wrote no line for this section, because none of your records
          reach it. What is missing is listed underneath.
        </p>
      )}

      {block.gaps.length > 0 ? (
        <div className="space-y-1.5 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
              What is missing here
            </p>
            <Badge variant="muted">
              {block.gaps.length}{" "}
              {block.gaps.length === 1 ? "gap" : "gaps"} listed
            </Badge>
          </div>
          <ul className="space-y-1.5">
            {block.gaps.map((gap, index) => (
              <li
                key={`${block.key}-gap-${index}`}
                className="text-xs leading-5 text-muted"
              >
                · {gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {block.note ? (
        <p className="text-xs leading-5 text-muted-strong">{block.note}</p>
      ) : null}
    </section>
  );
}

export function MaterialBlocks({ blocks }: { blocks: readonly MaterialBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BlockSection key={block.key} block={block} />
      ))}
    </div>
  );
}
