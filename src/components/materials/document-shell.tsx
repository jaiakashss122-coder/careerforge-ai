"use client";

import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DraftPanel } from "@/components/materials/draft-panel";
import { ExportText } from "@/components/materials/export-text";
import { MaterialBlocks } from "@/components/materials/material-blocks";
import type { MaterialsActions } from "@/components/materials/use-materials-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { renderBlocksAsText } from "@/lib/materials/text";
import {
  MATERIAL_KIND_META,
  type DraftBuiltFrom,
  type MaterialBlock,
  type MaterialDraftRecord,
  type MaterialKind,
} from "@/lib/materials/types";
import type { JobApplicationRecord } from "@/lib/interview/types";

export function DocumentShell({
  kind,
  icon: Icon,
  summary,
  counts,
  blocks,
  exportTitle,
  extra,
  draft,
  applications,
  currentFingerprint,
  actions,
}: {
  kind: MaterialKind;
  icon: LucideIcon;
  summary: string;
  counts: { entries: number; cautions: number; gaps: number };
  blocks: readonly MaterialBlock[];
  exportTitle: string;
  extra?: ReactNode;
  draft: MaterialDraftRecord | null;
  applications: JobApplicationRecord[];
  currentFingerprint: DraftBuiltFrom;
  actions: MaterialsActions;
}) {
  const meta = MATERIAL_KIND_META[kind];
  // Fixed when this document first renders, so the stamp in the exported text
  // matches the records that were on screen rather than drifting by the second.
  const [generatedOn] = useState(() => new Date().toISOString());

  const exportText = useMemo(
    () => renderBlocksAsText({ title: exportTitle, blocks, generatedOn }),
    [exportTitle, blocks, generatedOn],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4" />
          {meta.label}
        </CardTitle>
        <CardDescription>{meta.whatItHolds}</CardDescription>
        <p className="text-xs leading-5 text-muted">{meta.howItIsBuilt}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2.5 rounded-2xl border border-border bg-surface-raised/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">
              {counts.entries} {counts.entries === 1 ? "line" : "lines"} written
              from your records
            </Badge>
            <Badge variant="warning">
              {counts.cautions} {counts.cautions === 1 ? "line" : "lines"} carry a
              caution
            </Badge>
            <Badge variant="muted">
              {counts.gaps} {counts.gaps === 1 ? "gap" : "gaps"} named
            </Badge>
          </div>
          <p className="text-sm leading-6 text-muted-strong">{summary}</p>
        </div>

        {extra}

        <MaterialBlocks blocks={blocks} />

        <ExportText
          text={exportText}
          label={`Text to copy for the ${meta.sentenceLabel}`}
          characterNote={`${exportText.length} characters. A section with nothing to write keeps its name and its gap instead of an empty block.`}
        />

        <DraftPanel
          kind={kind}
          draft={draft}
          applications={applications}
          currentFingerprint={currentFingerprint}
          generatedText={exportText}
          actions={actions}
        />
      </CardContent>
    </Card>
  );
}
