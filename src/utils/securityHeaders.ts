/**
 * Security-header expectations used by tests/security/security.spec.ts.
 *
 * saucedemo is a third-party static site we do not control, so most hardening
 * headers are absent. We therefore split checks into two buckets:
 *  - `RECOMMENDED_HEADERS` — reported (annotated), never hard-failed, so the
 *    suite documents posture without breaking on a site we can't change.
 */
export const RECOMMENDED_HEADERS = [
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'content-security-policy',
  'referrer-policy',
] as const;

export type RecommendedHeader = (typeof RECOMMENDED_HEADERS)[number];

export interface HeaderAudit {
  header: RecommendedHeader;
  present: boolean;
  value: string | null;
}

/** Audit a set of response headers against the recommended list. */
export function auditSecurityHeaders(headers: Record<string, string>): HeaderAudit[] {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;

  return RECOMMENDED_HEADERS.map((header) => ({
    header,
    present: header in lower,
    value: lower[header] ?? null,
  }));
}
