import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./form";

type SearchParams = Promise<{ error?: string; callbackUrl?: string }>;

// The `searchParams` read is URL data, so it cannot be part of the
// prerendered static shell. It is pushed into a <Suspense> boundary
// below instead of being awaited at the page's top level, which is what
// previously blocked this route from prerendering. The friendly error
// mapping and callback handling are unchanged.
export default function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<AuthShellFallback />}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, callbackUrl } = await searchParams;
  const callback = callbackUrl || "/dashboard";

  // Auth.js convention: query-param `?error=CredentialsSignin` is set
  // after a failed credentials sign-in. Show a friendly message; never
  // surface the technical error code to the user.
  const initialError =
    error === "CredentialsSignin"
      ? "Invalid email or password. Please try again."
      : error
        ? "We couldn't sign you in. Please try again."
        : null;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your workspaces, review submissions, and publish your Wall of Love."
      footerLink={{
        prompt: "Don't have an account?",
        href: "/sign-up",
        label: "Create one",
      }}
    >
      <SignInForm callback={callback} initialError={initialError} />
    </AuthShell>
  );
}

/**
 * Static shell stand-in. Renders the same AuthShell chrome with a
 * neutral placeholder so the page paints immediately and swaps in the
 * real form (with its error message and callback) at request time.
 */
function AuthShellFallback() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your workspaces, review submissions, and publish your Wall of Love."
      footerLink={{
        prompt: "Don't have an account?",
        href: "/sign-up",
        label: "Create one",
      }}
    >
      <div
        aria-hidden="true"
        className="space-y-4"
      >
        <div className="h-11 w-full animate-pulse rounded-lg bg-white/5" />
        <div className="h-11 w-full animate-pulse rounded-lg bg-white/5" />
        <div className="h-11 w-full animate-pulse rounded-lg bg-white/10" />
      </div>
    </AuthShell>
  );
}