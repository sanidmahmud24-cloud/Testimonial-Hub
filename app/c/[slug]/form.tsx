"use client";

// Public testimonial submission form. Server-rendered with a fresh
// per-render submission token; the token is held in a hidden input and
// consumed atomically on submit. Client-side state is intentionally
// minimal: we do not surface bot-defence signals (honeypot, timing,
// rate limit) — those are server-only and only ever emit the generic
// SUBMISSION_PUBLIC_ERROR.

import { useId, useRef, useState, useTransition } from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitTestimonialAction } from "./actions";

type Props = {
  slug: string;
  tokenPlaintext: string;
  tokenExpiresAt: string; // ISO
};

export function CollectionForm({
  slug,
  tokenPlaintext,
  tokenExpiresAt,
}: Props) {
  const formId = useId();
  // Capture the form-mount timestamp on the client at first render.
  // The server does not know this; it only revalidates elapsed time
  // against the server clock. A useState initializer is the only
  // place we're permitted to call a non-deterministic function under
  // react-hooks/purity.
  const [renderedAt] = useState<number>(() => Date.now());
  const expiresAtMs = parseExpires(tokenExpiresAt);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    if (pending || success) return; // Double-submit guard.
    setError(null);
    startTransition(async () => {
      const result = await submitTestimonialAction(slug, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Action redirects to /c/<slug>/thanks on success; if we get here
      // it means redirect was caught at the server boundary (e.g. on a
      // client transition). Mark success so the button reflects the state.
      setSuccess(true);
    });
  }

  return (
    <form
      ref={formRef}
      id={formId}
      action={handleSubmit}
      noValidate
      className="space-y-6"
      aria-label="Testimonial submission form"
    >
      {/* Hidden fields: server-issued token + form-mount timestamp.
          Not visually generated; do not remove. */}
      <input type="hidden" name="token" value={tokenPlaintext} readOnly />
      <input
        type="hidden"
        name="renderedAt"
        value={String(renderedAt)}
        readOnly
      />

      {/* Honeypot: visually hidden, semantically present. Bots that fill
          every field will populate this; humans never see it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[10000px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${formId}-website`}>Website</label>
        <input
          id={`${formId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Field
        id={`${formId}-name`}
        label="Your name"
        required
        help="Shown publicly on the wall."
      >
        <Input
          id={`${formId}-name`}
          name="submitterName"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Jane Doe"
          disabled={pending || success}
          className="h-11 border-white/10 bg-white/5 px-3.5 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
      </Field>

      <Field
        id={`${formId}-content`}
        label="Your testimonial"
        required
        help="Up to 5000 characters."
      >
        <Textarea
          id={`${formId}-content`}
          name="content"
          required
          maxLength={5000}
          rows={5}
          placeholder="Share your experience…"
          disabled={pending || success}
          className="border-white/10 bg-white/5 px-3.5 py-2.5 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-role`}
          label="Role"
          help="Optional. e.g. 'Engineer'"
        >
          <Input
            id={`${formId}-role`}
            name="role"
            maxLength={120}
            autoComplete="organization-title"
            placeholder="Engineer"
            disabled={pending || success}
            className="h-11 border-white/10 bg-white/5 px-3.5 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
          />
        </Field>
        <Field
          id={`${formId}-company`}
          label="Company"
          help="Optional. e.g. 'Acme Inc.'"
        >
          <Input
            id={`${formId}-company`}
            name="company"
            maxLength={120}
            autoComplete="organization"
            placeholder="Acme Inc."
            disabled={pending || success}
            className="h-11 border-white/10 bg-white/5 px-3.5 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
          />
        </Field>
      </div>

      <Field
        id={`${formId}-email`}
        label="Email"
        help="Optional. Kept private. Used only to follow up if needed."
      >
        <Input
          id={`${formId}-email`}
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          disabled={pending || success}
          className="h-11 border-white/10 bg-white/5 px-3.5 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
        />
      </Field>

      <Field id={`${formId}-rating-group`} label="Rating">
        <p className="text-xs text-zinc-500">Optional. 1 to 5 stars.</p>
        <StarRating
          name="rating"
          idPrefix={`${formId}-rating`}
          disabled={pending || success}
        />
      </Field>

      {/* Consent — visually distinct card with violet accent border. */}
      <ConsentField
        id={`${formId}-consent`}
        name="consentGiven"
        disabled={pending || success}
      />

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p>Submitted. Redirecting to the thank-you page…</p>
        </div>
      ) : null}

      {/* Submit row. The button is the last interactive element inside
          the form card so the user always sees it at the end of the flow. */}
      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Lock className="size-3" aria-hidden="true" />
          Form expires at {formatExpiresAt(expiresAtMs)}
        </p>
        <Button
          type="submit"
          disabled={pending || success}
          aria-disabled={pending || success}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12121a] disabled:from-violet-500/50 disabled:to-purple-600/50 disabled:shadow-none sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Submitting…
            </>
          ) : success ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              Submitted
            </>
          ) : (
            "Submit testimonial"
          )}
        </Button>
      </div>
    </form>
  );
}

/** Reusable labeled field with consistent dark styling and helper text. */
function Field({
  id,
  label,
  required,
  help,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium text-zinc-200"
      >
        <span>{label}</span>
        {required ? (
          <span className="text-violet-400" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {help ? (
        <p
          id={`${id}-help`}
          className="text-xs text-zinc-500"
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 1–5 star rating. Controlled so the chosen star lights up with the
 * amber accent. Fully keyboard-accessible: each star is a real radio
 * with arrow-key navigation, the visible label is a styled <label>.
 */
function StarRating({
  name,
  idPrefix,
  disabled,
}: {
  name: string;
  idPrefix: string;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [value, setValue] = useState<number | "">("");
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      aria-required="false"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((v) => {
        const id = `${idPrefix}-${v}`;
        const isActive = hover !== null ? v <= hover : v <= Number(value || 0);
        return (
          <div key={v} className="flex items-center">
            <input
              type="radio"
              id={id}
              name={name}
              value={v}
              checked={value === v}
              onChange={() => setValue(v)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(null)}
              onMouseEnter={() => !disabled && setHover(v)}
              onMouseLeave={() => setHover(null)}
              disabled={disabled}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={`cursor-pointer rounded-md p-1.5 text-xl leading-none transition-colors ${
                isActive
                  ? "text-amber-400"
                  : "text-zinc-600 hover:text-amber-300"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              aria-label={`${v} star${v === 1 ? "" : "s"}`}
            >
              <Star
                className="size-6"
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </label>
          </div>
        );
      })}
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          disabled={disabled}
          className="ml-2 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline disabled:opacity-50"
        >
          Clear
        </button>
      ) : (
        <span className="ml-2 text-xs text-zinc-500">Tap a star to rate</span>
      )}
    </div>
  );
}

/**
 * Consent field. Visually distinct: violet-bordered card with the
 * required consent text, so the user is never surprised that this is
 * gating submission. base-ui's Checkbox manages the visual state; the
 * real form field is a hidden <input> that the server reads.
 */
function ConsentField({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
      <div className="flex items-start gap-3">
        <CheckboxPrimitive.Root
          id={id}
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
          required
          disabled={disabled}
          className="peer relative mt-0.5 size-5 shrink-0 rounded-md border border-violet-400/40 bg-white/5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-400/60 data-[checked]:border-violet-400 data-[checked]:bg-gradient-to-br data-[checked]:from-violet-500 data-[checked]:to-purple-600 data-[checked]:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Check className="size-3.5" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <div className="space-y-1">
          <Label
            htmlFor={id}
            className="cursor-pointer text-sm font-medium leading-snug text-zinc-100"
          >
            I consent to public display{" "}
            <span className="text-violet-400" aria-hidden="true">
              *
            </span>
          </Label>
          <p className="text-xs leading-snug text-zinc-400">
            By submitting, you agree this testimonial may be reviewed and
            published on the workspace&apos;s public Wall of Love. Your
            email is never shown.
          </p>
        </div>
        {checked ? (
          <input type="hidden" name={name} value="on" />
        ) : null}
      </div>
    </div>
  );
}

function parseExpires(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function formatExpiresAt(ms: number): string {
  if (!Number.isFinite(ms)) return "soon";
  try {
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "soon";
  }
}
