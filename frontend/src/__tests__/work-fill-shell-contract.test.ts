/**
 * 업무면 fill 셸 계약(2026-10-05, 카탈로그 §4 'fill 셸').
 *
 * fill 셸의 약속은 '페이지 스크롤 0 · 주 스크롤 영역 하나'다. 그 약속은 세 곳이 같은 값을 써야만 참이다 —
 *   ① globals.css 의 `--work-fill-height` 식, ② ApplicationFrame 의 본문 최소 높이 식과 lg 패딩, ③ 조건을 정하는
 *   `@custom-variant work-fill` 한 곳. 하나가 어긋나면(예: 푸터 몫을 한쪽만 바꿈) 셸이 본문보다 커져 페이지가 다시 스크롤하거나
 *   아래가 비는데, jsdom 은 레이아웃을 재지 않아 단위 테스트가 그 변화를 보지 못한다. 그래서 식의 결속을 소스로 고정한다.
 *
 * [2026-10-05 푸터 숨김] fill 셸이 있는 화면은 같은 조건에서 푸터를 숨기고 푸터 몫(--app-footer-reserve)을 0 으로 돌린다 — 두 식이
 *   같은 토큰을 쓰므로 함께 5rem 늘어 페이지 스크롤 0 이 유지된다. 숨김은 셸 루트의 `data-work-fill` 표지와 ApplicationFrame 의
 *   `data-app-footer` 자리를 :has() 로 잇는 CSS 두 규칙뿐이다. 표지를 빠뜨린 fill 루트는 푸터가 남고 셸이 5rem 짧아지며, fill 이
 *   아닌 곳의 표지는 일반 화면의 푸터를 지운다 — 둘 다 소스로 막는다.
 *
 * 조건은 matchMedia 가 아니라 CSS 미디어쿼리다(ADR-0006). 셸·표는 그 변형을 쓰는 클래스만 갖고 조건을 다시 정의하지 않는다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripTsComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/** 생산 소스(.ts·.tsx, 테스트 제외) 전수. */
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('업무면 fill 셸 계약', () => {
  const globals = stripCssComments(read('app/globals.css'));
  const frame = read('app/components/layout/ApplicationFrame.tsx');

  it('조건은 globals.css 의 work-fill 변형 한 곳이 정한다(폭 lg 이상 · 높이 600px 이상 · screen)', () => {
    const variants = globals.match(/@custom-variant work-fill [^;]+;/g) ?? [];
    expect(variants).toEqual(['@custom-variant work-fill (@media screen and (min-width: 64rem) and (min-height: 600px));']);
  });

  it('셸 높이는 본문 최소 높이 식에서 lg 패딩 위아래만 뺀 값이다(두 식이 같은 푸터 몫 토큰을 써 페이지 스크롤 0)', () => {
    const rootBlock = globals.match(/:root \{([^}]*)\}/)?.[1] ?? '';
    expect(rootBlock).toMatch(/--app-footer-reserve:\s*5rem;/);
    expect(rootBlock).toMatch(
      /--work-fill-height:\s*calc\(100dvh - var\(--app-header-height\) - var\(--app-footer-reserve\) - 2 \* var\(--page-pad-lg\)\);/,
    );
    // 본문 상자가 같은 두 토큰으로 최소 높이를 잡고, lg 에서 같은 패딩 토큰을 쓴다.
    expect(frame).toContain('min-h-[calc(100dvh-var(--app-header-height)-var(--app-footer-reserve))]');
    expect(frame).toContain('lg:p-[var(--page-pad-lg)]');
  });

  it('fill 화면의 푸터 숨김은 work-fill 조건 안의 CSS 두 규칙뿐이다(조건 밖·인쇄·fill 아닌 화면은 그대로)', () => {
    // 조건은 위 변형을 그대로 쓴다(@variant work-fill — 미디어쿼리를 다시 쓰지 않는다). 그 변형이 screen 조건이라 인쇄는 제외된다.
    const flat = globals.replace(/\s+/g, ' ');
    expect(flat).toContain(':root:has([data-work-fill]) { @variant work-fill { --app-footer-reserve: 0px; } }');
    expect(flat).toContain(':root:has([data-work-fill]) [data-app-footer] { @variant work-fill { display: none; } }');
    // 표지·푸터 자리·푸터 몫 선언은 위 두 규칙과 :root 기본값(5rem) 밖에 없다 — 조건 없이 푸터를 숨기거나 몫을 바꾸는 규칙이 없다.
    expect(flat.match(/data-work-fill/g), 'data-work-fill 을 보는 규칙이 더 있다').toHaveLength(2);
    expect(flat.match(/data-app-footer/g), 'data-app-footer 를 보는 규칙이 더 있다').toHaveLength(1);
    expect(flat.match(/--app-footer-reserve\s*:/g), '푸터 몫을 다시 정하는 선언이 더 있다').toHaveLength(2);
    // 숨기는 대상은 ApplicationFrame 의 푸터 자리 하나다 — 렌더는 가르지 않고(언마운트 금지) 같은 자리에 늘 그린다.
    expect(frame).toContain('<div data-app-footer="">{footer}</div>');
    expect(frame.match(/\{footer\}/g)).toHaveLength(1);
    expect(stripTsComments(frame), 'ApplicationFrame 이 fill 여부·조건을 스스로 판정한다').not.toMatch(/matchMedia|work-fill|data-work-fill/);
  });

  it('fill 루트 클래스를 쓰는 요소는 data-work-fill 표지를 함께 달고, 표지는 fill 루트에만 있다', () => {
    // 표지가 빠지면 그 화면은 푸터가 남고 셸이 5rem 짧아진다(불러오는 동안의 자리였다면 본 화면으로 바뀔 때 튄다).
    // 표지가 fill 아닌 요소에 붙으면 일반 화면의 푸터가 사라진다. 그래서 한 요소 안에서 둘이 짝을 이루는지 센다.
    const owners: string[] = [];
    for (const file of listSourceFiles(SRC)) {
      const path = relative(SRC, file).split(sep).join('/');
      if (path === 'app/components/patterns/work-fill.ts') continue;
      const source = stripTsComments(readFileSync(file, 'utf8'));
      const imports = [...source.matchAll(/^import\b[\s\S]*?\bfrom\s*['"][^'"]+['"];?/gm)]
        .map((match) => [match.index!, match.index! + match[0].length] as const);
      const uses = [...source.matchAll(/\bWORK_FILL_ROOT_CLASS\b/g)]
        .filter((match) => !imports.some(([start, end]) => match.index! >= start && match.index! < end));
      const markers = source.match(/\bdata-work-fill=/g) ?? [];
      if (uses.length === 0 && markers.length === 0) continue;
      owners.push(path);
      expect(markers.length, `${path}: fill 루트 수(${uses.length})와 data-work-fill 표지 수(${markers.length})가 다르다`).toBe(uses.length);
      for (const use of uses) {
        const tag = source.slice(source.lastIndexOf('<', use.index!), use.index!);
        expect(tag, `${path}: fill 루트 요소에 data-work-fill 표지가 없다`).toMatch(/\bdata-work-fill=/);
      }
    }
    // 실제 소비처 — 두 셸과 메뉴 화면의 불러오는 동안의 자리. 늘거나 줄면 표지 동반을 확인하고 여기를 고친다.
    expect(owners.sort()).toEqual([
      'app/admin/system/menus/page.tsx',
      'app/components/patterns/master-detail-page.tsx',
      'app/components/patterns/work-list-page.tsx',
    ]);
  });

  it('공용 클래스는 모두 work-fill 변형(또는 인쇄)으로만 동작해 조건 밖의 기본 배치를 바꾸지 않는다', () => {
    const fillModule = stripTsComments(read('app/components/patterns/work-fill.ts'));
    const classStrings = [...fillModule.matchAll(/export const (WORK_FILL_[A-Z_]+) = '([^']+)';/g)];
    expect(classStrings.map(([, name]) => name).sort()).toEqual([
      'WORK_FILL_CONTENT_CLASS', 'WORK_FILL_PANE_CHAIN_CLASS', 'WORK_FILL_PANE_PRINT_CLASS', 'WORK_FILL_REGION_CLASS',
      'WORK_FILL_ROOT_CLASS', 'WORK_FILL_SCROLL_CLASS',
    ]);
    // 셸이 각자 두는 지역 상수(MasterDetailPage 작업 영역·칸 머리 압축·WorkListPage 콘텐츠 영역)도 같은 규칙이다.
    // [2026-10-05 통합] MasterDetailPage 의 fill 지역 상수는 이름 하나를 집는 대신 전부 모아 exact 로 센다 — 2차 리뷰 반영으로
    //   칸 머리·도구 줄·넓은 마스터 폭 상수가 늘었는데 이 검사가 LAYOUT 하나만 보아, 접두 없는 토큰이 들어와도 green 이었다.
    //   상수를 더하거나 걷으면 아래 목록을 같은 변경에서 고친다.
    const masterDetail = stripTsComments(read('app/components/patterns/master-detail-page.tsx'));
    const masterDetailStrings = [...masterDetail.matchAll(/const (WORK_FILL_[A-Z_]+_CLASS) = '([^']+)';/g)];
    expect(masterDetailStrings.map(([, name]) => name).sort()).toEqual([
      'WORK_FILL_INLINE_DESCRIPTION_CLASS', 'WORK_FILL_LAYOUT_CLASS', 'WORK_FILL_PANE_BODY_CLASS', 'WORK_FILL_PANE_HEAD_CLASS',
      'WORK_FILL_PANE_HEAD_ROW_CLASS', 'WORK_FILL_PANE_TOOLS_CLASS', 'WORK_FILL_STACK_CLASS', 'WORK_FILL_TITLE_ROW_CLASS',
      'WORK_FILL_WIDE_TRACK_CLASS',
    ]);
    const localStrings = [
      ...masterDetailStrings.map(([, name, value]) => [`MasterDetailPage ${name}`, value] as const),
      ['WorkListPage WORK_LIST_CONTENT_FLEX_CLASS', stripTsComments(read('app/components/patterns/work-list-page.tsx')).match(/const WORK_LIST_CONTENT_FLEX_CLASS = '([^']+)';/)?.[1]] as const,
    ];
    for (const [name, value] of [...classStrings.map(([, name, value]) => [name, value] as const), ...localStrings]) {
      expect(value, `${name} 를 찾지 못했습니다`).toBeTruthy();
      for (const token of value!.split(/\s+/)) {
        expect(token, `${name} 의 ${token} 은 조건 없이 적용된다 — 기본 배치를 바꾼다`).toMatch(/^(?:work-fill|print):/);
      }
    }
  });

  /*
    무너질 때의 동작(2026-10-05 Chromium 실측 — 반박 리뷰 major 3·4). jsdom 은 레이아웃을 재지 않으므로 그 실측이 의존하는
    클래스 성질을 고정한다. 하나라도 되돌리면 실측에서 아래 결함이 다시 난다.
  */
  it('셸 루트는 고정 높이가 아니라 최소 높이다(낮은 창에서 내용이 푸터를 덮지 않고 페이지가 스크롤한다)', () => {
    const fillModule = stripTsComments(read('app/components/patterns/work-fill.ts'));
    const root = fillModule.match(/export const WORK_FILL_ROOT_CLASS = '([^']+)';/)?.[1] ?? '';
    expect(root.split(/\s+/)).toContain('work-fill:min-h-[var(--work-fill-height)]');
    // 고정 height 였을 때 실측: 머리가 길면 작업 영역이 0px 로 줄고 넘친 내용이 푸터 아래로 그려졌다.
    expect(root, '셸 루트에 고정 height 가 있다').not.toMatch(/work-fill:h-\[/);
  });

  it('작업 영역은 기준 0px·바닥값·안전판(relative·overflow-y-auto·포커스 링 여백)을 갖는다', () => {
    const fillModule = stripTsComments(read('app/components/patterns/work-fill.ts'));
    const content = (fillModule.match(/export const WORK_FILL_CONTENT_CLASS = '([^']+)';/)?.[1] ?? '').split(/\s+/);
    // flex-1(0%)은 루트 높이가 확정되지 않은 세로 flex 에서 내용 크기로 취급돼 페이지가 다시 스크롤한다(실측 244px).
    expect(content).toContain('work-fill:flex-[1_1_0px]');
    expect(content).not.toContain('work-fill:flex-1');
    expect(content).toContain('work-fill:min-h-[12rem]');
    // 사슬이 끊기면 넘친 내용이 푸터를 덮는 대신 작업 영역이 스크롤한다. 스크롤 상자이므로 안쪽 sr-only 를 가두는 relative 도 필수다.
    expect(content).toEqual(expect.arrayContaining(['work-fill:overflow-y-auto', 'work-fill:relative', 'work-fill:-m-1', 'work-fill:p-1']));
  });

  it('주 스크롤 영역은 조건 안에서도 상한(셸 높이)과 바닥값을 둔다(사슬이 끊겨도 안쪽에서 스크롤, 0px 로 줄지 않음)', () => {
    const fillModule = stripTsComments(read('app/components/patterns/work-fill.ts'));
    const scroll = (fillModule.match(/export const WORK_FILL_SCROLL_CLASS = '([^']+)';/)?.[1] ?? '').split(/\s+/);
    expect(scroll).toContain('work-fill:max-h-[var(--work-fill-height)]');
    expect(scroll, 'max-h-none 이면 사슬이 끊길 때 상자가 내용 높이로 커져 고정 머리글·안쪽 스크롤이 조용히 사라진다').not.toContain('work-fill:max-h-none');
    expect(scroll).toContain('work-fill:min-h-[6rem]');
    expect(scroll).toEqual(expect.arrayContaining(['print:max-h-none', 'print:overflow-visible']));
  });

  it('셸·표·권한 상자는 공용 클래스를 쓰고 조건을 스스로 다시 정의하지 않는다', () => {
    for (const path of [
      'app/components/patterns/master-detail-page.tsx',
      'app/components/patterns/work-list-page.tsx',
      'app/components/ui/standard-data-table.tsx',
      'app/admin/security/authority/components/PermissionScrollRegion.tsx',
    ]) {
      const source = stripTsComments(read(path));
      expect(source, `${path} 가 공용 fill 클래스를 쓰지 않습니다`).toMatch(/from ['"](?:\.\/work-fill|@\/app\/components\/patterns\/work-fill)['"]/);
      expect(source, `${path} 가 fill 조건을 직접 정의합니다`).not.toMatch(/matchMedia|\[@media|min-height:\s*600px/);
    }
  });
});
