// Server-only. Zod input schema for the public collection form.
// See SRS Appendix C.3 and D.3 (validation test cases).

import "server-only";
import { z } from "zod";

export class InvalidTestimonialError extends Error {
  readonly issues: z.ZodIssue[];
  constructor(issues: z.ZodIssue[]) {
    super(issues[0]?.message ?? "Invalid input.");
    this.name = "InvalidTestimonialError";
    this.issues = issues;
  }
}

export const MIN_SUBMISSION_TIME_MS = 1500;
export const MAX_SUBMISSION_TIME_MS = 24 * 60 * 60 * 1000;

const submissionSchema = z.object({
  submitterName: z.string().min(1, "Name is required.").max(120),
  content: z
    .string()
    .min(1, "Testimonial content is required.")
    .max(5000, "Testimonial content must be at most 5000 characters."),
  role: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  email: z.email().max(254).optional().or(z.literal("").transform(() => undefined)),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be at least 1.")
    .max(5, "Rating must be at most 5.")
    .optional(),
  consentGiven: z.literal(true, {
    message: "You must consent to public display.",
  }),
  // Honeypot: must be empty. Server-only consumers treat any non-empty
  // value as a bot signal.
  website: z
    .string()
    .max(0, "Submission rejected; please try again.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Server-rendered timestamp of form mount. Used to enforce a minimum
  // submission time. Not echoed back; used only for timing validation.
  renderedAt: z.coerce
    .number()
    .int()
    .positive()
    .max(Date.now() + 60_000, "Form is invalid. Please reload."),
  // The plaintext submission token issued at form render.
  token: z.string().min(1, "Missing form token. Please reload."),
});

export type SubmissionInput = z.input<typeof submissionSchema>;
export type SubmissionParsed = z.output<typeof submissionSchema>;

/**
 * Validate a FormData payload from the collection form. Throws
 * InvalidTestimonialError with a list of Zod issues on failure.
 */
export function parseSubmissionFormData(formData: FormData): SubmissionParsed {
  const raw: Record<string, FormDataEntryValue | boolean | undefined> = {
    submitterName: formData.get("submitterName") ?? undefined,
    content: formData.get("content") ?? undefined,
    role: formData.get("role") ?? undefined,
    company: formData.get("company") ?? undefined,
    email: formData.get("email") ?? undefined,
    rating: formData.get("rating") ?? undefined,
    consentGiven: formData.get("consentGiven") ?? undefined,
    website: formData.get("website") ?? undefined,
    renderedAt: formData.get("renderedAt") ?? undefined,
    token: formData.get("token") ?? undefined,
  };

  // consentGiven is submitted as a checkbox; HTML only sends the value
  // when the box is checked. Map "on"/"true" to a real boolean.
  if (raw.consentGiven === "on" || raw.consentGiven === "true") {
    raw.consentGiven = true;
  }

  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidTestimonialError(parsed.error.issues);
  return parsed.data;
}
