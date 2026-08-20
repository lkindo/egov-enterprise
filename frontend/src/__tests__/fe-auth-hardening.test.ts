import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔒 FE 인증 하드닝 회귀 방지 게이트 — quality-score §2.F / FE auth 아키텍처.
 *
 * FE 인증은 (1) accessToken=HttpOnly·Secure·SameSite 쿠키 (2) localStorage 토큰 저장 금지
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

describe('🔒 FE 인증 하드닝 회귀 방지 게이트 (§2.F)', () => {
  it('로그인 라우트: accessToken 은 HttpOnly·Secure·SameSite 쿠키로 설정된다', () => {
    const login = read('src/app/api/auth/login/route.ts');
    // accessToken 쿠키 설정 블록에 httpOnly:true 가 있어야 한다
    expect(login, 'accessToken 쿠키 설정 부재').toMatch(/cookies\.set\(\s*['"]accessToken['"]/);
    expect(login, 'httpOnly:true 회귀 — accessToken 이 JS 접근 가능해짐').toMatch(/httpOnly:\s*true/);
    expect(login, 'sameSite 회귀').toMatch(/sameSite:\s*['"](strict|lax)['"]/);
    expect(login, 'secure 플래그 회귀').toMatch(/secure:/);
    // 응답 바디에 accessToken 을 실어 반환하면 안 된다(role 만)
    expect(login, '응답 바디에 accessToken 노출 회귀').not.toMatch(/data:\s*\{[^}]*accessToken/);
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
