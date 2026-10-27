import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6"
    >
      <Logo href="/" />
      <div className="mt-10 rounded-2xl border border-border bg-surface/70 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-[#c7d0ff]">
          <Compass aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          404 — Not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          This page does not exist
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-strong">
          The link may be outdated, or the feature may not have been built yet.
          Anything unfinished is labeled as planned rather than served as a fake
          screen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className={buttonStyles({ size: "md" })}>
            Go to dashboard
          </Link>
          <Link
            href="/roadmap"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            View the roadmap
          </Link>
          <Link
            href="/"
            className={buttonStyles({ variant: "ghost", size: "md" })}
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
