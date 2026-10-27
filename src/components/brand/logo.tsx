import { Flame } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="CareerForge AI home"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/25 via-surface-raised to-accent/20 shadow-[0_0_24px_-8px_rgba(124,140,255,0.7)]"
      >
        <Flame className="size-4.5 text-[#c7d0ff]" />
      </span>
      {compact ? (
        <span className="sr-only">CareerForge AI</span>
      ) : (
        <span className="text-sm font-semibold tracking-tight sm:text-[0.9375rem]">
          CareerForge <span className="text-[#b8c3ff]">AI</span>
        </span>
      )}
    </Link>
  );
}
