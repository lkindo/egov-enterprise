export const INSECURE_LOOPBACK_ENVIRONMENTS = ['development', 'test'] as const;
export const INSECURE_LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'] as const;
export const INSECURE_LOOPBACK_CLIENT_ADDRESSES = [
  '127.0.0.1',
  '::1',
  '[::1]',
  '::ffff:127.0.0.1',
] as const;

const LOOPBACK_CLIENT_ADDRESSES = new Set<string>(INSECURE_LOOPBACK_CLIENT_ADDRESSES);
const LOOPBACK_AUTHORITY_PATTERN = new RegExp(
  `^(${INSECURE_LOOPBACK_HOSTNAMES
    .map((hostname) => hostname.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('|')})(?::([0-9]{1,5}))?$`,
  'iu',
);

type SessionCookieRequest = {
  nextUrl: Pick<URL, 'protocol' | 'hostname'>;
  headers: Pick<Headers, 'get'>;
};

function isExactLoopbackAuthority(value: string | null): boolean {
  if (value === null || value.includes(',')) return false;

  const match = LOOPBACK_AUTHORITY_PATTERN.exec(value.trim());
  if (!match) return false;

  const port = match[2];
  return port === undefined || (Number(port) >= 1 && Number(port) <= 65_535);
}

function isExactLoopbackHostname(value: string): boolean {
  const normalized = value.toLowerCase();
  return INSECURE_LOOPBACK_HOSTNAMES.some((hostname) => hostname === normalized);
}

function isExactLoopbackClient(value: string | null): boolean {
  if (value === null || value.includes(',')) return false;
  return LOOPBACK_CLIENT_ADDRESSES.has(value.trim().toLowerCase());
}

/**
 * Frontend session cookies fail closed to Secure. The sole exception requires
 * an explicit local opt-in plus concordant URL, Host and Next forwarding
 * evidence for one exact HTTP loopback request.
 */
export function shouldUseSecureSessionCookie(
  request: SessionCookieRequest,
  nodeEnv: string | undefined,
  allowInsecureLoopback: boolean,
): boolean {
  const isAllowedEnvironment = INSECURE_LOOPBACK_ENVIRONMENTS.some(
    (environment) => environment === nodeEnv,
  );
  const forwardedProtocol = request.headers.get('x-forwarded-proto');

  const isLocalHttpException = allowInsecureLoopback
    && isAllowedEnvironment
    && request.nextUrl.protocol === 'http:'
    && isExactLoopbackHostname(request.nextUrl.hostname)
    && isExactLoopbackAuthority(request.headers.get('host'))
    && isExactLoopbackAuthority(request.headers.get('x-forwarded-host'))
    && forwardedProtocol?.trim().toLowerCase() === 'http'
    && !forwardedProtocol.includes(',')
    && isExactLoopbackClient(request.headers.get('x-forwarded-for'))
    && request.headers.get('forwarded') === null;

  return !isLocalHttpException;
}
