"use client";

// Copy-to-clipboard button for the public Wall of Love URL.
// Same clipboard logic as the dashboard copy-link, styled to match
// the wall's dark-purple surface (Link/Check toggle).

import { useState } from "react";
import { copyText } from "@/lib/browser/clipboard";
import { Check, Copy } from "lucide-react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    // copyText swallows clipboard errors and returns false on failure, so a
    // blocked/denied copy leaves the button untouched.
    if (await copyText(url)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Copied" : "Copy link"}
      aria-live="polite"
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span>{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}