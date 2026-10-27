import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  accent: "border-primary/30 bg-primary/12 text-[#c7d0ff]",
  success: "border-success/30 bg-success/10 text-[#8ef0c7]",
  warning: "border-warning/30 bg-warning/10 text-[#fcd77d]",
  danger: "border-danger/30 bg-danger/10 text-[#ffa3b3]",
  muted: "border-border bg-surface-raised text-muted-strong",
  outline: "border-border-strong bg-transparent text-muted-strong",
};

export function Badge({
  className,
  variant = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
