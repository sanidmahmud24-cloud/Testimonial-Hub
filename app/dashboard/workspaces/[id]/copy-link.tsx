"use client";

// Copy-to-clipboard button for the public /c/<slug> collection URL.
// Uses the modern Clipboard API; falls back to a no-op message if
// the browser blocks it (e.g. insecure context, missing permission).

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      aria-label={copied ? "Copied" : "Copy share link"}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border-white/10 bg-white/5 px-3 text-sm font-medium text-white shadow-lg shadow-violet-500/10 transition-all hover:border-violet-400/40 hover:bg-gradient-to-r hover:from-violet-500/20 hover:to-purple-600/20 hover:shadow-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12121a]"
    >
      {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
      <span>{copied ? "Copied" : "Copy link"}</span>
    </Button>
  );
}
