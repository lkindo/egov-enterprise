// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

const SRC = join(process.cwd(), 'src');
const readSource = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8');
/** 주석을 뺀 코드 — 공용 판정(scripts/code-without-comments.mjs)이 문자열은 두고 주석만 지운다. */
const readCode = (...parts: string[]) => codeWithoutComments(readSource(...parts), parts[parts.length - 1]);

/** hydration 전용 mount gate 의 이름 — 첫 DOM 을 버리고 마운트 뒤에 다시 그리는 상태다. */
const MOUNT_GATE = /\b(?:isMounted|mounted|setIsMounted|setMounted)\b/;

/** 한 파일에서 mount gate 이름이 있는 줄 번호(1부터). 주석 속 언급은 세지 않는다. */
function mountGateLines(source: string, fileName: string): number[] {
  return codeWithoutComments(source, fileName).split('\n')
    .flatMap((line, index) => (MOUNT_GATE.test(line) ? [index + 1] : []));
}

/** 데이터 조합용 map은 DOM이 아니다. JSX 렌더 표현식의 반복만 정확히 한 벌인지 검사한다. */
function requireOneRenderedMap(source: string, collection: string): void {
  const file = ts.createSourceFile('sidebar.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let count = 0;
  const visit = (node: ts.Node, inJsx = false) => {
    const rendered = inJsx || ts.isJsxExpression(node);
    if (rendered && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'map' && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === collection) count++;
    ts.forEachChild(node, (child) => visit(child, rendered));
  };
  visit(file);
  if (count !== 1) throw new Error(`${collection}: rendered map count must be 1 (actual ${count})`);
}

describe('P1 frontend safety source contract', () => {
  it('서버 데이터가 있는 화면은 mount 전용 gate로 첫 DOM을 버리지 않는다 — src 전수 0 고정', () => {
    /*
     * 종전에는 손으로 고른 파일 두 벌(업무 홈·NavItem·게시글 상세·홈 기여 모듈 / P2 의 게시판 목록·필터·알림 드로어·헤더)만 봤다.
     * 목록 밖 새 화면은 gate 를 자유롭게 들일 수 있었다(FE-CONTRACT-08). 생산 소스 전수에서 0 이 이미 성립하므로 전수로 고정한다.
     */
    const files = productionSourceFiles(SRC, ['.ts', '.tsx', '.jsx']);
    expect(files.length, '생산 소스를 찾지 못했다 — 가드가 공허하다').toBeGreaterThan(50);
    const offenders = files.flatMap((file) => mountGateLines(readFileSync(file, 'utf8'), file)
      .map((line) => `${relative(SRC, file).split('\\').join('/')}:${line}`));
    expect(offenders, 'hydration 전용 mounted state 가 다시 들어왔습니다 — 첫 DOM 을 SSR 결과 그대로 두고 CSS 로 전환하세요').toEqual([]);
  });

  it('mount gate 판정 — 문자열 속 주석 기호 뒤의 gate 도 잡고 주석 속 언급은 세지 않는다', () => {
    const source = [
      "const accept = 'image/*';",
      'const [mounted, setMounted] = useState(false);',
      'useEffect(() => setMounted(true), []);',
      'if (!mounted) return null;',
      '// keep its header challenge mounted while hiding home data.',
      '/* isMounted 는 쓰지 않는다 */',
    ].join('\n');
    expect(mountGateLines(source, 'Screen.tsx')).toEqual([2, 3, 4]);
  });

  it('sidebar는 단일 semantic nav tree를 CSS로 반응형 전환한다', () => {
    const sidebar = readCode('app', 'components', 'layout', 'sidebar.tsx');

    expect(sidebar, 'viewport JS 분기가 재도입됐습니다').not.toContain('matchMedia(');
    expect(sidebar, '모바일 전용 메뉴 트리가 재도입됐습니다').not.toContain('MobileDomainNode');
    expect(() => requireOneRenderedMap(sidebar, 'topMenus'), '서비스 영역 목록은 DOM에 한 벌이어야 합니다').not.toThrow();
    expect(() => requireOneRenderedMap(sidebar, 'menus'), '하위 메뉴 목록은 DOM에 한 벌이어야 합니다').not.toThrow();
    expect(sidebar, '공유 nav tree를 viewport 추정값으로 inert 처리하면 안 됩니다')
      .not.toMatch(/<aside[^>]*\binert=/);
    expect(sidebar, '공유 nav tree를 viewport 추정값으로 aria-hidden 처리하면 안 됩니다')
      .not.toMatch(/<aside[^>]*\baria-hidden=/);
    expect(sidebar, '닫힌 모바일/상시 데스크톱 표현은 CSS visibility로 결정해야 합니다')
      .toContain('invisible -translate-x-full lg:visible lg:translate-x-0');
  });

  it('데이터 준비 map은 허용하지만 중복 JSX 메뉴와 메뉴 DOM 누락은 거부한다', () => {
    const preparation = 'const prepared = topMenus.map(menu => ({ ...menu, children: [] }));';
    const one = '<nav>{topMenus.map(menu => <button>{menu.name}</button>)}</nav>';
    expect(() => requireOneRenderedMap(`${preparation} const view = ${one};`, 'topMenus')).not.toThrow();
    expect(() => requireOneRenderedMap(`const view = <>${one}${one}</>;`, 'topMenus')).toThrow('actual 2');
    expect(() => requireOneRenderedMap(preparation, 'topMenus')).toThrow('actual 0');
  });

  it('CSP report는 선언 길이를 stream reader보다 먼저 검사하고 전체 text buffering을 금지한다', () => {
    const route = readCode('app', 'api', 'security', 'csp', 'route.ts');
    const post = route.slice(route.indexOf('export async function POST'));
    const declaredLengthCheck = post.indexOf("headers.get('content-length')");
    const streamReadCall = post.indexOf('readBodyWithinLimit(request)');

    expect(declaredLengthCheck).toBeGreaterThanOrEqual(0);
    expect(streamReadCall).toBeGreaterThan(declaredLengthCheck);
    expect(route).not.toContain('request.text()');
    expect(route).not.toMatch(/['"]sample['"]\s*:/);
  });

  it('SecurityHub 전체교체는 전체 조회와 편집 기준선 version이 현재 응답에 일치해야 활성화된다', () => {
    for (const component of ['AuthorizationGroupEditor', 'AuthorizationMembershipEditor']) {
      const source = readCode('app', 'admin', 'security', 'authority', 'components', `${component}.tsx`);
      expect(source).toContain('baseline.version === snapshot.version');
      expect(source).toContain('currentBaseline && complete');
      expect(source).toContain('setBaseline(snapshot)');
      expect(source).toContain('version: baseline.version, complete: true');
      expect(source).toContain('pendingRef.current');
    }
  });
});
