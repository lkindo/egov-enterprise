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
 */
export function resolveMenuInternalRoute(source: MenuRouteSource): string | null {
  return normalizeInternalRoute(source.modernRoute || source.chkURL);
}
