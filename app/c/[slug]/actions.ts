"use server";

// Server action for the public collection form. Wraps submitTestimonial
// with request-context extraction (IP, headers) and a generic failure
// shape that is safe to return to the client. We never surface the
// specific SubmissionRejectedError.code to the user — only the public
// message.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getClientIp } from "@/lib/http/client-ip";
import {
  submitTestimonial,
  SUBMISSION_PUBLIC_ERROR,
  SubmissionRejectedError,
} from "@/lib/testimonials/service";
import { getEnv } from "@/lib/env";

export type SubmitResult = { ok: false; message: string };

export async function submitTestimonialAction(
  slug: string,
  formData: FormData,
): Promise<SubmitResult> {
  // APP_BASE_URL origin/Referer check uses NEXT_PUBLIC_APP_URL, which is
  // inlined at build time. Validate it is configured in production.
  const { NEXT_PUBLIC_APP_URL } = getEnv();
  if (!NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === "production") {
    return { ok: false, message: SUBMISSION_PUBLIC_ERROR };
  }

  const h = await headers();
  const socketIp = h.get("x-real-ip") ?? "";
  const ip = getClientIp(h, socketIp);

  try {
    const result = await submitTestimonial({ formData, headers: h, ip });
    if (result.workspaceSlug !== slug) {
      // Token was minted for a different workspace than the URL claims.
      // Treat as token_invalid; never echo the mismatch.
      return { ok: false, message: SUBMISSION_PUBLIC_ERROR };
    }
  } catch (err) {
    if (err instanceof SubmissionRejectedError) {
      // Logged on the server; client only sees the public message.
      console.warn("[submitTestimonial] rejected", { code: err.code, slug });
      return { ok: false, message: SUBMISSION_PUBLIC_ERROR };
    }
    console.error("[submitTestimonial] unexpected error", err);
    return { ok: false, message: SUBMISSION_PUBLIC_ERROR };
  }

  // redirect() throws internally; this is the success path.
  redirect(`/c/${slug}/thanks`);
}
