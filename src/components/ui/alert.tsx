import {
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: LucideIcon; iconClass: string }
> = {
  info: {
    container: "border-primary/25 bg-primary/8",
    icon: Info,
    iconClass: "text-[#aeb9ff]",
  },
  success: {
    container: "border-success/25 bg-success/8",
    icon: CircleCheck,
    iconClass: "text-success",
  },
  warning: {
    container: "border-warning/25 bg-warning/8",
    icon: TriangleAlert,
    iconClass: "text-warning",
  },
  danger: {
    container: "border-danger/25 bg-danger/8",
    icon: TriangleAlert,
    iconClass: "text-danger",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
}) {
  const meta = variantStyles[variant];
  const Icon = meta.icon;

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm leading-6",
        meta.container,
        className,
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-4.5 shrink-0", meta.iconClass)}
      />
      <div className="min-w-0 space-y-1">
        {title ? (
          <p className="font-semibold text-foreground">{title}</p>
        ) : null}
        {children ? <div className="text-muted-strong">{children}</div> : null}
      </div>
    </div>
  );
}
