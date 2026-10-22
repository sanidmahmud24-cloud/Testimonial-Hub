"use client";

// New-workspace form (client component).
//
// Loading-state model
// -------------------
// React 19's `<form action={fn}>` treats `fn` as a "client action" when
// it returns a Promise. React automatically:
//   1. Wraps the call in its own transition so the rest of the UI stays
//      responsive.
//   2. Tracks the Promise, exposing the submission's pending state via
//      `useFormStatus()` in any descendant component.
//   3. Disables interactive form controls while the action is in flight,
//      blocking duplicate submissions at the framework level.
//
// We therefore:
//   * Make `onSubmit` an async function that returns the Promise from
//     the server action. We do NOT wrap it in `startTransition(...)`
//     ourselves — that double-wraps React's transition and, in
//     practice, flips `useTransition`'s `pending` flag back to `false`
//     the moment the synchronous return value is observed. The symptom
//     users see is the button reverting from "Creating…" to "Create
//     Brand Space" while the server action silently runs in the
//     background, so the page appears stuck.
//   * Drop `useTransition()` entirely and read `useFormStatus().pending`
//     inside a small child <SubmitButton/> that lives inside the form.
//     That gives us an authoritative, framework-managed loading state
//     and free protection against double-submits while the action is
//     still resolving on the server.
//   * Keep using the browser's `router.push(...)` from
//     `next/navigation` to navigate after a successful create, since
//     the server action no longer throws a NEXT_REDIRECT itself.

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestSlug } from "@/lib/util/slug";
import { createWorkspaceAction } from "@/app/dashboard/workspaces/actions";

type FieldName = "name" | "slug" | "description";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlugLive(value: string): string | null {
  if (!value) return null; // empty: don't shout until the user types
  if (value.length < 3) return "Slug must be at least 3 characters.";
  if (value.length > 32) return "Slug must be at most 32 characters.";
  if (!SLUG_REGEX.test(value)) {
    return "Lowercase a-z, 0-9, and single hyphens only (no leading/trailing).";
  }
  return null;
}

export function NewWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorField, setServerErrorField] =
    useState<FieldName | null>(null);

  // Live client-side slug validation. Only shown after the user has
  // interacted with the field, so we don't yell at them on first paint.
  const slugLiveError = useMemo(
    () => (slugTouched ? validateSlugLive(slug) : null),
    [slug, slugTouched],
  );

  // Origin for the public URL preview. Computed on the client so the
  // preview reflects whatever host the user is actually on (localhost,
  // a tunnel, production, etc.). useSyncExternalStore keeps the read
  // SSR-safe and avoids a cascading render on mount.
  const origin = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => "",
  );

  const previewSlug = slug && !slugLiveError ? slug : "your-slug";
  const previewHref = `${origin || "https://example.com"}/c/${previewSlug}`;

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  // Returns a Promise so React 19's `<form action={onSubmit}>` treats
  // this as an async client action and tracks the pending state for
  // `useFormStatus()` until the server action resolves.
  async function onSubmit(formData: FormData) {
    setServerError(null);
    setServerErrorField(null);
    if (slugLiveError) {
      // Client-side validation short-circuit. React will still flip
      // useFormStatus.pending back to false immediately because we
      // return a resolved Promise with no error.
      setServerError(slugLiveError);
      setServerErrorField("slug");
      return;
    }
    try {
      const result = await createWorkspaceAction(formData);
      if (result.ok) {
        router.push(`/dashboard/workspaces/${result.id}`);
      } else {
        setServerError(result.error);
        setServerErrorField(
          (result.field as FieldName | undefined) ?? null,
        );
        // Swallow into the resolved Promise so React treats this as a
        // successful "form action" submission — no NEXT_REDIRECT
        // throw, no unhandled rejection. The button returns to its
        // normal state and the inline error banner remains visible.
      }
    } catch (err) {
      // Defensive: any unexpected throw (network error, DB outage,
      // etc.) is surfaced to the user instead of leaving the form in
      // an undefined state.
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong creating your workspace. Please try again.";
      setServerError(message);
    }
  }

  const nameInvalid = serverErrorField === "name";
  const slugInvalid =
    serverErrorField === "slug" || (slugTouched && Boolean(slugLiveError));
  const descriptionInvalid = serverErrorField === "description";

  return (
    <form
      action={onSubmit}
      className="space-y-5"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="name" className="text-zinc-200">
          Brand or Product Name
        </Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-invalid={nameInvalid || undefined}
          aria-describedby={nameInvalid ? "name-error" : "name-help"}
          placeholder="Acme Inc."
          className="h-10 border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
        <p
          id="name-help"
          className="text-xs text-zinc-500"
        >
          Enter the company, brand, or product name for these testimonials.
        </p>
        {nameInvalid && serverError ? (
          <p
            id="name-error"
            role="alert"
            className="text-xs font-medium text-red-400"
          >
            {serverError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="slug" className="text-zinc-200">
            Collection Link Name
          </Label>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            Required
          </span>
        </div>
        <Input
          id="slug"
          name="slug"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Lowercase a-z, 0-9, single hyphens"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          aria-invalid={slugInvalid || undefined}
          aria-describedby={
            slugInvalid ? "slug-error" : "slug-help"
          }
          placeholder="acme"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-10 border-white/10 bg-white/5 px-3 font-mono text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
        {slugInvalid ? (
          <p
            id="slug-error"
            role="alert"
            className="text-xs font-medium text-red-400"
          >
            {serverErrorField === "slug" && serverError
              ? serverError
              : slugLiveError}
          </p>
        ) : (
          <p id="slug-help" className="text-xs text-zinc-500">
            This creates your unique public link where customers can submit
            testimonials.
          </p>
        )}

        {/* Live public URL preview */}
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <ExternalLink
            className="size-3.5 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
          <p className="truncate text-xs text-zinc-400">
            <span className="text-zinc-500">Public collection:&nbsp;</span>
            <span className="font-mono text-zinc-200">
              {previewHref}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-zinc-200">
          About Your Brand{" "}
          <span className="font-normal text-zinc-500">(Optional)</span>
        </Label>
        <Input
          id="description"
          name="description"
          maxLength={2000}
          placeholder="What this workspace is for"
          aria-invalid={descriptionInvalid || undefined}
          aria-describedby="description-help"
          className="h-10 border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
        <p id="description-help" className="text-xs text-zinc-500">
          Briefly describe your brand or product. Customers may see this on
          your collection page.
        </p>
      </div>

      {serverError && !serverErrorField ? (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 sm:w-auto"
        >
          Cancel
        </Link>
        {/* useFormStatus must be read inside a component that's a
            descendant of the <form>. We render this small submit
            button child purely so its loading state is sourced from
            React 19's authoritative pending flag instead of from our
            own state, which was previously desyncing from the real
            server call. */}
        <SubmitButton
          slugInvalid={slugTouched && Boolean(slugLiveError)}
        />
      </div>
    </form>
  );
}

function SubmitButton({ slugInvalid }: { slugInvalid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || slugInvalid}
      aria-busy={pending || undefined}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 disabled:from-violet-500/50 disabled:to-purple-600/50 disabled:shadow-none sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2
            className="size-4 animate-spin"
            aria-hidden="true"
          />
          Creating…
        </>
      ) : (
        "Create Brand Space"
      )}
    </Button>
  );
}