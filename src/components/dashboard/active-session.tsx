"use client";

import { CircleCheck, Clock3, Square, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  getSessionModeLabel,
  type LearningSessionRecord,
} from "@/lib/sessions/types";
import { formatMinutes } from "@/lib/utils";

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function ActiveSessionCard({
  session,
  taskTitle,
  pending,
  onEnd,
}: {
  session: LearningSessionRecord;
  taskTitle: string | null;
  pending: boolean;
  onEnd: (outcome: "completed" | "abandoned", notes: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState(session.notes ?? "");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(session.startedAt).getTime()) / 1000),
  );
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-4 text-[#b8c3ff]" />
            <CardTitle>Study session in progress</CardTitle>
          </div>
          <Badge variant="accent">
            {getSessionModeLabel(session.mode)} ·{" "}
            {formatMinutes(session.plannedMinutes)}
          </Badge>
        </div>
        <CardDescription>
          {taskTitle ?? "General study"}. The clock started when you pressed
          start; time is recorded only when you finish the session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p
            className="font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl"
            aria-live="polite"
            aria-label={`${elapsedMinutes} minutes elapsed`}
          >
            {formatElapsed(elapsedSeconds)}
          </p>
          <p className="text-xs text-muted">
            Planned {formatMinutes(session.plannedMinutes)} · not yet recorded
          </p>
        </div>
        <Progress
          value={(elapsedSeconds / 60 / session.plannedMinutes) * 100}
          label="Time elapsed against the planned session length"
        />

        <div className="space-y-2">
          <Label htmlFor="session-notes">Notes (optional)</Label>
          <Textarea
            id="session-notes"
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What you worked on, what blocked you, what to revisit next time."
            className="min-h-20"
          />
          <p className="text-[0.6875rem] text-muted">
            Saved with the session. Maximum 500 characters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => onEnd("completed", notes)}
            disabled={pending}
          >
            <CircleCheck aria-hidden="true" className="size-4" />
            {pending ? "Saving…" : "Finish and record time"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onEnd("abandoned", notes)}
            disabled={pending}
          >
            <Square aria-hidden="true" className="size-3.5" />
            Abandon without counting
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0 text-warning"
          />
          Finishing records the actual elapsed time. Abandoning closes the
          session without adding it to your study time. Nothing is recorded in
          advance.
        </p>
      </CardContent>
    </Card>
  );
}
