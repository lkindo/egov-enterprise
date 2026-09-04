/**
 * Backend/DB menu metadata is data, not a trusted navigation destination.
 *
 * This module is the single fail-closed boundary for values consumed by Next
 * Link/router sinks. It intentionally accepts only:
 * - an application-absolute path beginning with exactly one `/`; or
 * - a relative legacy eGov endpoint whose path ends in `.do`.
 *
 * Query strings and fragments remain intact, but URL-parser ambiguities that can
 * change the navigation authority (scheme/protocol-relative/backslash/control,
 * encoded separators and dot segments) are rejected before parsing.
 */

const INTERNAL_ROUTE_BASE = 'https://egov.invalid';
const RAW_CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const MALFORMED_PERCENT_ESCAPE = /%(?![0-9a-f]{2})/i;
const ENCODED_CONTROL_CHARACTER = /%(?:25)*(?:0[0-9a-f]|1[0-9a-f]|7f)/i;
const ENCODED_PATH_SEPARATOR_OR_DOT = /%(?:25)*(?:2e|2f|5c)/i;
const LEGACY_DOT_DO_PATH = /^(?:[a-z0-9._~-]+\/)*[a-z0-9._~-]+\.do$/i;

export interface MenuRouteSource {
  modernRoute?: string | null;
  chkURL?: string | null;
}

function hasDotSegment(pathname: string): boolean {
  return pathname.split('/').some(segment => segment === '.' || segment === '..');
}

export function normalizeInternalRoute(rawRoute?: string | null): string | null {
  if (!rawRoute || rawRoute === '#' || rawRoute.toLowerCase() === 'dir') return null;

  // URL() trims leading/trailing ASCII whitespace and treats backslashes as
  // separators. Reject both before the parser can reinterpret the authority.
  if (
    rawRoute !== rawRoute.trim()
    || RAW_CONTROL_CHARACTER.test(rawRoute)
    || rawRoute.includes('\\')
    || MALFORMED_PERCENT_ESCAPE.test(rawRoute)
    || ENCODED_CONTROL_CHARACTER.test(rawRoute)
  ) {
    return null;
  }

  const pathEnd = rawRoute.search(/[?#]/);
  const rawPath = pathEnd === -1 ? rawRoute : rawRoute.slice(0, pathEnd);

  if (
    !rawPath
    || rawPath.includes('//')
    || ENCODED_PATH_SEPARATOR_OR_DOT.test(rawPath)
    || hasDotSegment(rawPath)
  ) {
    return null;
  }

  let candidate: string;
  if (rawPath.startsWith('/')) {
    candidate = rawRoute;
  } else if (LEGACY_DOT_DO_PATH.test(rawPath)) {
    candidate = `/${rawRoute}`;
  } else {
    return null;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ROUTE_BASE);
    if (parsed.origin !== INTERNAL_ROUTE_BASE || parsed.username || parsed.password) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/**
 * Preserve the existing `modernRoute || chkURL` precedence as one auditable
 * decision. An invalid, non-empty modernRoute must not silently fall through to
 * a different legacy destination.
 *
 * [2026-09-04 · PD-UX-002 Q3] The `chkURL` fallback is now restricted to legacy
 * `.do` endpoints — the only shape it was ever designed for.
 *
 * `chkURL` is not a screen route. It is `tb_prgrm_lst.url` under an alias
 * (`MenuRepositoryImpl` selects `program.url.as("chkURL")`), and that column holds
 * **authorization path patterns**, not navigation destinations.
 *
 * Production (OCI) measurement, 2026-09-04, read-only: of 18 rows, **0 are legacy
 * `.do` endpoints**, 16 are API paths and 11 carry wildcards or templates
 * (`/api/v1/admin/**`, `/actuator/**`, `/api/v1/admin/system/users/{userId}`).
 * So the shape this fallback was designed for no longer exists in the data — what
 * remained was only a way for authorization patterns to leak into user URLs.
 *
 * Those pass `normalizeInternalRoute` — it only rejects foreign origins and path
 * ambiguity, and an absolute API path is neither. So a menu with an empty
 * `modernRoute` and a linked program would have navigated the user to an API
 * pattern (verified: the resolver returned `/api/v1/admin/**` verbatim).
 *
 * That path is not currently reachable — in production all 14 menus with a null
 * `modern_route` carry the `dir` placeholder, which this module rejects outright,
 * and none of them joins to a program URL (measured: 0) — so this is a latent
 * hazard rather than a live defect. Narrowing it costs nothing: no test asserts an
 * absolute-path `chkURL` is used as a destination, and the legacy `.do` behaviour
 * the tests do pin is preserved.
 */
export function resolveMenuInternalRoute(source: MenuRouteSource): string | null {
  if (source.modernRoute) return normalizeInternalRoute(source.modernRoute);
  if (!source.chkURL) return null;

  const pathEnd = source.chkURL.search(/[?#]/);
  const rawPath = pathEnd === -1 ? source.chkURL : source.chkURL.slice(0, pathEnd);
  // Accept both `legacy/menu.do` and `/legacy/menu.do`; reject anything that is
  // not a legacy endpoint — API patterns and wildcards land here.
  if (!LEGACY_DOT_DO_PATH.test(rawPath.replace(/^\//, ''))) return null;

  return normalizeInternalRoute(source.chkURL);
}
