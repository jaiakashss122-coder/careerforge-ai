"use client";

import { Copy, Eye, ScrollText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldHint } from "@/components/ui/input";

/**
 * The generated lines as one block of plain text, with the rules that produced it
 * stated beside it. Cautions and provenance stay on the screen above and out of
 * this text, so a learner never paste a sentence that says nobody checked it.
 */
export function ExportText({
  text,
  label,
  characterNote,
}: {
  text: string;
  label: string;
  characterNote: string;
}) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<string | null>(null);

  async function copy() {
    setCopyState(null);

    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");

      await navigator.clipboard.writeText(text);
      setCopyState("The text above is on your clipboard.");
    } catch {
      setCopyState(
        "Copy is unavailable in this browser. Select the text and copy it yourself.",
      );
    }
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-surface/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScrollText aria-hidden="true" className="size-4" />
          The plain text a résumé builder or a file would receive
        </h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <Eye aria-hidden="true" className="size-4" />
          {open ? "Hide the text" : "Show the text"}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted">
        Every line above in order, with each section named. The cautions, the
        record each line came from, and any bracketed instruction stay on screen
        and out of this text — they are for you to act on before you send
        anything, not wording to hand to an employer.
      </p>

      {open ? (
        <div className="space-y-2.5">
          <textarea
            readOnly
            value={text}
            rows={18}
            aria-label={label}
            className="w-full rounded-xl border border-border-strong bg-background/60 px-3.5 py-3 font-mono text-xs leading-5 text-foreground"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => void copy()}>
              <Copy aria-hidden="true" className="size-4" />
              Copy this text
            </Button>
            <FieldHint>{characterNote}</FieldHint>
          </div>
          {copyState ? (
            <p className="text-xs leading-5 text-muted-strong" role="status">
              {copyState}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
