"use client";

// Client-side sign-up form. Preserves the existing validation flow:
// schema check in `signUpAction` (zod for email/name/password), DB
// createUser, and auto credentials-sign-in → /dashboard redirect.
// Only the visual styling and small UX touches (password toggle,
// pending state, descriptive error banner) are new.

import { useState, useTransition } from "react";
import {
  EmailField,
  PasswordField,
  TextField,
  PrimarySubmitButton,
  ErrorBanner,
} from "@/components/auth/auth-fields";
import { signUpAction } from "@/lib/auth/actions";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4"
      noValidate
      aria-describedby={error ? "sign-up-error" : undefined}
    >
      {error ? (
        <ErrorBanner id="sign-up-error">{error}</ErrorBanner>
      ) : null}
      <TextField id="name" label="Name" name="name" required />
      <EmailField id="email" label="Email" name="email" required />
      <PasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <p className="text-xs text-zinc-500">
        At least 8 characters. We hash your password with bcrypt before
        storing it; plaintext never touches the database.
      </p>
      <div className="pt-2">
        <PrimarySubmitButton pending={pending}>
          {pending ? "Creating account…" : "Create account"}
        </PrimarySubmitButton>
      </div>
      <p className="pt-2 text-center text-[11px] text-zinc-500">
        By creating an account you agree to our{" "}
        <span className="text-zinc-400">Terms of Service</span> and{" "}
        <span className="text-zinc-400">Privacy Policy</span>.
      </p>
    </form>
  );
}