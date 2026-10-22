import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./form";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your TestimonialHub account in under a minute. You'll be able to create your first workspace right after."
      footerLink={{
        prompt: "Already have an account?",
        href: "/sign-in",
        label: "Sign in",
      }}
    >
      <SignUpForm />
    </AuthShell>
  );
}