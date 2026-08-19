import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * CSP 계약 (GAP-FE-001 Phase 4 — nonce + strict-dynamic, 2026-08-20 제품 결정: PPR 포기).
 *
 * CSP 의 단일 소스는 src/proxy.ts 다. nonce 는 요청마다 달라야 하므로 next.config 의 정적
 * headers() 로는 만들 수 없고, 거기에 CSP 가 되살아나면 미들웨어 정책과 이중 소스가 되어
 * 어느 쪽이 이기는지가 배포 형상에 좌우된다. 이 계약은 네 방향을 고정한다:
 *   ① 앱 정책이 nonce+strict-dynamic 을 유지하고 script-src 에 'unsafe-inline' 이 없다
 *   ② Phase 2(script-src-attr 'none')가 앱·Atlas 양쪽 정책에서 유지된다
 *   ③ next.config.ts 에 CSP 가 재유입되지 않는다 (이중 소스 차단)
 *   ④ public/ 정적 HTML 에 inline 핸들러가 재유입되지 않는다
 */
describe('CSP nonce 계약', () => {
  const proxySource = readFileSync(join(FRONTEND_DIR, 'src', 'proxy.ts'), 'utf8');
  const nextConfig = readFileSync(join(FRONTEND_DIR, 'next.config.ts'), 'utf8');

  /**
   * buildAppCsp 함수 본문을 **주석 제거 후** 추출한다.
   * 파일 전체 검색은 주석 문구에 속고(Phase 2 계약이 실제로 그렇게 뚫렸다), 본문 추출도
   * 주석을 안 지우면 '왜 strict-dynamic 을 안 쓰는가' 를 설명하는 주석이 부재 단언을 깨뜨린다
   * (이 파일을 만들며 실제로 발생 — 게이트가 자기 문서를 위반으로 신고).
   */
  function extractFunctionBody(name: string): string {
    const start = proxySource.indexOf(`function ${name}(`);
    expect(start, `proxy.ts 에서 ${name} 을 찾지 못했습니다 — 추출이 깨지면 이 계약은 vacuous 합니다`).toBeGreaterThan(-1);
    const end = proxySource.indexOf('\n}', start);
    return proxySource
      .slice(start, end)
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  it("앱 정책은 'self'+nonce 이고 script-src 에 'unsafe-inline'·'strict-dynamic' 이 없다", () => {
    const body = extractFunctionBody('buildAppCsp');
    expect(body).toContain("'nonce-${nonce}'");
    // strict-dynamic 은 재도입 금지 — host 허용('self')을 꺼서 Next 가 스트리밍 중 삽입하는
    // nonce 없는 lazy chunk <script src> 를 차단, 앱이 전면 파손된다(CI run 32310837353 실측).
    expect(
      body,
      "strict-dynamic 이 재도입됐습니다 — Next lazy chunk 로드가 전면 차단됩니다(CI 32310837353).",
    ).not.toContain("'strict-dynamic'");
    expect(body, "script-src-attr 'none' (Phase 2) 는 nonce 전환 후에도 유지돼야 합니다").toContain("script-src-attr 'none'");
    // script-src 선언부에 unsafe-inline 이 없어야 한다. style-src 의 unsafe-inline 은
    // React style prop 때문에 의도적으로 남는다(Phase 3 별건) — 그래서 함수 전체가 아니라
    // scriptSrc 조립부만 본다.
    const scriptSrcSection = body.slice(0, body.indexOf('style-src'));
    expect(
      scriptSrcSection,
      "script-src 에 'unsafe-inline' 이 되살아났습니다 — nonce 가 있으면 브라우저가 무시하지만, " +
        'nonce 생성이 깨졌을 때 조용한 폴백이 되어 회귀를 숨깁니다.',
    ).not.toContain("'unsafe-inline'");
  });

  it("Atlas 예외 정책은 elem inline 을 허용하되 attr 'none' 을 유지하며, 예외 경로는 정확히 하나다", () => {
    const atlasPolicy = proxySource.match(/const ATLAS_CSP =\s*((?:`[^`]*`|'[^']*'|"[^"]*"|[\s+])+);/)?.[1] ?? '';
    expect(atlasPolicy, 'proxy.ts 에서 ATLAS_CSP 리터럴을 찾지 못했습니다').toBeTruthy();
    expect(atlasPolicy).toContain("script-src 'self' 'unsafe-inline'");
    expect(atlasPolicy).toContain("script-src-attr 'none'");

    // 예외가 늘어나는 것 자체가 회귀다 — ATLAS_CSP 를 참조하는 분기는 정확히 1개여야 한다.
    const usages = proxySource.match(/ATLAS_CSP/g) ?? [];
    expect(usages.length, 'ATLAS_CSP 선언 1 + 사용 1 = 2 를 넘으면 예외 경로가 확산된 것입니다').toBe(2);
  });

  it('next.config.ts 에 Content-Security-Policy 가 재유입되지 않는다', () => {
    // 주석 언급은 허용하고, 헤더 객체로 실리는 형태만 차단한다.
    expect(
      nextConfig,
      'CSP 는 src/proxy.ts 가 단일 소스입니다. next.config 에 되살리면 이중 소스가 됩니다.',
    ).not.toMatch(/key:\s*['"]Content-Security-Policy['"]/);
  });

  it('public/ 정적 HTML 에 inline 이벤트 핸들러가 없다', () => {
    const publicDir = join(FRONTEND_DIR, 'public');
    const htmlFiles = readdirSync(publicDir).filter((name) => name.endsWith('.html'));
    expect(htmlFiles.length, 'public/ HTML 스캔이 비면 이 계약은 vacuous 하다').toBeGreaterThan(0);

    const offenders = htmlFiles.flatMap((name) => {
      const source = readFileSync(join(publicDir, name), 'utf8');
      return [...source.matchAll(/\son(?:click|change|submit|load|input|mouseover|focus|blur|keydown|keyup)\s*=/gi)]
        .map((match) => ({
          file: name,
          line: source.slice(0, match.index).split('\n').length,
        }));
    });

    expect(
      offenders,
      [
        "script-src-attr 'none' 아래에서 inline 핸들러는 조용히 죽습니다. addEventListener 로 배선하십시오:",
        ...offenders.map(({ file, line }) => `  public/${file}:${line}`),
      ].join('\n'),
    ).toEqual([]);
  });
});
