import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AUTH_BFF_ROUTES, PATHS, evaluateEdgeTrustBoundary, loadRepositoryFiles } from './edge-trust-boundary-contract.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repository = loadRepositoryFiles(root);

function mutate(path, from, to) {
  const source = repository[path];
  assert.ok(source.includes(from), `fixture anchor missing in ${path}: ${from}`);
  return { ...repository, [path]: source.replace(from, to) };
}

test('the repository satisfies the client IP trust boundary (ADR-0019)', () => {
  assert.deepEqual(evaluateEdgeTrustBoundary(repository), []);
});

test('every way back to spoofable or collapsed client IPs is red', () => {
  const cases = [
    ['edge appends instead of overwriting', mutate(PATHS.edgeTemplate, 'X-Forwarded-For $remote_addr;', 'X-Forwarded-For $proxy_add_x_forwarded_for;'), /덮어쓰지 않습니다/],
    ['edge drops the original Host', mutate(PATHS.edgeTemplate, 'proxy_set_header Host $http_host;', 'proxy_set_header Host $proxy_host;'), /원래 Host/],
    ['edge image loses its digest', mutate(PATHS.composeProd, 'nginxinc/nginx-unprivileged@sha256:', 'nginxinc/nginx-unprivileged:stable-alpine#'), /digest/],
    ['envsubst filter removed', mutate(PATHS.composeProd, 'NGINX_ENVSUBST_FILTER: "^EDGE_"', 'NGINX_ENVSUBST_FILTER: ""'), /EDGE_\* 로 한정/],
    ['Next published again in production', mutate(PATHS.composeProd, 'ports: !reset []', 'ports: ["3000:3000"]'), /호스트 공개 포트/],
    ['switch left off in production', mutate(PATHS.composeProd, 'TRUSTED_EDGE_PROXY: "true"', 'TRUSTED_EDGE_PROXY: "false"'), /TRUSTED_EDGE_PROXY: "true" 가 없습니다/],
    ['switch turned on in the dev stack', { ...repository, [PATHS.composeBase]: `${repository[PATHS.composeBase]}\n# \nx-dev:\n  TRUSTED_EDGE_PROXY: "true"\n` }, /docker-compose\.yml 가 TRUSTED_EDGE_PROXY 를 켭니다/],
    ['server interceptor stops forwarding', mutate(PATHS.clientInterceptor, 'forwardedClientIpHeaders(await headers())', '({} as Record<string, string>)'), /서버 측 API 인터셉터/],
    ['login BFF stops forwarding', mutate(AUTH_BFF_ROUTES[0], '...forwardedClientIpHeaders(request.headers),', ''), /login\/route\.ts 가 백엔드 호출에/],
    ['a new raw backend call skips the helper', { ...repository, 'frontend/src/app/api/new/route.ts': "const url = process.env.BACKEND_API_URL;\nexport const x = () => axios.post(`${url}/x`, {});\n" }, /new\/route\.ts 가 백엔드를 axios 로 직접/],
  ];
  for (const [name, files, expected] of cases) {
    const errors = evaluateEdgeTrustBoundary(files);
    assert.ok(errors.some((error) => expected.test(error)), `${name} was not detected: ${JSON.stringify(errors)}`);
  }
});

test('every way the edge login limit drifts from the backend bucket or the screens is red (ADR-0059)', () => {
  const T = PATHS.edgeTemplate;
  const cases = [
    ['login key map removed', mutate(T, 'map $uri $edge_login_limit_key', 'map $uri $edge_removed_key'), /로그인 경로 판정/],
    ['other paths counted too', mutate(T, '    default                         "";', '    default                         $binary_remote_addr;'), /기본 키가 비어 있지 않습니다/],
    ['MFA BFF path dropped', mutate(T, '    ~*^/api/auth/(login|mfa/)       $binary_remote_addr;', '    ~*^/api/auth/(login)            $binary_remote_addr;'), /\/api\/auth\/\(login\|mfa\/\) 를 접속 주소로/],
    ['password path dropped', mutate(T, '    ~*^/api/v1/users/me/password    $binary_remote_addr;', ''), /\/api\/v1\/users\/me\/password 를 접속 주소로/],
    ['backend password path moved', mutate(PATHS.backendRateLimitFilter, 'PASSWORD_CHANGE_PATH = "/api/v1/users/me/password"', 'PASSWORD_CHANGE_PATH = "/api/v1/account/password"'), /비밀번호 변경 경로\(\/api\/v1\/account\/password\)/],
    ['rate hard-coded', mutate(T, 'rate=${EDGE_LOGIN_REQUESTS_PER_MINUTE}r/m', 'rate=30r/m'), /EDGE_LOGIN_REQUESTS_PER_MINUTE\(분당\)/],
    ['limit not applied to the proxy', mutate(T, '        limit_req zone=edge_login burst=${EDGE_LOGIN_REQUESTS_PER_MINUTE} nodelay;', ''), /limit_req zone=edge_login burst=한도 nodelay/],
    ['burst queues instead of rejecting', mutate(T, 'burst=${EDGE_LOGIN_REQUESTS_PER_MINUTE} nodelay;', 'burst=${EDGE_LOGIN_REQUESTS_PER_MINUTE};'), /limit_req zone=edge_login burst=한도 nodelay/],
    ['rejection becomes 503', mutate(T, 'limit_req_status 429;', 'limit_req_status 503;'), /거부 상태가 429 가 아닙니다/],
    ['rejection loses the contract body', mutate(T, 'error_page 429 = @edge_login_limited;', ''), /계약 본문\(@edge_login_limited\)/],
    ['named location returns another status', mutate(T, 'return 429 $edge_login_limited_body;', 'return 503 $edge_login_limited_body;'), /429 와 경로별 본문/],
    ['screen message changed alone', mutate(PATHS.loginFailureMessages, "LOGIN_RATE_LIMITED_MESSAGE = '로그인 요청이 많습니다.", "LOGIN_RATE_LIMITED_MESSAGE = '요청이 많습니다."), /로그인 BFF 거부 본문/],
    ['MFA BFF message changed alone', mutate(PATHS.mfaBffRoute, "status === 429 ? '인증 요청이 많습니다.", "status === 429 ? '요청이 많습니다."), /추가 인증 BFF 거부 본문/],
    ['backend body changed alone', mutate(PATHS.backendRateLimitFilter, 'Rate limit exceeded. Too many requests from this IP.', 'Too many requests.'), /백엔드 직접 경로 거부 본문/],
    ['edge limit not forwarded', mutate(PATHS.composeProd, '      EDGE_LOGIN_REQUESTS_PER_MINUTE: ${RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:-30}', '      # removed'), /같은 변수\(RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE\)/],
    ['edge limit uses its own variable', mutate(PATHS.composeProd, 'EDGE_LOGIN_REQUESTS_PER_MINUTE: ${RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:-30}', 'EDGE_LOGIN_REQUESTS_PER_MINUTE: ${EDGE_LOGIN_REQUESTS_PER_MINUTE:-30}'), /같은 변수\(RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE\)/],
    ['edge default drifts from the backend default', mutate(PATHS.composeProd, '${RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:-30}', '${RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:-60}'), /기본값\(60\)이 백엔드 기본값\(30\)/],
  ];
  for (const [name, files, expected] of cases) {
    const errors = evaluateEdgeTrustBoundary(files);
    assert.ok(errors.some((error) => expected.test(error)), `${name} was not detected: ${JSON.stringify(errors)}`);
  }
});

test('a comment that only mentions the helper does not satisfy a route', () => {
  const route = AUTH_BFF_ROUTES[1];
  const files = mutate(route, '...forwardedClientIpHeaders(request.headers),', '// ...forwardedClientIpHeaders(request.headers),');
  assert.ok(evaluateEdgeTrustBoundary(files).some((error) => error.includes(route)));
});
