"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateWorkspaceAction,
  deleteWorkspaceAction,
} from "@/app/dashboard/workspaces/actions";

type Props = {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    themeColor: string | null;
  };
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

export function WorkspaceSettingsForm({ workspace }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The theme color input is controlled so we can render a live swatch
  // next to the field. The server still receives the raw hex string via
  // the form submission; we keep the value in sync.
  const initialColor = workspace.themeColor ?? "";
  const [themeColor, setThemeColor] = useState(initialColor);
  const isValidHex = useMemo(
    () => themeColor === "" || HEX_COLOR_REGEX.test(themeColor),
    [themeColor],
  );

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateWorkspaceAction(formData);
      if (result.ok) {
        setSavedAt(Date.now());
        // Refresh the server-rendered header card so the workspace
        // name stays in sync after edits.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onDelete(formData: FormData) {
    startTransition(async () => {
      const result = await deleteWorkspaceAction(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      {/* Save form */}
      <form action={onSubmit} className="space-y-5" noValidate>
        <input type="hidden" name="id" value={workspace.id} />

        <Field
          id="name"
          label="Name"
          help="A friendly display name for your brand or product."
        >
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={workspace.name}
            placeholder="Acme Inc."
            className="h-10 border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
          />
        </Field>

        <Field
          id="description"
          label={
            <>
              Description <span className="font-normal text-zinc-500">(optional)</span>
            </>
          }
          help="Shown on your public collection page. Up to 2000 characters."
        >
          <Input
            id="description"
            name="description"
            maxLength={2000}
            defaultValue={workspace.description ?? ""}
            placeholder="What this workspace is for"
            className="h-10 border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="logoUrl"
            label={
              <>
                Logo URL <span className="font-normal text-zinc-500">(optional)</span>
              </>
            }
            help="Square PNG/SVG works best. Hosted on your CDN."
          >
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              defaultValue={workspace.logoUrl ?? ""}
              className="h-10 border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
            />
          </Field>

          <Field
            id="themeColor"
            label={
              <>
                Theme color <span className="font-normal text-zinc-500">(optional)</span>
              </>
            }
            help="6-digit hex like #4f46e5. Tints your collection & wall."
            error={
              !isValidHex
                ? "Use a 6-digit hex like #ff00aa."
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5"
                style={{
                  backgroundColor: isValidHex && themeColor
                    ? themeColor
                    : "transparent",
                }}
              >
                {!isValidHex || !themeColor ? (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Hex
                  </span>
                ) : null}
              </div>
              <Input
                id="themeColor"
                name="themeColor"
                pattern="#[0-9a-fA-F]{6}"
                placeholder="#4f46e5"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                aria-invalid={!isValidHex || undefined}
                className="h-10 flex-1 border-white/10 bg-white/5 px-3 font-mono text-base text-white placeholder:text-zinc-500 focus-visible:border-violet-400/60 focus-visible:ring-violet-400/30 md:text-sm"
              />
            </div>
          </Field>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        {savedAt && !pending ? (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            Changes saved.
          </p>
        ) : null}

        <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="submit"
            disabled={pending || !isValidHex}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12121a] disabled:from-violet-500/50 disabled:to-purple-600/50 disabled:shadow-none sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone — visually separated card, same dark theme. */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent"
        />
        <div className="relative space-y-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10"
            >
              <AlertTriangle className="size-4 text-red-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-200">
                Danger zone
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Deleting this workspace permanently removes all of its
                testimonials, tags, and page views. This cannot be undone.
              </p>
            </div>
          </div>

          {confirmingDelete ? (
            <form
              action={onDelete}
              className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="id" value={workspace.id} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="text-zinc-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={pending}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-4 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25 focus-visible:ring-2 focus-visible:ring-red-400/50 sm:w-auto"
              >
                {pending ? (
                  <>
                    <Loader2
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Yes, delete this workspace
                  </>
                )}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border-red-500/40 bg-transparent px-4 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Delete workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-zinc-200">
        {label}
      </Label>
      {children}
      {error ? (
        <p
          role="alert"
          className="text-xs font-medium text-red-400"
        >
          {error}
        </p>
      ) : help ? (
        <p className="text-xs text-zinc-500">{help}</p>
      ) : null}
    </div>
  );
}
