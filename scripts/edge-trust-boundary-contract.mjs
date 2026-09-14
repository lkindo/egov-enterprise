#!/usr/bin/env node
/**
 * 클라이언트 IP 신뢰 경계 계약 — ADR-0019 · GAP-SEC-004.
 *
 * 사용자 IP 는 로그인 IP 제한 정책·로그인 IP 기록·요청 제한의 입력이다. 이 값이 믿을 만하려면 세 조건이
 * 함께 성립해야 하고, 하나만 어긋나도 오류 없이 위조 경로나 전사 단일 버킷으로 돌아간다.
 *
 *   1. 운영 앞단 프록시(edge)가 X-Forwarded-For 를 접속 주소로 **덮어쓴다**(이어 붙이면 위조 값이 남는다).
 *   2. 운영에서 Next 는 호스트에 직접 공개되지 않는다. 공개되면 클라이언트가 edge 를 건너뛰어 헤더를 넣는다.
 *   3. Next 가 사용자 IP 를 넘기는 스위치(TRUSTED_EDGE_PROXY)는 edge 가 있는 운영 오버레이에서만 켜지고,
 *      백엔드를 직접 부르는 서버 측 경로는 모두 공용 헬퍼를 거친다.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PATHS = Object.freeze({
  composeBase: 'docker-compose.yml',
  composeProd: 'docker-compose.prod.yml',
  edgeTemplate: 'config/edge/default.conf.template',
  clientInterceptor: 'frontend/src/lib/api/client.ts',
  frontendSource: 'frontend/src',
});

/** 백엔드를 서버에서 직접 부르는 인증 BFF. 새 경로가 생기면 여기에 더하고 헬퍼를 거치게 한다. */
export const AUTH_BFF_ROUTES = Object.freeze([
  'frontend/src/app/api/auth/login/route.ts',
  'frontend/src/app/api/auth/reissue/route.ts',
  'frontend/src/app/api/auth/logout/route.ts',
]);

const FORWARD_HELPER = 'forwardedClientIpHeaders';

function stripYamlComments(source) {
  return source.split(/\r?\n/).map((line) => (/^\s*#/.test(line) ? '' : line)).join('\n');
}

/** compose 최상위 services 아래 한 서비스 블록(두 칸 들여쓰기 키)을 원문으로 잘라낸다. */
export function composeServiceBlock(source, service) {
  const lines = stripYamlComments(source).split('\n');
  const start = lines.findIndex((line) => line === `  ${service}:`);
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && /^ {0,2}\S/.test(line));
  return lines.slice(start + 1, end < 0 ? lines.length : end).join('\n');
}

function stripTsComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function listSourceFiles(root, dir) {
  const out = [];
  for (const entry of readdirSync(join(root, dir))) {
    const path = join(dir, entry);
    if (entry === 'node_modules' || entry === '__tests__') continue;
    if (statSync(join(root, path)).isDirectory()) out.push(...listSourceFiles(root, path));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(path.replaceAll('\\', '/'));
  }
  return out;
}

/** @param {Record<string, string>} files 경로 → 원문. @returns {string[]} 위반 목록 */
export function evaluateEdgeTrustBoundary(files) {
  const errors = [];
  const read = (path) => {
    if (files[path] === undefined) errors.push(`${path} 가 없습니다`);
    return files[path] ?? '';
  };

  const prod = read(PATHS.composeProd);
  const edge = composeServiceBlock(prod, 'edge');
  if (!edge) {
    errors.push('운영 오버레이에 edge 서비스가 없습니다 — 사용자 IP 를 덮어쓰는 진입점이 사라졌습니다');
  } else {
    if (!/^\s{4}image:\s*\S+@sha256:[0-9a-f]{64}\s*$/m.test(edge)) errors.push('edge 이미지가 digest 로 고정되지 않았습니다');
    if (!/^\s{4}ports:\s*$/m.test(edge) || !/^\s{6}-\s*"?[^"\n]*:8080"?\s*$/m.test(edge)) errors.push('edge 가 컨테이너 포트 8080 을 공개하지 않습니다');
    if (!edge.includes(`./${PATHS.edgeTemplate}:/etc/nginx/templates/default.conf.template:ro`)) errors.push('edge 가 저장소의 프록시 템플릿을 읽기 전용으로 쓰지 않습니다');
    if (!/^\s{6}NGINX_ENVSUBST_FILTER:\s*"\^EDGE_"\s*$/m.test(edge)) errors.push('edge 템플릿 치환이 EDGE_* 로 한정되지 않았습니다 — nginx 변수가 환경변수로 지워질 수 있습니다');
  }

  const frontendProd = composeServiceBlock(prod, 'frontend');
  if (!frontendProd || !/^\s{4}ports:\s*!reset\s*\[\]\s*$/m.test(frontendProd)) {
    errors.push('운영 오버레이가 Next 의 호스트 공개 포트를 비우지 않습니다(ports: !reset []) — edge 를 건너뛴 헤더 위조가 가능합니다');
  }
  if (!frontendProd || !/^\s{6}TRUSTED_EDGE_PROXY:\s*"true"\s*$/m.test(frontendProd)) {
    errors.push('운영 오버레이 frontend 에 TRUSTED_EDGE_PROXY: "true" 가 없습니다 — 사용자 IP 가 백엔드로 전달되지 않습니다');
  }
  for (const [path, source] of Object.entries(files)) {
    if (/^docker-compose.*\.ya?ml$/.test(path) && path !== PATHS.composeProd
        && /^\s*TRUSTED_EDGE_PROXY\s*:/m.test(stripYamlComments(source))) {
      errors.push(`${path} 가 TRUSTED_EDGE_PROXY 를 켭니다 — edge 가 없는 스택에서 켜면 위조 값이 백엔드로 넘어갑니다`);
    }
  }

  const template = read(PATHS.edgeTemplate).split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join('\n');
  if (!/proxy_set_header\s+X-Forwarded-For\s+\$remote_addr\s*;/.test(template)) errors.push('edge 가 X-Forwarded-For 를 접속 주소로 덮어쓰지 않습니다');
  if (template.includes('$proxy_add_x_forwarded_for')) errors.push('edge 가 X-Forwarded-For 를 이어 붙입니다 — 클라이언트가 보낸 값이 앞에 남습니다');
  if (!/proxy_set_header\s+Host\s+\$http_host\s*;/.test(template)) errors.push('edge 가 원래 Host 를 넘기지 않습니다 — Next 의 Origin 검사가 정상 요청을 막습니다');
  if (!/set_real_ip_from\s+\$\{EDGE_TRUSTED_UPSTREAM\}\s*;/.test(template)) errors.push('edge 의 상위 프록시 신뢰가 EDGE_TRUSTED_UPSTREAM 설정으로 한정되지 않았습니다');

  const interceptor = stripTsComments(read(PATHS.clientInterceptor));
  if (!interceptor.includes(`${FORWARD_HELPER}(await headers())`)) {
    errors.push('서버 측 API 인터셉터가 사용자 IP 헬퍼를 거치지 않습니다 — 서버 컴포넌트 호출이 한 버킷을 같이 씁니다');
  }
  for (const path of AUTH_BFF_ROUTES) {
    const source = stripTsComments(read(path));
    if (!source.includes(`...${FORWARD_HELPER}(request.headers)`)) errors.push(`${path} 가 백엔드 호출에 사용자 IP 헬퍼를 싣지 않습니다`);
  }
  for (const [path, raw] of Object.entries(files)) {
    if (!path.startsWith(`${PATHS.frontendSource}/`) || AUTH_BFF_ROUTES.includes(path) || path === PATHS.clientInterceptor) continue;
    const source = stripTsComments(raw);
    if (/BACKEND_API_URL/.test(source) && /\baxios\.(get|post|put|patch|delete|request)\s*\(/.test(source)
        && !source.includes(FORWARD_HELPER)) {
      errors.push(`${path} 가 백엔드를 axios 로 직접 부르면서 사용자 IP 헬퍼를 거치지 않습니다 — 공용 클라이언트를 쓰거나 헬퍼를 싣고 AUTH_BFF_ROUTES 에 등록하세요`);
    }
  }
  return errors;
}

export function loadRepositoryFiles(root) {
  const files = {};
  for (const name of readdirSync(root)) {
    if (/^docker-compose.*\.ya?ml$/.test(name)) files[name] = readFileSync(join(root, name), 'utf8');
  }
  for (const path of [PATHS.edgeTemplate, PATHS.clientInterceptor, ...AUTH_BFF_ROUTES]) {
    if (existsSync(join(root, path))) files[path] = readFileSync(join(root, path), 'utf8');
  }
  for (const path of listSourceFiles(root, PATHS.frontendSource)) {
    files[path] ??= readFileSync(join(root, path), 'utf8');
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const errors = evaluateEdgeTrustBoundary(loadRepositoryFiles(root));
  if (errors.length) {
    for (const error of errors) process.stderr.write(`FAIL ${error}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`PASS edge trust boundary (${relative(process.cwd(), root) || '.'})\n`);
  }
}
