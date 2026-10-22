// Server-only. Extracts the submitter's IP for hashing into
// SubmissionToken.ipHash. Never trusts client-supplied forwarding headers
// unless TRUSTED_PROXY=true. See SRS Appendix C.2.
//
// Inputs are explicit (Headers + socketIp) so the function is pure and
// unit-testable without an actual request.

import "server-only";
import { isIP } from "node:net";
import { getEnv } from "@/lib/env";

/**
 * Returns the best-effort client IP. With TRUSTED_PROXY=false, only the
 * socket IP is used. With TRUSTED_PROXY=true, the leftmost entry of
 * X-Forwarded-For is parsed and validated with `net.isIP`; on parse
 * failure the socket IP is used as a fallback.
 *
 * Never reads X-Real-IP, Client-IP, or the Forwarded header.
 */
export function getClientIp(headers: Headers, socketIp: string): string {
  if (!socketIp) return "";
  const { TRUSTED_PROXY } = getEnv();
  if (!TRUSTED_PROXY) return socketIp;

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return socketIp;

  const leftmost = forwarded.split(",")[0]?.trim();
  if (!leftmost) return socketIp;
  if (isIP(leftmost) === 0) return socketIp;
  return leftmost;
}
