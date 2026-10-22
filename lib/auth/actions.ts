"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUser } from "@/lib/auth/users";
import { signIn } from "@/auth";

const signUpSchema = z.object({
  email: z.email().max(254),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" | "name" | "password" };

export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input.",
      field:
        path === "email" || path === "name" || path === "password"
          ? path
          : undefined,
    };
  }
  try {
    await createUser(parsed.data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create account.";
    return { ok: false, error: message };
  }
  // Auto sign-in after sign-up. Redirect throws, so this line never returns.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  // Unreachable, but keeps TypeScript happy.
  redirect("/dashboard");
}

/**
 * Server action: handles the credentials sign-in form post from the
 * /sign-in page. Redirects to `callback` on success, or to /sign-in
 * with `?error=CredentialsSignin` on failure (Auth.js convention).
 *
 * Exported as a server action so the client `<SignInForm>` can call it
 * via useTransition without losing the Auth.js redirect / cookie flow.
 */
export async function signInAction(formData: FormData, callback: string) {
  await signIn("credentials", {
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: callback,
  });
}