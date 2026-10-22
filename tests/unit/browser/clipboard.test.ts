import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { copyText } from "@/lib/browser/clipboard";

// This suite drives copyText() directly with the browser APIs mocked. It
// deliberately does NOT use renderToStaticMarkup: a static render executes
// zero browser code, so it cannot prove anything about clipboard behaviour.
//
// The environment is happy-dom (see vitest.config.ts), which supplies a real
// `document`/`document.body`/`createElement`, but leaves `navigator.clipboard`
// and `document.execCommand` unimplemented. We stub those two.

type ClipboardStub = { writeText: ReturnType<typeof vi.fn> };
let clipboard: ClipboardStub;
let execCommand: ReturnType<typeof vi.fn>;
let hadNativeClipboard: boolean;
let hadNativeExecCommand: boolean;

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  execCommand = vi.fn().mockReturnValue(true);
  hadNativeClipboard = "clipboard" in navigator;
  hadNativeExecCommand = typeof document.execCommand === "function";
  setClipboard(clipboard);
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  document.body.innerHTML = "";
});

afterEach(() => {
  // Restore whatever happy-dom originally exposed.
  if (hadNativeClipboard) {
    setClipboard((navigator as { clipboard?: unknown }).clipboard);
  } else {
    delete (navigator as { clipboard?: unknown }).clipboard;
  }
  if (!hadNativeExecCommand) {
    delete (document as { execCommand?: unknown }).execCommand;
  }
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("browser/clipboard - modern Clipboard API", () => {
  it("writes the text via navigator.clipboard and reports success", async () => {
    const ok = await copyText("https://example.test/c/acme");
    expect(ok).toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).toHaveBeenCalledWith("https://example.test/c/acme");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("does not touch the DOM when the Clipboard API succeeds", async () => {
    await copyText("x");
    expect(document.body.querySelectorAll("textarea")).toHaveLength(0);
  });

  it("returns false (never throws) when writeText rejects", async () => {
    clipboard.writeText.mockRejectedValue(new Error("denied"));
    await expect(copyText("x")).resolves.toBe(false);
  });
});

describe("browser/clipboard - execCommand fallback", () => {
  beforeEach(() => {
    // No modern API available.
    setClipboard(undefined);
  });

  it("uses a hidden textarea and execCommand when clipboard is missing", async () => {
    const ok = await copyText("fallback-url");
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("sets the textarea value and fixed/opacity styles, then removes it", async () => {
    let captured: HTMLTextAreaElement | null = null;
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string, opts?: ElementCreationOptions) => {
      const el = originalCreate(tag, opts);
      if (tag === "textarea") {
        captured = el as HTMLTextAreaElement;
      }
      return el;
    });

    await copyText("styled-url");

    expect(captured).not.toBeNull();
    const ta = captured as unknown as HTMLTextAreaElement;
    expect(ta.value).toBe("styled-url");
    expect(ta.style.position).toBe("fixed");
    expect(ta.style.opacity).toBe("0");
    // Cleanup: the scratch node must not remain in the document.
    expect(document.body.contains(ta)).toBe(false);
  });

  it("returns false when execCommand is unavailable", async () => {
    delete (document as { execCommand?: unknown }).execCommand;
    const ok = await copyText("x");
    expect(ok).toBe(false);
  });

  it("returns false when execCommand reports failure", async () => {
    execCommand.mockReturnValue(false);
    const ok = await copyText("x");
    expect(ok).toBe(false);
  });

  it("cleans up the textarea even when execCommand throws", async () => {
    execCommand.mockImplementation(() => {
      throw new Error("boom");
    });
    const ok = await copyText("x");
    expect(ok).toBe(false);
    // The temporary textarea should not be left behind.
    expect(document.body.querySelectorAll("textarea")).toHaveLength(0);
  });
});

describe("browser/clipboard - server safety", () => {
  it("returns false instead of throwing when document is unavailable", async () => {
    const originalDoc = globalThis.document;
    // @ts-expect-error simulate a non-DOM (server) environment for this call.
    delete globalThis.document;
    try {
      setClipboard(undefined);
      await expect(copyText("x")).resolves.toBe(false);
    } finally {
      globalThis.document = originalDoc;
    }
  });
});