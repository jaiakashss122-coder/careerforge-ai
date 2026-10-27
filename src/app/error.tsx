"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <Logo href="/" />
      <div className="mt-10 rounded-2xl border border-danger/25 bg-danger/8 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl border border-danger/25 bg-danger/10 text-danger">
          <TriangleAlert aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong on this page
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-strong">
          The error was contained here and no partial data was saved. You can try
          the page again or return to a safe part of the workspace. If this keeps
          happening, check the server logs and your Supabase configuration.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonStyles({ size: "md" })}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className={buttonStyles({ variant: "ghost", size: "md" })}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
