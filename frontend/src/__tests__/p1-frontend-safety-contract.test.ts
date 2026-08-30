import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const readSource = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8');

function stripComments(source: string): string {
  return source.replace(/(^|[^:])\/\/[^\n]*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('P1 frontend safety source contract', () => {
  it('서버 데이터가 있는 핵심 화면은 mount 전용 gate로 첫 DOM을 버리지 않는다', () => {
    const dashboard = stripComments(readSource('app', 'UnifiedDashboardClient.tsx'));
    const navItem = stripComments(readSource('app', 'components', 'layout', 'NavItem.tsx'));
    const boardDetail = stripComments(
      readSource('app', 'admin', 'community', 'boards', 'detail', 'BoardDetailClient.tsx'),
    );

    for (const [name, source] of [
      ['UnifiedDashboardClient', dashboard],
      ['NavItem', navItem],
      ['BoardDetailClient', boardDetail],
    ] as const) {
      expect(source, `${name}: hydration 전용 mounted state가 다시 들어왔습니다`).not.toMatch(
        /\b(?:isMounted|mounted|setIsMounted|setMounted)\b/,
      );
    }

    expect(dashboard).not.toMatch(/if\s*\(\s*!isMounted/);
    expect(navItem).not.toMatch(/if\s*\(\s*!isMounted\s*\)\s*return\s+null/);
    expect(boardDetail).not.toMatch(/if\s*\(\s*!mounted/);
  });

  it('sidebar는 단일 semantic nav tree를 CSS로 반응형 전환한다', () => {
    const sidebar = stripComments(readSource('app', 'components', 'layout', 'sidebar.tsx'));

    expect(sidebar, 'viewport JS 분기가 재도입됐습니다').not.toContain('matchMedia(');
    expect(sidebar, '모바일 전용 메뉴 트리가 재도입됐습니다').not.toContain('MobileDomainNode');
    expect(sidebar.match(/topMenus\.map\(/g), '서비스 영역 목록은 DOM에 한 벌이어야 합니다')
      .toHaveLength(1);
    expect(sidebar.match(/menus\.map\(/g), '하위 메뉴 목록은 DOM에 한 벌이어야 합니다')
      .toHaveLength(1);
    expect(sidebar, '공유 nav tree를 viewport 추정값으로 inert 처리하면 안 됩니다')
      .not.toMatch(/<aside[^>]*\binert=/);
    expect(sidebar, '공유 nav tree를 viewport 추정값으로 aria-hidden 처리하면 안 됩니다')
      .not.toMatch(/<aside[^>]*\baria-hidden=/);
    expect(sidebar, '닫힌 모바일/상시 데스크톱 표현은 CSS visibility로 결정해야 합니다')
      .toContain('invisible -translate-x-full lg:visible lg:translate-x-0');
  });

  it('CSP report는 선언 길이를 stream reader보다 먼저 검사하고 전체 text buffering을 금지한다', () => {
    const route = stripComments(readSource('app', 'api', 'security', 'csp', 'route.ts'));
    const post = route.slice(route.indexOf('export async function POST'));
    const declaredLengthCheck = post.indexOf("headers.get('content-length')");
    const streamReadCall = post.indexOf('readBodyWithinLimit(request)');

    expect(declaredLengthCheck).toBeGreaterThanOrEqual(0);
    expect(streamReadCall).toBeGreaterThan(declaredLengthCheck);
    expect(route).not.toContain('request.text()');
    expect(route).not.toMatch(/['"]sample['"]\s*:/);
  });

  it('SecurityHub 전체교체 저장은 query revision이 임시 기준선에 반영된 뒤에만 활성화된다', () => {
    const hub = stripComments(
      readSource('app', 'admin', 'security', 'authority', 'SecurityHubClient.tsx'),
    );

    for (const mapping of ['user', 'menu', 'role'] as const) {
      const capitalized = `${mapping[0].toUpperCase()}${mapping.slice(1)}`;
      expect(hub).toContain(
        `${mapping}MappingRevision === ${mapping}MappingQueryRevision`,
      );
      expect(hub).toContain(
        `set${capitalized}MappingRevision(${mapping}MappingQueryRevision)`,
      );
    }
  });
});
