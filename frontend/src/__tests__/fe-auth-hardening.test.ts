import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔒 FE 인증 하드닝 회귀 방지 게이트 — quality-score §2.F / FE auth 아키텍처.
 *
 * FE 인증은 (1) accessToken=HttpOnly·SameSite=Strict 쿠키 + 운영/비-loopback Secure 강제
 * (2) localStorage 토큰 저장 금지
 * (3) 미들웨어의 서명 JWT 검증(위조 userRole 쿠키 불신) (4) prod CSP 에 unsafe-eval 부재
 * 로 하드닝돼 있다. 이 저장소는 과거 fe-auth 변경이 로그인/보안을 파손·회귀시킨 이력이 있어,
 * 이 4대 불변식을 정적으로 못박아 <b>회귀를 배포 전에 차단</b>한다.
 *
 * 소스 텍스트 기반 회귀 게이트(런타임 아님) — 하드닝을 되돌리는 변경(localStorage 토큰 재도입·
 * HttpOnly 제거·prod unsafe-eval 부활·서명검증 삭제)이 들어오면 실패한다.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..');            // frontend/src
const FE_ROOT = join(SRC, '..');         // frontend

function read(rel: string): string {
  return readFileSync(join(FE_ROOT, rel), 'utf8');
}

function collectSource(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collectSource(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

type SessionCookieName = 'accessToken' | 'session_exp';
const SESSION_WRITERS = [
  'src/lib/auth/auth-session-response.ts',
  'src/app/api/auth/reissue/route.ts',
] as const;

function extractCookieOptions(source: string, cookieName: SessionCookieName): string | null {
  const marker = new RegExp(`cookies\\.set\\(\\s*['"]${cookieName}['"]`, 'g');
  const calls = [...source.matchAll(marker)];
  if (calls.length !== 1 || calls[0].index === undefined) return null;

  const optionsStart = source.indexOf('{', calls[0].index + calls[0][0].length);
  if (optionsStart < 0) return null;

  let depth = 0;
  for (let index = optionsStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(optionsStart + 1, index);
    }
  }

  return null;
}

function sessionCookiePolicyViolations(source: string): string[] {
  const violations: string[] = [];
  const policy = /const (\w+) = shouldUseSecureSessionCookie\(\s*request,\s*process\.env\.NODE_ENV,\s*process\.env\.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true',?\s*\);/u.exec(source);
  if (!policy) {
    violations.push('secure-policy-call');
  }

  for (const [cookieName, expectedHttpOnly] of [
    ['accessToken', true],
    ['session_exp', false],
  ] as const) {
    const options = extractCookieOptions(source, cookieName);
    if (options === null) {
      violations.push(`${cookieName}.options`);
      continue;
    }
    if (!new RegExp(`(?:^|,)\\s*httpOnly:\\s*${expectedHttpOnly}\\s*(?:,|$)`).test(options)) {
      violations.push(`${cookieName}.httpOnly`);
    }
    const secureValue = policy?.[1];
    const explicitSecure = secureValue && new RegExp(`(?:^|,)\\s*secure:\\s*${secureValue}\\s*(?:,|$)`).test(options);
    const shorthandSecure = secureValue === 'secure' && /(?:^|,)\s*secure\s*(?:,|$)/u.test(options);
    if (!explicitSecure && !shorthandSecure) {
      violations.push(`${cookieName}.secure`);
    }
    if (!/(?:^|,)\s*sameSite:\s*'strict'\s*(?:,|$)/u.test(options)) {
      violations.push(`${cookieName}.sameSite`);
    }
  }

  return violations;
}

function loginWriterViolations(source: string): string[] {
  const violations: string[] = [];
  if (!/import\s*\{\s*authenticationResponse\s*\}\s*from\s*'@\/lib\/auth\/auth-session-response'/u.test(source)) {
    violations.push('writer-import');
  }
  if (!/return authenticationResponse\(\s*request,\s*tokenResponse,/u.test(source)) {
    violations.push('writer-return');
  }
  if (/\.cookies\.set\(/u.test(source)) violations.push('duplicate-cookie-writer');
  return violations;
}

function mutateAccessCookie(source: string, mutate: (options: string) => string): string {
  const options = extractCookieOptions(source, 'accessToken');
  if (options === null) throw new Error('accessToken writer missing');
  const mutatedOptions = mutate(options);
  expect(mutatedOptions, 'mutation must change the actual accessToken options').not.toBe(options);
  return source.replace(options, mutatedOptions);
}

const TOKEN_IN_JSON_DATA = /data:\s*(?:\{[^}]*\b(?:accessToken|refreshToken)\b|(?:token|tokenResponse)\b)/u;

describe('🔒 FE 인증 하드닝 회귀 방지 게이트 (§2.F)', () => {
  it('로그인은 원 요청과 파싱한 응답을 공용 쿠키 writer에 반환한다', () => {
    const route = read('src/app/api/auth/login/route.ts');
    expect(loginWriterViolations(route)).toEqual([]);
    expect(loginWriterViolations(route.replace("from '@/lib/auth/auth-session-response'", "from './unbound-writer'")))
      .toContain('writer-import');
    expect(loginWriterViolations(route.replace('return authenticationResponse(request,', 'return authenticationResponse(request.nextUrl,')))
      .toContain('writer-return');
  });

  it.each(SESSION_WRITERS)('%s: accessToken·session_exp 속성이 공용 Secure 정책에 결속된다', writerPath => {
    expect(sessionCookiePolicyViolations(read(writerPath))).toEqual([]);
  });

  it('쿠키 속성 게이트는 accessToken 블록의 secure:false와 SameSite 누락을 별도로 검출한다', () => {
    for (const writerPath of SESSION_WRITERS) {
      const source = read(writerPath);
      const insecureAccessToken = mutateAccessCookie(source, options => options.replace(
        /(^|,)(\s*)secure(?:\s*:\s*\w+)?\s*(?=,|$)/u, '$1$2secure: false',
      ));
      const missingAccessTokenSameSite = mutateAccessCookie(source, options => options.replace(/sameSite:\s*'strict',?/u, ''));

      expect(sessionCookiePolicyViolations(insecureAccessToken), writerPath)
        .toContain('accessToken.secure');
      expect(sessionCookiePolicyViolations(missingAccessTokenSameSite), writerPath)
        .toContain('accessToken.sameSite');
    }
  });

  it('writer의 명시적 local-loopback opt-in 또는 원 요청 판정이 빠지면 red가 된다', () => {
    for (const writerPath of SESSION_WRITERS) {
      const source = read(writerPath);
      const mutations = [
        source.replace(/shouldUseSecureSessionCookie\(\s*request,/gu, 'shouldUseSecureSessionCookie(request.nextUrl,'),
        source.replaceAll("process.env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true'", 'true'),
      ];
      for (const mutation of mutations) {
        expect(mutation, `${writerPath} mutation must change source`).not.toBe(source);
        expect(sessionCookiePolicyViolations(mutation), writerPath).toContain('secure-policy-call');
      }
    }
  });

  it('로그인과 공용 응답 writer는 응답 바디에 토큰을 싣지 않는다', () => {
    for (const path of ['src/app/api/auth/login/route.ts', 'src/lib/auth/auth-session-response.ts']) {
      expect(read(path), `${path}: 응답 바디에 토큰 노출 회귀`).not.toMatch(TOKEN_IN_JSON_DATA);
    }
    const writer = read('src/lib/auth/auth-session-response.ts');
    const exposed = writer.replace('role: token.role', 'accessToken: token.accessToken, role: token.role');
    expect(exposed, 'mutation must change the normal authentication JSON').not.toBe(writer);
    expect(exposed).toMatch(TOKEN_IN_JSON_DATA);
  });

  it('브라우저 코드: 토큰을 localStorage/sessionStorage 에 저장하지 않는다', () => {
    const files = collectSource(SRC);
    if (files.length < 50) {
      throw new Error(`게이트 무결성 파손: 소스 스캔(${files.length})이 하한 미만 — 경로 파손 의심.`);
    }
    const tokenStorage = /(local|session)Storage\.setItem\(\s*[`'"][^`'"]*(?:access[_-]?token|refresh[_-]?token|\baccessToken\b|\brefreshToken\b|\bjwt\b|bearer)/i;
    const offenders: string[] = [];
    for (const f of files) {
      if (tokenStorage.test(readFileSync(f, 'utf8'))) offenders.push(f.replace(SRC, 'src'));
    }
    expect(offenders, `토큰을 클라이언트 스토리지에 저장(XSS 탈취 표면) — HttpOnly 쿠키를 쓰세요:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('Proxy: role 을 서명검증된 JWT 에서 추출한다(위조 userRole 쿠키 불신)', () => {
    const proxy = read('src/proxy.ts');
    expect(proxy, 'JWT 서명검증(crypto.subtle.verify) 회귀 — 위조 토큰 통과 위험').toMatch(/crypto\.subtle\.verify/);
    // role 을 request.cookies.get('userRole') 처럼 직접 신뢰하면 위조 가능 — 금지
    expect(proxy, "위조 가능한 userRole 쿠키 직접 신뢰 회귀").not.toMatch(/cookies\.get\(\s*['"]userRole['"]/);
  });

  it('prod CSP: script-src 에 unsafe-eval 이 없다', () => {
    // [csp Phase 4 · 2026-08-20] CSP 단일 소스가 next.config.ts(정적 cspProd 리터럴)에서
    // src/proxy.ts 의 buildAppCsp(요청당 nonce)로 이관됐다. 판정축은 동일하게 유지하되
    // 새 소스에 재결속한다. unsafe-eval 은 dev 분기(isProd=false)에만 존재해야 한다.
    const proxy = read('src/proxy.ts');
    const bodyStart = proxy.indexOf('function buildAppCsp(');
    expect(bodyStart, 'buildAppCsp 정의를 찾지 못함(구조 변경?) — 추출이 깨지면 이 게이트는 vacuous 하다')
      .toBeGreaterThan(-1);
    const body = proxy.slice(bodyStart, proxy.indexOf('\n}', bodyStart));

    // prod 분기: `isProd ? A : B` 의 A(참 분기)에 unsafe-eval 이 없어야 한다.
    const prodBranch = body.match(/isProd\s*\?\s*`([^`]*)`/)?.[1] ?? null;
    expect(prodBranch, 'prod script-src 분기를 찾지 못함(구조 변경?)').not.toBeNull();
    expect(prodBranch!, 'prod CSP 에 unsafe-eval 부활 회귀').not.toContain('unsafe-eval');

    expect(body, "object-src 'none' 회귀").toContain("object-src 'none'");
    expect(body, "frame-ancestors 'none' 회귀").toContain("frame-ancestors 'none'");
  });
});
