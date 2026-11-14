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
  // [ADR-0059] edge 로그인 요청 제한이 따라야 하는 원본 — 경로·한도 기본값·거부 본문.
  backendRateLimitFilter: 'business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java',
  backendConfig: 'api-server/src/main/resources/application.yml',
  loginFailureMessages: 'frontend/src/lib/auth/login-error.ts',
  mfaBffRoute: 'frontend/src/app/api/auth/mfa/[...path]/route.ts',
});

/**
 * [ADR-0059] edge 가 세는 로그인 경로(정규식 접두). 백엔드 로그인 버킷(RateLimitFilter)과 같은 집합이다 — 인증 BFF 두 경로와
 * 백엔드 직접 경로 셋. 비밀번호 변경 경로는 백엔드 상수와 대조한다.
 */
export const EDGE_LOGIN_PATH_PATTERNS = Object.freeze([
  '/api/auth/(login|mfa/)',
  '/api/v1/auth/(login|mfa/)',
  '/api/v1/users/me/password',
]);

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

/** nginx 블록 하나를 여는 줄부터 짝 맞는 닫는 중괄호까지 잘라 안쪽만 돌려준다. 없으면 null. */
export function nginxBlock(template, opener) {
  const start = template.indexOf(opener);
  if (start < 0) return null;
  const open = template.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let index = open; index < template.length; index += 1) {
    if (template[index] === '{') depth += 1;
    else if (template[index] === '}') {
      depth -= 1;
      if (depth === 0) return template.slice(open + 1, index);
    }
  }
  return null;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** map 블록의 `키 '값';` 줄을 키 → 값으로 읽는다(작은따옴표 값만). */
function nginxQuotedMapEntries(block) {
  const entries = new Map();
  for (const line of block.split('\n')) {
    const match = /^\s*(\S+)\s+'([^']*)'\s*;\s*$/.exec(line);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

/** [ADR-0059] edge 로그인 요청 제한이 백엔드·화면의 원본과 같은 경로·한도·거부 본문을 쓰는지 본다. */
function evaluateEdgeLoginRateLimit(template, edgeService, read, errors) {
  const keyMap = nginxBlock(template, 'map $uri $edge_login_limit_key');
  if (!keyMap) {
    errors.push('edge 에 로그인 경로 판정(map $uri $edge_login_limit_key)이 없습니다 — api 를 여러 대 띄우면 로그인 한도가 대수만큼 늘어납니다');
  } else {
    if (!/^\s*default\s+""\s*;\s*$/m.test(keyMap)) errors.push('edge 로그인 제한의 기본 키가 비어 있지 않습니다 — 로그인이 아닌 요청까지 셉니다');
    for (const pattern of EDGE_LOGIN_PATH_PATTERNS) {
      if (!new RegExp(`^\\s*${escapeRegExp(`~*^${pattern}`)}\\s+\\$binary_remote_addr\\s*;\\s*$`, 'm').test(keyMap)) {
        errors.push(`edge 로그인 제한이 ${pattern} 를 접속 주소로 세지 않습니다`);
      }
    }
  }
  const passwordPath = /PASSWORD_CHANGE_PATH\s*=\s*"([^"]+)"/.exec(read(PATHS.backendRateLimitFilter))?.[1];
  if (!passwordPath || !EDGE_LOGIN_PATH_PATTERNS.includes(passwordPath)) {
    errors.push(`백엔드 로그인 버킷의 비밀번호 변경 경로(${passwordPath ?? '없음'})를 edge 가 세지 않습니다 — 두 경로 집합이 갈라졌습니다`);
  }

  if (!/^\s*limit_req_zone\s+\$edge_login_limit_key\s+zone=edge_login:\d+m\s+rate=\$\{EDGE_LOGIN_REQUESTS_PER_MINUTE\}r\/m\s*;\s*$/m.test(template)) {
    errors.push('edge 로그인 한도가 EDGE_LOGIN_REQUESTS_PER_MINUTE(분당)로 정해지지 않았습니다 — 운영자가 백엔드 한도만 바꿉니다');
  }
  const proxy = nginxBlock(template, 'location / ');
  if (!proxy) {
    errors.push('edge 의 프록시 location / 를 찾을 수 없습니다');
  } else {
    if (!/^\s*limit_req\s+zone=edge_login\s+burst=\$\{EDGE_LOGIN_REQUESTS_PER_MINUTE\}\s+nodelay\s*;\s*$/m.test(proxy)) {
      errors.push('edge 프록시 경로가 로그인 한도(limit_req zone=edge_login burst=한도 nodelay)를 걸지 않습니다');
    }
    if (!/^\s*limit_req_status\s+429\s*;\s*$/m.test(proxy)) errors.push('edge 로그인 제한의 거부 상태가 429 가 아닙니다 — 화면이 요청 제한으로 안내하지 못합니다');
    if (!/^\s*error_page\s+429\s*=\s*@edge_login_limited\s*;\s*$/m.test(proxy)) errors.push('edge 로그인 제한의 거부가 계약 본문(@edge_login_limited)으로 가지 않습니다');
  }
  const limited = nginxBlock(template, 'location @edge_login_limited');
  if (!limited || !/^\s*return\s+429\s+\$edge_login_limited_body\s*;\s*$/m.test(limited)) {
    errors.push('edge 로그인 제한의 거부 응답(location @edge_login_limited)이 429 와 경로별 본문을 돌려주지 않습니다');
  }

  const bodies = nginxQuotedMapEntries(nginxBlock(template, 'map $uri $edge_login_limited_body') ?? '');
  const loginMessage = /LOGIN_RATE_LIMITED_MESSAGE\s*=\s*'([^']+)'/.exec(read(PATHS.loginFailureMessages))?.[1];
  const mfaMessage = /status\s*===\s*429\s*\?\s*'([^']+)'/.exec(read(PATHS.mfaBffRoute))?.[1];
  const backendLiteral = /getWriter\(\)\.write\("((?:[^"\\]|\\.)*)"\)/.exec(read(PATHS.backendRateLimitFilter))?.[1];
  const backendBody = backendLiteral === undefined ? undefined : JSON.parse(`"${backendLiteral}"`);
  const expectedBodies = [
    ['~*^/api/auth/login', loginMessage && JSON.stringify({ success: false, code: 'LOGIN_RATE_LIMITED', message: loginMessage }), '로그인 BFF'],
    ['~*^/api/auth/mfa/', mfaMessage && JSON.stringify({ success: false, message: mfaMessage }), '추가 인증 BFF'],
    ['default', backendBody, '백엔드 직접 경로'],
  ];
  for (const [key, expected, owner] of expectedBodies) {
    if (!expected || bodies.get(key) !== expected) {
      errors.push(`edge 로그인 제한의 ${owner} 거부 본문이 원본 실패 응답과 다릅니다 — 화면이 백엔드가 막을 때와 다른 안내를 보입니다`);
    }
  }

  const backendDefault = /login-requests-per-minute:\s*\$\{RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:(\d+)\}/.exec(read(PATHS.backendConfig))?.[1];
  const edgeLimit = edgeService && /^\s{6}EDGE_LOGIN_REQUESTS_PER_MINUTE:\s*\$\{RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE:-(\d+)\}\s*$/m.exec(edgeService);
  if (!edgeLimit) {
    errors.push('운영 오버레이 edge 가 EDGE_LOGIN_REQUESTS_PER_MINUTE 를 백엔드와 같은 변수(RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE)에서 받지 않습니다');
  } else if (edgeLimit[1] !== backendDefault) {
    errors.push(`edge 로그인 한도 기본값(${edgeLimit[1]})이 백엔드 기본값(${backendDefault ?? '없음'})과 다릅니다`);
  }
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
  evaluateEdgeLoginRateLimit(template, edge, read, errors);

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
  for (const path of [PATHS.edgeTemplate, PATHS.clientInterceptor, PATHS.backendRateLimitFilter, PATHS.backendConfig, ...AUTH_BFF_ROUTES]) {
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
