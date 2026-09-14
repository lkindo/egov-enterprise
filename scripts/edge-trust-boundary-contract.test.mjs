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

test('a comment that only mentions the helper does not satisfy a route', () => {
  const route = AUTH_BFF_ROUTES[1];
  const files = mutate(route, '...forwardedClientIpHeaders(request.headers),', '// ...forwardedClientIpHeaders(request.headers),');
  assert.ok(evaluateEdgeTrustBoundary(files).some((error) => error.includes(route)));
});
