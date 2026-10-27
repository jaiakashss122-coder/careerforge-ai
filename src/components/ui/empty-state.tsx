import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl border border-border bg-surface-raised text-muted-strong">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
