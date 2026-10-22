"use client";

// Shared form primitives for the auth pages. The email and password
// fields render a leading icon, proper spacing/labels, focus rings,
// and (for passwords) a visibility toggle. Both inputs use the
// `aria-invalid` plumbing so validation errors are announced
// correctly by assistive tech.

import * as React from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export function EmailField({
  label,
  id,
  className,
  ...props
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-200">
        {label}
      </Label>
      <div className="group relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 transition-colors group-focus-within:text-violet-300"
        >
          <MailIcon />
        </span>
        <Input
          id={id}
          type="email"
          autoComplete="email"
          className={cn(
            "h-11 rounded-lg border-white/10 bg-white/5 pl-10 pr-3 text-base text-white placeholder:text-zinc-500",
            "focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30",
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}

export function PasswordField({
  label,
  id,
  className,
  ...props
}: FieldProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-200">
        {label}
      </Label>
      <div className="group relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 transition-colors group-focus-within:text-violet-300"
        >
          <LockIcon />
        </span>
        <Input
          id={id}
          type={visible ? "text" : "password"}
          className={cn(
            "h-11 rounded-lg border-white/10 bg-white/5 pl-10 pr-11 text-base text-white placeholder:text-zinc-500",
            "focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 my-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

export function TextField({
  label,
  id,
  className,
  ...props
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-zinc-200">
        {label}
      </Label>
      <div className="group relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 transition-colors group-focus-within:text-violet-300"
        >
          <UserIcon />
        </span>
        <Input
          id={id}
          autoComplete="name"
          className={cn(
            "h-11 rounded-lg border-white/10 bg-white/5 pl-10 pr-3 text-base text-white placeholder:text-zinc-500",
            "focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30",
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}

export function ErrorBanner({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function PrimarySubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-lg transition-all",
        "bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/25",
        "hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
    >
      {pending ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4 animate-spin"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="3"
          />
          <path
            d="M22 12a10 10 0 0 1-10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.69 19.69 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.73 19.73 0 0 1-3.17 4.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}