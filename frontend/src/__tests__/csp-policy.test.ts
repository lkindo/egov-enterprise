import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * CSP 계약 (GAP-FE-001 Phase 4 — 요청별 nonce, 2026-08-20 제품 결정: PPR 포기).
 *
 * CSP 의 단일 소스는 src/proxy.ts 다. nonce 는 요청마다 달라야 하므로 next.config 의 정적
 * headers() 로는 만들 수 없고, 거기에 CSP 가 되살아나면 미들웨어 정책과 이중 소스가 되어
 * 어느 쪽이 이기는지가 배포 형상에 좌우된다. 이 계약은 다섯 방향을 고정한다:
 *   ① 앱 정책이 'self'+nonce 를 유지하고 script-src 에 'unsafe-inline'·'strict-dynamic' 이 없다
 *   ② Phase 2(script-src-attr 'none')가 앱·Atlas 양쪽 정책에서 유지된다
 *   ③ next.config.ts 에 CSP 가 재유입되지 않는다 (이중 소스 차단)
 *   ④ public/ 정적 HTML 에 inline 핸들러가 재유입되지 않는다
 *   ⑤ 정적 프리렌더가 되살아나지 않는다 (cacheComponents off + 루트 force-dynamic)
 *   ⑥ Next 밖 inline script(next-themes)로의 nonce 전파 배선이 유지된다 (x-nonce → prop)
 */
describe('CSP nonce 계약', () => {
  const proxySource = readFileSync(join(FRONTEND_DIR, 'src', 'proxy.ts'), 'utf8');
  const nextConfig = readFileSync(join(FRONTEND_DIR, 'next.config.ts'), 'utf8');

  /**
   * buildAppCsp 함수 본문을 **주석 제거 후** 추출한다.
   * 파일 전체 검색은 주석 문구에 속고(Phase 2 계약이 실제로 그렇게 뚫렸다), 본문 추출도
   * 주석을 안 지우면 '왜 strict-dynamic 을 안 쓰는가' 를 설명하는 주석이 부재 단언을 깨뜨린다
   * (이 파일을 만들며 실제로 발생 — 게이트가 자기 문서를 위반으로 신고).
   *
   * [2026-08-29] `//` 를 무조건 주석으로 보던 종전 스트리퍼는 **URL 의 `//` 까지 먹었다**.
   * `img-src 'self' https://evil.example blob: data:;` 를 넣어도 `https:` 뒤가 통째로
   * 사라져 외부 호스트 부재 단언이 통과했다(이 계약을 추가하며 red 실측 중 발견). 앞 문자가
   * `:` 가 아닐 때만 주석으로 본다 — 그래서 주석에 URL 을 쓰면 본문에 남으니, 주석에는
   * 호스트를 스킴 없이 적는다.
   */
  function extractFunctionBody(name: string): string {
    const start = proxySource.indexOf(`function ${name}(`);
    expect(start, `proxy.ts 에서 ${name} 을 찾지 못했습니다 — 추출이 깨지면 이 계약은 vacuous 합니다`).toBeGreaterThan(-1);
    const end = proxySource.indexOf('\n}', start);
    return proxySource
      .slice(start, end)
      .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
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

  /**
   * [2026-08-29] img-src 에 외부 호스트를 두지 않는다.
   *
   * 종전에는 `https://images.unsplash.com` 이 열려 있었는데, 그 유일한 소비자는 게시판
   * 생성 마법사 미리보기의 목 데이터 사진이었다. 사진을 걷어내면서 허용도 함께 걷었다.
   * 쓰지 않는 외부 출처를 CSP·remotePatterns 에 남겨 두면 정책이 실제 사용보다 넓다고
   * 말하는 셈이고, 다음 사람은 그 흔적을 "이미 승인된 출처"로 읽는다.
   *
   * 외부 이미지가 정말 필요해지면 이 계약을 갱신하면서 호스트와 사유를 같은 변경에 남긴다.
   */
  it('img-src 와 next/image remotePatterns 에 외부 호스트가 없다', () => {
    const body = extractFunctionBody('buildAppCsp');
    const imgSrc = body.slice(body.indexOf('img-src'), body.indexOf('font-src'));
    expect(imgSrc, "img-src 선언을 찾지 못했습니다 — 추출이 깨지면 이 계약은 vacuous 합니다").toContain('img-src');
    expect(
      imgSrc,
      'img-src 에 외부 호스트가 유입됐습니다 — 소비자와 사유를 같은 변경에서 밝히고 이 계약을 갱신하세요.',
    ).not.toMatch(/https?:\/\//);
    // next/image 의 remotePatterns 는 CSP 와 별개의 두 번째 허용 목록이다. 한쪽만 닫으면
    // 다른 한쪽이 열린 채로 남아 "닫았다"는 판단이 틀리게 된다.
    const remotePatterns = nextConfig.slice(nextConfig.indexOf('remotePatterns'));
    expect(
      remotePatterns.slice(0, remotePatterns.indexOf(']') + 1),
      'next/image remotePatterns 에 호스트가 등록됐습니다 — img-src 와 함께 판단하세요.',
    ).not.toContain('hostname');
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

  it('정적 프리렌더를 되살리지 않는다 — nonce CSP 는 전 페이지 동적 렌더가 전제다', () => {
    // 정적 셸(PPR)·정적 라우트의 HTML 은 빌드타임에 구워져 inline script 에 nonce 가 없다.
    // 런타임 CSP 는 요청마다 새 nonce 를 요구하므로 그 페이지는 통째로 차단된다
    // (2026-08-20 CI e2e 3샤드 실측: 05-public-experience 전 스펙 동일 실패).
    expect(
      nextConfig,
      'cacheComponents(PPR)가 다시 켜졌습니다 — 정적 셸의 inline script 는 nonce 가 없어 차단됩니다. ' +
        '되켜려면 nonce CSP 철회가 선행돼야 합니다.',
    ).toMatch(/cacheComponents:\s*false/);

    const layoutSource = readFileSync(join(FRONTEND_DIR, 'src', 'app', 'layout.tsx'), 'utf8');
    expect(
      layoutSource,
      "루트 layout 의 export const dynamic = 'force-dynamic' 이 사라졌습니다 — 현재는 layout 의 " +
        'cookies() 사용이 우연히 전 라우트를 동적으로 만들지만, 그 부수효과에 기대면 리팩터링 한 번에 ' +
        '정적 라우트가 조용히 부활해 해당 페이지가 CSP 로 전면 차단됩니다.',
    ).toMatch(/export const dynamic = 'force-dynamic'/);
  });

  it('next-themes inline script 로의 nonce 전파 배선이 유지된다 (x-nonce → ThemeProvider prop)', () => {
    // Next 의 자동 nonce 부착은 Next 가 생성하는 <script> 에만 미친다. next-themes 의 FOUC 방지
    // inline script 는 앱이 직접 넘긴 nonce prop 이 없으면 nonce 없이 렌더돼 그 스크립트만
    // 조용히 차단된다(2026-08-20 CI e2e 실측: sha256-J9cZ… 단일 해시가 전 페이지에서 차단,
    // 로컬 프로드 렌더의 inline 11개 중 유일한 무-nonce 스크립트로 해시 일치 확인).
    expect(
      proxySource,
      'proxy.ts 가 x-nonce 요청 헤더를 싣지 않으면 layout 이 nonce 를 읽을 수 없습니다.',
    ).toMatch(/requestHeaders\.set\('x-nonce', nonce\)/);

    const layoutSource = readFileSync(join(FRONTEND_DIR, 'src', 'app', 'layout.tsx'), 'utf8');
    expect(
      layoutSource,
      'layout 이 x-nonce 를 읽지 않습니다 — next-themes inline script 가 nonce 없이 렌더됩니다.',
    ).toMatch(/headers\(\)\)\.get\('x-nonce'\)/);
    expect(
      layoutSource,
      'ThemeProvider 에 nonce prop 이 전달되지 않습니다 — 테마 초기화 script 만 조용히 차단됩니다.',
    ).toMatch(/nonce=\{nonce\}/);
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
