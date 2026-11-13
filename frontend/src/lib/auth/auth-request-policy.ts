// Allow the BFF time to return its safe error contract and cookie cleanup before
// the browser gives up. The upstream signal also bounds a trickling response.
export const AUTH_BROWSER_REQUEST_TIMEOUT_MS = 20_000;
const AUTH_UPSTREAM_REQUEST_TIMEOUT_MS = 15_000;

export function authUpstreamRequestConfig(request?: Pick<Request, 'signal'>) {
  const deadline = AbortSignal.timeout(AUTH_UPSTREAM_REQUEST_TIMEOUT_MS);
  return {
    timeout: AUTH_UPSTREAM_REQUEST_TIMEOUT_MS,
    signal: request ? AbortSignal.any([request.signal, deadline]) : deadline,
  };
}
