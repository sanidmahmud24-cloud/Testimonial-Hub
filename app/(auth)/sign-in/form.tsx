"use client";

// Client-side sign-in form. Posts to the `signInAction` server action
// which preserves the Auth.js redirect, cookie set, and error-handling
// flow that the previous server-side <form action> used. The password
// visibility toggle and pending state are added here without touching
// auth, validation, or the database.

import { useState, useTransition } from "react";
import {
  EmailField,
  PasswordField,
  PrimarySubmitButton,
  ErrorBanner,
} from "@/components/auth/auth-fields";
import { signInAction } from "@/lib/auth/actions";

export function SignInForm({
  callback,
  initialError,
}: {
  callback: string;
  initialError: string | null;
}) {
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await signInAction(formData, callback);
      } catch (err) {
        // Auth.js signals a wrong-password / unknown-email by throwing —
        // either with NEXT_REDIRECT (which we can't catch here) or with
        // a CredentialsSignin-shaped redirect. The forwarded query-param
        // "?error=" is the existing contract; surface the same message.
        const message =
          err instanceof Error
            ? err.message
            : "Invalid email or password. Please try again.";
        setError(message);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4"
      noValidate
      aria-describedby={error ? "sign-in-error" : undefined}
    >
      {error ? (
        <ErrorBanner id="sign-in-error">{error}</ErrorBanner>
      ) : null}
      <EmailField id="email" label="Email" name="email" required />
      <PasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        required
      />
      <div className="pt-2">
        <PrimarySubmitButton pending={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </PrimarySubmitButton>
      </div>
    </form>
  );
}