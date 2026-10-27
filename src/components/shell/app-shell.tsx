"use client";

import {
  ArrowRight,
  LogOut,
  Menu,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/lib/auth/actions";
import { getNavItem, NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { usePreviewProfile } from "@/lib/preview/use-preview-profile";
import type { Profile } from "@/lib/profile/schema";
import { cn, initials } from "@/lib/utils";

type ShellProps = {
  mode: "preview" | "supabase";
  email: string;
  initialProfile: Profile | null;
  children: ReactNode;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
        active
          ? "border-primary/25 bg-primary/10 text-foreground"
          : "border-transparent text-muted hover:bg-surface-raised hover:text-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0",
          active ? "text-[#c7d0ff]" : "text-muted group-hover:text-muted-strong",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status === "planned" ? (
        <span className="shrink-0 rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
          P{item.phase}
        </span>
      ) : null}
      {item.status === "preview" ? (
        <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.625rem] font-medium text-[#b8c3ff]">
          Preview
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  profile,
  email,
  mode,
  onNavigate,
}: {
  profile: Profile | null;
  email: string;
  mode: "preview" | "supabase";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const displayName =
    mode === "preview"
      ? profile?.fullName || "Preview learner"
      : profile?.fullName || email || "Your account";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border/70 px-5">
        <Logo href={mode === "preview" ? "/" : "/dashboard"} />
      </div>

      <nav
        aria-label="Primary navigation"
        className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted/80">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border/70 p-3">
        <div className="rounded-xl border border-border bg-surface-raised/70 p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-xs font-semibold text-[#d5dbff]">
              {initials(displayName, "CF")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted">
                {mode === "preview"
                  ? "Saved in this browser only"
                  : email}
              </p>
            </div>
          </div>
          <div className="mt-3">
            {mode === "preview" ? (
              <Link
                href="/settings#environment"
                onClick={onNavigate}
                className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-2 text-xs text-muted-strong transition-colors hover:text-foreground"
              >
                Connect Supabase
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            ) : (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-strong transition-colors hover:bg-background/60 hover:text-foreground"
                >
                  <LogOut aria-hidden="true" className="size-3.5" />
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavigation({
  open,
  onClose,
  profile,
  email,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  email: string;
  mode: "preview" | "supabase";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label="Navigation menu"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm lg:hidden"
    >
      <div className="flex h-full w-[17rem] max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
          <Logo href={mode === "preview" ? "/" : "/dashboard"} />
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close navigation</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarContent
            profile={profile}
            email={email}
            mode={mode}
            onNavigate={onClose}
          />
        </div>
      </div>
    </dialog>
  );
}

export function AppShell({ mode, email, initialProfile, children }: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const profile = usePreviewProfile(initialProfile, mode === "preview");
  const current = getNavItem(pathname);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border/70 bg-surface/50 lg:block">
        <SidebarContent profile={profile} email={email} mode={mode} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            className="grid size-10 place-items-center rounded-xl border border-border text-muted-strong transition-colors hover:bg-surface-raised hover:text-foreground lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Open navigation</span>
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {current?.label ?? "CareerForge AI"}
            </p>
            <p className="hidden truncate text-xs text-muted sm:block">
              {current?.description ?? "Personal learning and career workspace"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant={mode === "preview" ? "warning" : "success"}>
              {mode === "preview" ? "Preview mode" : "Supabase connected"}
            </Badge>
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-muted-strong"
            >
              {initials(
                mode === "preview"
                  ? profile?.fullName || "Preview learner"
                  : profile?.fullName || email,
              )}
            </span>
          </div>
        </header>

        {mode === "preview" ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-warning/20 bg-warning/8 px-4 py-2 text-xs leading-5 text-[#f3d9a5] sm:px-6">
            <TriangleAlert
              aria-hidden="true"
              className="size-3.5 shrink-0 text-warning"
            />
            <span>
              Preview mode: Supabase is not configured. Profile data stays in this
              browser and accounts are disabled.
            </span>
            <Link
              href="/settings#environment"
              className="font-semibold text-warning underline-offset-4 hover:underline"
            >
              Setup steps
            </Link>
          </div>
        ) : null}

        <main
          id="main-content"
          className="mx-auto w-full max-w-[82rem] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
        >
          {children}
        </main>
      </div>

      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        profile={profile}
        email={email}
        mode={mode}
      />
    </div>
  );
}
