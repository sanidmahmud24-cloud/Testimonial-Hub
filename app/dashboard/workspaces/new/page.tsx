import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewWorkspaceForm } from "./form";

export const metadata = {
  title: "Create workspace",
};

export default function NewWorkspacePage() {
  return (
    // Local dark scope so the rest of the dashboard stays in its default
    // light theme, but the create-workspace flow matches the marketing
    // homepage's dark/purple visual language.
    <div className="dark -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0a0a0f] text-white">
        {/* Background gradient orbs — same palette as the homepage Hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute top-40 left-0 h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to workspaces
          </Link>

          <header className="space-y-3 text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Workspace
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Set Up Your Brand
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Add your brand or product details to start collecting customer
              testimonials in one place.
            </p>
          </header>

          {/* Glowing card frame around the form */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 blur-2xl"
            />
            <div className="relative rounded-2xl border border-white/10 bg-[#12121a]/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <NewWorkspaceForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
