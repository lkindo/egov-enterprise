import fs from 'node:fs';
import path from 'node:path';

/**
 * 운영 배포에서 "앱이 읽는 환경변수" 와 "compose 가 컨테이너에 전달하는 환경변수" 의 양방향 정합.
 *
 * [왜 필요한가 — 2026-09-13 실측] compose 의 `environment` 는 **나열된 변수만** 컨테이너에 넣는다.
 *   application-prod.yml 이 `${ATTACHMENT_INTEGRITY_ENABLED:true}` 를 읽고 운영 문서가 "이 변수로 끄라"
 *   고 안내해도, docker-compose.prod.yml 에 그 줄이 없으면 호스트에 값을 넣어도 닿지 않는다. 같은 누락이
 *   메일 발신자·문자 발신번호·CORS·로그인 잠금·DB 풀·브랜드/밀도 등 20건 넘게 조용히 쌓여 있었다.
 *   DEC-OPS-045 가 보존 변수 3개(알림 2·로그 1)를 같은 이유로 전달한 뒤에도 규칙이 없어 재발했다.
 *
 * [원천] api — application.yml·application-prod.yml·globals.properties(@PropertySource 로 적재)의
 *   `${UPPER_NAME[:기본값]}`(중첩 포함), 백엔드 main 소스의 `@Value("${UPPER_NAME...}")`,
 *   그리고 placeholder 없이 Spring 완화 바인딩으로만 소비되는 선언 목록.
 *   frontend — frontend/src 의 `process.env.X`(테스트 제외). `NEXT_PUBLIC_*` 는 빌드 시점에 인라인되므로
 *   런타임 전달 대상이 아니다.
 *
 * [전달 형태 — docker compose v2.40 실측]
 *   - `VAR:` / `VAR: ~` / `- VAR`(값 없음) → 호스트/.env 에 변수가 **없으면** 컨테이너에도 없다(앱 기본값이 산다).
 *     ⚠ 호스트/.env 에 **빈 값으로 설정**돼 있으면(`VAR=`) "" 가 전달돼 앱 기본값을 덮는다 — 이 형태도
 *     "비어 있으면 기본값" 을 보장하지는 않는다. 운영 .env 에 빈 줄을 두지 않는다.
 *   - `${VAR}`·`$VAR`·`${VAR:-}`·`${VAR-}`·`${VAR:=}`·`""`·`- VAR=` → 미설정 시 **빈 문자열로 설정된다**.
 *     Spring 은 변수가 "있다" 고 보고 앱 기본값 대신 "" 를 쓴다. 무기본값 필수 변수라면 fail-fast 도
 *     무력화된다. 그래서 앱 기본값이 전부 빈 값인 경우가 아니면 금지한다.
 *   - `${VAR:-값}` / `${VAR:?사유}` → 허용.
 *   - 오버레이의 값 없는 키(`VAR:`·`~`·`null`)는 base 의 같은 키 값을 **지운다**(null 병합). 금지한다.
 */

export const API_CONFIG_FILES = [
  'api-server/src/main/resources/application.yml',
  'api-server/src/main/resources/application-prod.yml',
  'api-server/src/main/resources/egovframework/egovProps/globals.properties',
];
export const JAVA_SOURCE_ROOTS = [
  'api-server/src/main/java',
  'business-app/src/main/java',
  'business-core/src/main/java',
  'foundation/src/main/java',
];
export const COMPOSE_BASE = 'docker-compose.yml';
export const COMPOSE_PROD = 'docker-compose.prod.yml';
export const FRONTEND_SOURCE_ROOT = 'frontend/src';

/**
 * 앱이 읽지만 운영 compose 로 **의도적으로** 전달하지 않는 api 변수. 사유가 곧 계약이다.
 * 이름을 넣는 것은 "운영자가 이 값을 바꿀 수 없다" 는 결정이므로, 추가 시 사유를 남긴다(H2).
 */
export const API_NOT_FORWARDED = Object.freeze({
  SERVER_PORT: '컨테이너 내부 포트는 8080 으로 고정이다 — base compose 의 ports·frontend 의 BACKEND_API_URL·Dockerfile 이 모두 8080 을 전제하므로 바꾸면 서비스 간 연결이 끊긴다.',
});

/**
 * placeholder 없이 Spring 이 환경변수에서 **직접** 바인딩하는 api 변수. compose 에 반드시 있어야 하고,
 * compose 에 있는 키가 원천에도 선언에도 없으면 red 다(양방향).
 */
export const API_FORWARDED_WITHOUT_PLACEHOLDER = Object.freeze({
  SPRING_PROFILES_ACTIVE: 'Spring 프로파일 선택(완화 바인딩). ConfigSafetyLinterTest 가 값(prod)을 따로 고정한다.',
  SPRING_APPLICATION_JSON: 'base 의 datasource 고정 JSON 을 무력화한다(docker-compose.prod.yml 머리주석).',
  SPRING_FLYWAY_LOCATIONS: '운영에서 dev 시드를 적재하지 않도록 migration 경로를 한정한다.',
  SPRING_MAIL_USERNAME: 'application-prod.yml 이 인증 릴레이 자격을 완화 바인딩으로 받으라고 안내한다(placeholder 로 두면 SecretLiteralLinterTest 가 red).',
  SPRING_MAIL_PASSWORD: 'application-prod.yml 이 인증 릴레이 자격을 완화 바인딩으로 받으라고 안내한다. SecretLiteralLinterTest 보호 대상이다.',
});

/** 프런트 소스가 읽지만 운영 compose 로 의도적으로 전달하지 않는 변수. */
export const FRONTEND_NOT_FORWARDED = Object.freeze({
  NODE_ENV: 'Next 가 빌드·기동 모드로 스스로 정한다. 외부에서 주입하면 production 판정이 흔들린다.',
  E2E_DIAG: 'E2E 진단 출력 전용이다. 운영 컨테이너에 전달할 이유가 없다.',
  ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE: 'ADR-0010 — 평문 HTTP loopback 개발·검증 전용 opt-in 이다. 운영에 전달하면 인증 쿠키의 Secure 가 빠질 수 있다.',
  BACKEND_ACTUATOR_URL: 'MonitoringAdminService 의 서버 전용 분기에서만 읽히는데, 현재 호출자는 모두 클라이언트 useQuery 라 도달하지 않는다. 운영의 /actuator 는 관리 포트 분리(W1-12)로 404 가 의도된 형상이며, 9090 으로 연결하는 것은 next.config 가 H3 완화로 금지한 방향이다.',
});

/** placeholder·코드 읽기 없이 compose 에 남아 있는 프런트 변수와 그 사유. */
export const FRONTEND_FORWARDED_WITHOUT_READ = Object.freeze({
  NEXT_PUBLIC_API_URL: 'base 개발 스택 호환용이다. NEXT_PUBLIC_* 는 빌드 시점에 인라인되어 런타임 값은 번들에 반영되지 않는다(next.config 의 rewrite 폴백에서만 읽힌다).',
});

/** 운영 오버레이의 frontend 환경에 나타나면 안 되는 변수(값 유무와 무관). */
export const PROD_FORBIDDEN_FRONTEND = Object.freeze({
  ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE: 'ADR-0010 — 운영 배포에서는 인증 쿠키 Secure 를 끌 수 없어야 한다.',
});

const UPPER_ENV_NAME = /^[A-Z][A-Z0-9_]*$/;
const FRONTEND_ENV_READ = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const JAVA_VALUE_ANNOTATION = /@Value\s*\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;

/** 따옴표 밖에서, 줄 시작이거나 공백 뒤에 오는 첫 `#` 이후를 잘라낸다(YAML·properties 주석 규칙). */
export function stripYamlComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index);
    }
  }
  return line;
}

/**
 * `${NAME[:기본값]}` 를 괄호 균형으로 읽고, 기본값 안의 중첩 placeholder 도 재귀로 수집한다.
 * 대문자 환경변수 이름만 기록한다(소문자 `${spring.mail.username}` 같은 속성 참조는 건너뛰되 그 기본값은 스캔).
 */
export function scanPlaceholders(text, onPlaceholder) {
  let index = 0;
  while (index < text.length) {
    const start = text.indexOf('${', index);
    if (start < 0) return;
    let depth = 0;
    let end = -1;
    for (let cursor = start; cursor < text.length; cursor += 1) {
      if (text.startsWith('${', cursor)) {
        depth += 1;
        cursor += 1;
      } else if (text[cursor] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = cursor;
          break;
        }
      }
    }
    if (end < 0) return;
    const inner = text.slice(start + 2, end);
    const colon = inner.indexOf(':');
    const name = colon < 0 ? inner : inner.slice(0, colon);
    const fallback = colon < 0 ? null : inner.slice(colon + 1);
    if (UPPER_ENV_NAME.test(name)) onPlaceholder(name, fallback);
    if (fallback !== null) scanPlaceholders(fallback, onPlaceholder);
    index = end + 1;
  }
}

function recordPlaceholder(placeholders, name, fallback, location) {
  const entry = placeholders.get(name) ?? { defaults: [], locations: [] };
  entry.defaults.push(fallback);
  entry.locations.push(location);
  placeholders.set(name, entry);
}

/** 설정 텍스트에서 `${VAR[:기본값]}` 를 모은다. 주석 속 언급은 세지 않는다. */
export function collectPlaceholders(files) {
  const placeholders = new Map();
  for (const { file, text } of files) {
    text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
      scanPlaceholders(stripYamlComment(rawLine), (name, fallback) => {
        recordPlaceholder(placeholders, name, fallback, `${file}:${lineIndex + 1}`);
      });
    });
  }
  return placeholders;
}

/** 백엔드 소스의 `@Value("...")` 문자열 안 placeholder 만 모은다(주석·일반 문자열의 언급은 제외). */
export function collectJavaValuePlaceholders(files, placeholders = new Map()) {
  for (const { file, text } of files) {
    for (const match of text.matchAll(JAVA_VALUE_ANNOTATION)) {
      const line = text.slice(0, match.index).split('\n').length;
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      const prefix = text.slice(lineStart, match.index).trimStart();
      if (prefix.startsWith('//') || prefix.startsWith('*')) continue;
      scanPlaceholders(match[1], (name, fallback) => {
        recordPlaceholder(placeholders, name, fallback, `${file}:${line}`);
      });
    }
  }
  return placeholders;
}

function normalizeComposeValue(raw) {
  const value = raw.trim();
  return value === '' || /^(?:~|null|Null|NULL)$/.test(value) ? null : value;
}

/**
 * compose 한 서비스의 `environment` 를 키 → 값 원문으로 읽는다.
 * 값이 없거나 YAML null 이면 `null`(전달 보류), 리스트형 `- KEY=` 는 ''(빈 문자열 설정)이다.
 * 서비스를 찾지 못하면 null — 호출자가 판정 불가를 오류로 올린다.
 */
export function parseComposeServiceEnvironment(text, service) {
  const lines = text.split(/\r?\n/);
  const serviceStart = lines.findIndex((line) => new RegExp(`^  ${service}\\s*:\\s*$`).test(stripYamlComment(line)));
  if (serviceStart < 0) return null;

  let environmentStart = -1;
  for (let index = serviceStart + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (line.trim() === '') continue;
    if (/^\S/.test(line) || /^ {2}\S/.test(line)) break;
    if (/^ {4}environment\s*:\s*$/.test(line)) {
      environmentStart = index;
      break;
    }
  }
  if (environmentStart < 0) return new Map();

  const environment = new Map();
  for (let index = environmentStart + 1; index < lines.length; index += 1) {
    const line = stripYamlComment(lines[index]);
    if (line.trim() === '') continue;
    if (!/^ {6}/.test(line)) break;
    const mapping = /^ {6}([A-Za-z_][A-Za-z0-9_]*)\s*:(.*)$/.exec(line);
    const listItem = /^ {6}-\s*([A-Za-z_][A-Za-z0-9_]*)(=(.*))?$/.exec(line);
    if (mapping) {
      environment.set(mapping[1], normalizeComposeValue(mapping[2]));
    } else if (listItem) {
      environment.set(listItem[1], listItem[2] === undefined ? null : listItem[3].trim());
    }
  }
  return environment;
}

/** 프런트 소스가 런타임에 읽는 환경변수. 테스트·빌드 시점 인라인 변수는 제외한다. */
export function collectFrontendEnvReads(files) {
  const reads = new Map();
  for (const { file, text } of files) {
    for (const match of text.matchAll(FRONTEND_ENV_READ)) {
      const name = match[1];
      if (name.startsWith('NEXT_PUBLIC_')) continue;
      const locations = reads.get(name) ?? [];
      locations.push(file);
      reads.set(name, locations);
    }
  }
  return reads;
}

/** 미설정 시 컨테이너에 빈 문자열로 설정되는 전달 형태인가. 값 없는 전달(null)은 해당하지 않는다. */
export function resolvesEmptyWhenUnset(value, name) {
  if (value === null) return false;
  if (value === '' || value === '""' || value === "''") return true;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^["']?\\$\\{${escaped}(?::?[-=])?\\}["']?$`).test(value)
    || new RegExp(`^["']?\\$${escaped}["']?$`).test(value);
}

function checkDeclarations({ label, reads, forwarded, notForwarded, forwardedWithoutRead, errors, readNoun }) {
  for (const [name, locations] of [...reads].sort(([left], [right]) => left.localeCompare(right))) {
    const isForwarded = forwarded.has(name);
    const declaredNotForwarded = Object.hasOwn(notForwarded, name);
    if (!isForwarded && !declaredNotForwarded) {
      errors.push(`${label} 가 ${readNoun(name)} 을 읽지만(${[...new Set(locations)].join(', ')}) 운영 compose 가 전달하지 않습니다 — docker-compose.prod.yml ${label}.environment 에 '${name}:'(값 없음)으로 추가하거나, 전달하지 않는 사유를 선언하세요.`);
    }
    if (isForwarded && declaredNotForwarded) {
      errors.push(`${label}: ${name} 은 비전달로 선언돼 있는데 compose 가 전달합니다 — 둘 중 하나가 사실과 다릅니다.`);
    }
    if (Object.hasOwn(forwardedWithoutRead, name)) {
      errors.push(`${label}: ${name} 은 '읽기 없이 전달' 로 선언돼 있는데 실제로 읽힙니다 — 선언을 제거하세요.`);
    }
  }
  for (const name of Object.keys(notForwarded)) {
    if (!reads.has(name)) {
      errors.push(`${label}: 비전달 선언의 ${name} 을 더 이상 읽지 않습니다 — 낡은 선언을 제거하세요.`);
    }
  }
  for (const name of [...forwarded].sort()) {
    if (!reads.has(name) && !Object.hasOwn(forwardedWithoutRead, name)) {
      errors.push(`${label}: compose 가 ${name} 을 전달하지만 앱이 읽지 않습니다 — 낡은 전달을 제거하거나, 완화 바인딩 등 읽는 경로를 사유와 함께 선언하세요.`);
    }
  }
  for (const name of Object.keys(forwardedWithoutRead)) {
    if (!forwarded.has(name)) {
      errors.push(`${label}: '읽기 없이 전달' 선언의 ${name} 이 compose 에 없습니다 — 전달이 빠졌거나 낡은 선언입니다.`);
    }
  }
}

export function evaluateDeployEnvForwarding({
  apiConfigs,
  javaSources = [],
  composeBase,
  composeProd,
  frontendSources,
  apiNotForwarded = API_NOT_FORWARDED,
  apiForwardedWithoutPlaceholder = API_FORWARDED_WITHOUT_PLACEHOLDER,
  frontendNotForwarded = FRONTEND_NOT_FORWARDED,
  frontendForwardedWithoutRead = FRONTEND_FORWARDED_WITHOUT_READ,
  prodForbiddenFrontend = PROD_FORBIDDEN_FRONTEND,
  floors = { placeholders: 20, apiEnvironment: 10, frontendReads: 4 },
}) {
  const errors = [];
  const placeholders = collectJavaValuePlaceholders(javaSources, collectPlaceholders(apiConfigs));

  const baseApi = parseComposeServiceEnvironment(composeBase, 'api');
  const prodApi = parseComposeServiceEnvironment(composeProd, 'api');
  const baseFrontend = parseComposeServiceEnvironment(composeBase, 'frontend');
  const prodFrontend = parseComposeServiceEnvironment(composeProd, 'frontend') ?? new Map();
  if (!baseApi || !prodApi || !baseFrontend) {
    errors.push('compose 에서 api/frontend 서비스 정의를 찾지 못했습니다 — 서비스명·들여쓰기가 바뀌면 이 계약이 통째로 vacuous 해집니다. 계약을 함께 갱신하세요.');
    return { errors, summary: null };
  }

  // ── api: 읽기 ↔ 전달 양방향.
  const apiForwarded = new Set([...baseApi.keys(), ...prodApi.keys()]);
  checkDeclarations({
    label: 'api',
    reads: new Map([...placeholders].map(([name, entry]) => [name, entry.locations])),
    forwarded: apiForwarded,
    notForwarded: apiNotForwarded,
    forwardedWithoutRead: apiForwardedWithoutPlaceholder,
    errors,
    readNoun: (name) => `\${${name}}`,
  });

  // ── 전달 형태: 미설정 시 빈 문자열이 되는 형태는 앱 기본값·fail-fast 를 무너뜨린다.
  for (const [label, environment] of [[COMPOSE_BASE, baseApi], [COMPOSE_PROD, prodApi]]) {
    for (const [name, value] of environment) {
      const entry = placeholders.get(name);
      if (!entry || !resolvesEmptyWhenUnset(value, name)) continue;
      if (!entry.defaults.every((fallback) => fallback === '')) {
        errors.push(`${label} api.${name}: '${value}' 는 미설정 시 빈 문자열을 컨테이너에 넣어 앱의 기본값/필수 검증(${entry.locations.join(', ')})을 무력화합니다 — '${name}:'(값 없음), '\${${name}:-값}', '\${${name}:?사유}' 중 하나로 바꾸세요.`);
      }
    }
  }

  // ── 오버레이의 값 없는 키는 base 의 같은 키 값을 지운다(null 병합).
  for (const [service, base, prod] of [['api', baseApi, prodApi], ['frontend', baseFrontend, prodFrontend]]) {
    for (const [name, value] of prod) {
      if (value === null && base.has(name) && base.get(name) !== null) {
        errors.push(`${COMPOSE_PROD} ${service}.${name}: 값 없이 재선언하면 base(${COMPOSE_BASE})의 값 '${base.get(name)}' 이 지워집니다 — 재선언을 빼거나 값을 명시하세요.`);
      }
    }
  }

  // ── frontend: 서버 런타임 읽기 ↔ 전달 양방향.
  const frontendReads = collectFrontendEnvReads(frontendSources);
  const frontendForwarded = new Set([...baseFrontend.keys(), ...prodFrontend.keys()]);
  checkDeclarations({
    label: 'frontend',
    reads: frontendReads,
    forwarded: frontendForwarded,
    notForwarded: frontendNotForwarded,
    forwardedWithoutRead: frontendForwardedWithoutRead,
    errors,
    readNoun: (name) => `process.env.${name}`,
  });
  for (const [name, reason] of Object.entries(prodForbiddenFrontend)) {
    if (prodFrontend.has(name)) {
      errors.push(`${COMPOSE_PROD} frontend.${name}: 운영 오버레이에 둘 수 없습니다 — ${reason}`);
    }
  }

  // ── vacuity: 파싱이 조용히 붕괴하면 위 검사가 전부 통과로 보인다.
  if (placeholders.size < floors.placeholders) {
    errors.push(`게이트 무결성: api 가 읽는 환경변수 ${placeholders.size}종이 하한 ${floors.placeholders} 미만입니다 — 파일 경로·파서 파손 의심.`);
  }
  if (apiForwarded.size < floors.apiEnvironment) {
    errors.push(`게이트 무결성: compose api.environment 키 ${apiForwarded.size}개가 하한 ${floors.apiEnvironment} 미만입니다 — compose 구조 변경 의심.`);
  }
  if (frontendReads.size < floors.frontendReads) {
    errors.push(`게이트 무결성: 프런트 런타임 환경변수 ${frontendReads.size}종이 하한 ${floors.frontendReads} 미만입니다 — 소스 경로·스캔 파손 의심.`);
  }

  return {
    errors,
    summary: {
      apiReads: placeholders.size,
      apiForwarded: apiForwarded.size,
      frontendReads: frontendReads.size,
      frontendForwarded: frontendForwarded.size,
    },
  };
}

function listFiles(root, relativeRoot, include, skipDirectory = () => false) {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirectory(entry.name)) walk(target);
      } else if (include(entry.name)) {
        files.push(target);
      }
    }
  };
  walk(path.join(root, relativeRoot));
  return files.sort().map((file) => ({
    file: path.relative(root, file).split(path.sep).join('/'),
    text: fs.readFileSync(file, 'utf8'),
  }));
}

export function inspectDeployEnvForwarding(root) {
  const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
  return evaluateDeployEnvForwarding({
    apiConfigs: API_CONFIG_FILES.map((file) => ({ file, text: read(file) })),
    javaSources: JAVA_SOURCE_ROOTS.flatMap((sourceRoot) => listFiles(root, sourceRoot, (name) => name.endsWith('.java'))),
    composeBase: read(COMPOSE_BASE),
    composeProd: read(COMPOSE_PROD),
    frontendSources: listFiles(
      root,
      FRONTEND_SOURCE_ROOT,
      (name) => /\.(?:ts|tsx|js|jsx|mjs)$/.test(name) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name),
      (name) => name === 'node_modules' || name === '__tests__',
    ),
  });
}
