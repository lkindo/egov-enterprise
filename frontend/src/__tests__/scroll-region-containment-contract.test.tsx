/**
 * 스크롤 영역 위치 지정 계약(2026-10-05).
 *
 * 왜: 위치 지정(position)이 없는 스크롤 상자 안의 `sr-only`(position:absolute) 요소는 기준 상자가 상자 **바깥**(앱 프레임의
 * `relative` 루트)이 된다. 그러면 상자의 overflow 가 그 요소를 잘라 내지 못하고, 요소가 내용 속 제자리(정적 위치)에 놓여 문서
 * 스크롤 범위를 늘린다. 2026-10-04 격리 e2e 실측에서 내용이 끝난 뒤에도 빈 화면으로 메뉴 관리 1,079~2,790px, 권한 '화면별
 * 권한' 1,155~1,625px 를 더 스크롤했고 1366 폭에서는 가로로 71px 넘쳤다. 셀·카드마다 sr-only 를 두는 화면(권한 표·메뉴 보드)
 * 에서만 났고, 이미 `relative` 인 StandardDataTable 상자와 셀 sr-only 가 없는 기능별 권한 표에는 없었다(대조군).
 *
 * 무엇을: 공용 스크롤 상자가 `relative` 를 갖는다는 사실을 **렌더 결과**로 고정한다. jsdom 은 레이아웃을 계산하지 않으므로
 * 기준 상자 자체는 잴 수 없다 — 클래스가 jsdom 에서 검증할 수 있는 가장 가까운 증거다. 넘침 측정 훅(`useOverflowRegion`)을
 * 쓰는 모든 상자는 소스 AST 로도 센다 — 새 스크롤 상자가 relative 없이 들어오면 red 다.
 *
 * 끌기 오버레이(dnd-kit DragOverlay)는 document.body 로 포털돼 position:fixed 라 이 변경과 무관하다(MenuBoard·공통코드 확인).
 */
import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { PermissionScrollRegion } from '@/app/admin/security/authority/components/PermissionScrollRegion';
import { ComparisonScrollRegion } from '@/app/admin/security/authority/components/GroupComparison';
import { DetailScrollArea } from '@/app/admin/user/UserOrgHubParts';

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

const SRC_DIR = join(process.cwd(), 'src');

function expectContained(element: HTMLElement | null, name: string) {
  expect(element, `${name} 을(를) 찾지 못했습니다 — 계약이 빈 검사가 됩니다`).not.toBeNull();
  const tokens = element!.className.split(/\s+/);
  expect(tokens.some((token) => /^overflow(?:-[xy])?-(?:auto|scroll)$/.test(token)), `${name} 은(는) 스크롤 상자가 아닙니다`).toBe(true);
  expect(tokens, `${name} 에 relative 가 없습니다 — 안쪽 sr-only 가 상자에 잘리지 않고 문서 높이를 늘립니다`).toContain('relative');
}

describe('공용 스크롤 상자는 position: relative 다 (렌더 결과)', () => {
  it.each([false, true])('MasterDetailPage 의 마스터·상세 칸 (fill=%s)', (fill) => {
    render(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 구조"
        master={<button type="button" data-a2-master-item aria-current="true">메뉴<span className="sr-only">설명</span></button>}
        detail={<p>상세</p>}
        fill={fill}
      />,
    );
    expectContained(screen.getByTestId('master-detail-master'), '마스터 칸');
    expectContained(screen.getByTestId('master-detail-detail'), '상세 칸');
  });

  it.each([false, true])('PermissionScrollRegion (fill=%s)', (fill) => {
    const { container } = render(
      <PermissionScrollRegion label="화면별 권한 표 스크롤 영역" fill={fill}><table><tbody><tr><td>칸</td></tr></tbody></table></PermissionScrollRegion>,
    );
    expectContained(container.firstElementChild as HTMLElement, 'PermissionScrollRegion');
  });

  it('ComparisonScrollRegion(그룹 비교)', () => {
    const { container } = render(<ComparisonScrollRegion label="비교 표 스크롤 영역"><p>표</p></ComparisonScrollRegion>);
    expectContained(container.firstElementChild as HTMLElement, 'ComparisonScrollRegion');
  });

  it('DetailScrollArea(사용자·조직 상세)', () => {
    const { container } = render(<DetailScrollArea><p>상세</p></DetailScrollArea>);
    expectContained(container.firstElementChild as HTMLElement, 'DetailScrollArea');
  });

  it.each([false, true])('StandardDataTable 스크롤 상자 (fillHeight=%s, 대조군)', (fillHeight) => {
    const { container } = render(
      <StandardDataTable columns={[{ header: '이름', accessor: 'name' }]} data={[{ id: 1, name: '홍길동' }]} keyField="id" fillHeight={fillHeight} />,
    );
    expectContained(container.querySelector('[data-slot="standard-data-table-scroll-region"]'), 'StandardDataTable 스크롤 상자');
  });

  it('공용 Table 컨테이너 (대조군)', () => {
    const { container } = render(<Table><TableBody><TableRow><TableCell>칸</TableCell></TableRow></TableBody></Table>);
    expectContained(container.querySelector('[data-slot="table-container"]'), 'Table 컨테이너');
  });
});

/* ── 소스 AST: useOverflowRegion 으로 넘침을 재는 상자는 모두 relative 다 ─────────────────────────────── */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [full] : [];
  });
}

/** 식 안의 문자열 조각을 모은다(문자열·템플릿·cn(...) 인자·삼항·같은 파일의 const 참조). */
function classLiterals(node: ts.Node, consts: Map<string, ts.Expression>, seen = new Set<string>()): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  if (ts.isIdentifier(node)) {
    const init = consts.get(node.text);
    if (!init || seen.has(node.text)) return [];
    seen.add(node.text);
    return classLiterals(init, consts, seen);
  }
  const out: string[] = [];
  node.forEachChild((child) => { out.push(...classLiterals(child, consts, seen)); });
  return out;
}

interface RegionSite { file: string; line: number; tokens: string[] }

function overflowRegionSites(): RegionSite[] {
  const sites: RegionSite[] = [];
  for (const file of sourceFiles(SRC_DIR)) {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('useOverflowRegion')) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const consts = new Map<string, ts.Expression>();
    const regionVars = new Set<string>();
    const visitDecl = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        consts.set(node.name.text, node.initializer);
        const init = node.initializer;
        if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'useOverflowRegion') {
          regionVars.add(node.name.text);
        }
      }
      node.forEachChild(visitDecl);
    };
    visitDecl(sf);
    const visitJsx = (node: ts.Node) => {
      if (ts.isJsxSpreadAttribute(node) && ts.isIdentifier(node.expression) && regionVars.has(node.expression.text)) {
        const attributes = node.parent as ts.JsxAttributes;
        const className = attributes.properties.find(
          (prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText(sf) === 'className',
        );
        const initializer = className?.initializer;
        const tokens = !initializer
          ? []
          : classLiterals(ts.isJsxExpression(initializer) && initializer.expression ? initializer.expression : initializer, consts)
            .join(' ').split(/\s+/).filter(Boolean);
        sites.push({
          file: relative(SRC_DIR, file).split(sep).join('/'),
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          tokens,
        });
      }
      node.forEachChild(visitJsx);
    };
    visitJsx(sf);
  }
  return sites;
}

/* ── 소스 AST: 훅을 쓰지 않는 스크롤 상자도 안쪽에 sr-only 가 있으면 위치 지정이 필요하다 ───────────────────────
   [2026-10-05 반박 리뷰 반영] useOverflowRegion 사용처만 세면, 훅 없이 overflow-auto 만 둔 상자(권한 변경 이력·공통코드 변경
   이력 표처럼 caption 이 sr-only 인 표)에 같은 결함이 다시 생겨도 잡지 못한다. 그래서 규칙을 결함 기전 그대로 적는다 —
   "스크롤 상자(overflow-auto|scroll, 축 포함)인 HTML 요소의 같은 파일 JSX 하위에 sr-only 가 있으면 그 요소는 위치 지정
   (relative·absolute·fixed·sticky)이어야 한다". 컴포넌트 태그(대문자, 예: DialogContent)는 내부 클래스를 합치므로 여기서
   판정할 수 없어 세지 않는다. 다른 파일의 자식 컴포넌트 안 sr-only 는 이 정적 검사가 보지 못한다(놓치는 방향). */

interface SrOnlyScrollSite { file: string; line: number; positioned: boolean }

const SCROLL_TOKEN = /^overflow(?:-[xy])?-(?:auto|scroll)$/;
const POSITIONED_TOKEN = /^(?:relative|absolute|fixed|sticky)$/;

/** 한 파일의 소스에서 sr-only 를 품은 HTML 스크롤 상자를 찾는다(계약 자체의 red 증명에도 쓴다). */
function srOnlyScrollSites(fileName: string, text: string): SrOnlyScrollSite[] {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const consts = new Map<string, ts.Expression>();
  const visitDecl = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) consts.set(node.name.text, node.initializer);
    node.forEachChild(visitDecl);
  };
  visitDecl(sf);
  const sites: SrOnlyScrollSite[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && /^[a-z]/.test(node.openingElement.tagName.getText(sf))) {
      const className = node.openingElement.attributes.properties.find(
        (prop): prop is ts.JsxAttribute => ts.isJsxAttribute(prop) && prop.name.getText(sf) === 'className',
      );
      const initializer = className?.initializer;
      const tokens = !initializer
        ? []
        : classLiterals(ts.isJsxExpression(initializer) && initializer.expression ? initializer.expression : initializer, consts)
          .join(' ').split(/\s+/).filter(Boolean);
      if (tokens.some((token) => SCROLL_TOKEN.test(token))) {
        const body = node.children.map((child) => child.getText(sf)).join('');
        if (/\bsr-only\b/.test(body)) {
          sites.push({
            file: fileName,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            positioned: tokens.some((token) => POSITIONED_TOKEN.test(token)),
          });
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(sf);
  return sites;
}

describe('sr-only 를 품은 HTML 스크롤 상자 (소스 AST, 훅 무관)', () => {
  const sites = sourceFiles(SRC_DIR).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    if (!text.includes('sr-only') || !/overflow(?:-[xy])?-(?:auto|scroll)/.test(text)) return [];
    return srOnlyScrollSites(relative(SRC_DIR, file).split(sep).join('/'), text);
  });

  it('알려진 상자를 찾는다(빈 검사 방지)', () => {
    const files = new Set(sites.map((site) => site.file));
    // [2026-10-05 권한 작업대 압축] 그룹 변경 이력(GroupChangeHistory)은 표 상자를 PermissionScrollRegion 으로 옮겼다 — 넘치면 키보드로
    //   스크롤하는 이름 있는 영역이 필요해서다(이력 표에는 포커스할 요소가 없다). 그 상자의 relative 는 위의 렌더 계약
    //   (PermissionScrollRegion fill=false·true)이 고정하므로 이 목록(HTML 상자)에서 뺐다. 검사 범위가 줄지 않는다.
    //   권한 관리 허브의 변경 이력(AuthorizationHistory)도 같은 이유로 같은 상자로 옮겼다(2026-10-05 과제 B — 허브 '변경 이력' 영역의 fill,
    //   종전 overflow-auto 상자는 가로로 넘쳐도 키보드로 스크롤할 수 없었다). 그 파일에 HTML 스크롤 상자가 다시 생기면 아래 '모두 위치
    //   지정' 검사가 그대로 본다.
    for (const file of [
      'app/admin/security/authority/components/AuthorizationEffectivePermissions.tsx',
      'app/admin/system/common-code/CommonCodeChangeHistoryDialog.tsx',
      'app/components/layout/sidebar.tsx',
    ]) {
      expect(files, `${file} 의 sr-only 를 품은 스크롤 상자를 찾지 못했습니다`).toContain(file);
    }
  });

  it('모두 위치 지정(relative 등)을 갖는다', () => {
    const missing = sites.filter((site) => !site.positioned).map((site) => `${site.file}:${site.line}`);
    expect(missing, `위치 지정이 없는 스크롤 상자(안쪽 sr-only 가 문서 높이를 늘린다):\n${missing.join('\n')}`).toEqual([]);
  });

  it('검사기는 위치 지정 없는 상자를 잡고, 컴포넌트 태그·sr-only 없는 상자·위치 지정된 상자는 통과시킨다', () => {
    const fixture = [
      'const BOX = "overflow-auto rounded";',
      'export const A = () => <div className={BOX}><table><caption className="sr-only">표</caption></table></div>;',
      'export const B = () => <div className="relative overflow-y-auto"><span className="sr-only">설명</span></div>;',
      'export const C = () => <div className="overflow-auto"><span>보이는 글</span></div>;',
      'export const D = () => <DialogContent className="overflow-y-auto"><span className="sr-only">설명</span></DialogContent>;',
    ].join('\n');
    const found = srOnlyScrollSites('fixture.tsx', fixture);
    expect(found.map(({ line, positioned }) => [line, positioned])).toEqual([[2, false], [3, true]]);
  });
});

describe('useOverflowRegion 으로 넘침을 재는 상자 (소스 AST)', () => {
  const sites = overflowRegionSites();

  it('알려진 상자를 모두 찾는다(빈 검사 방지)', () => {
    const files = new Set(sites.map((site) => site.file));
    for (const file of [
      'components/ui/table.tsx',
      'app/components/ui/standard-data-table.tsx',
      'app/admin/user/UserOrgHubParts.tsx',
      'app/admin/security/authority/components/GroupComparison.tsx',
      'app/admin/security/authority/components/PermissionScrollRegion.tsx',
    ]) {
      expect(files, `${file} 의 넘침 측정 상자를 찾지 못했습니다`).toContain(file);
    }
  });

  it('모든 상자가 relative 를 갖는다', () => {
    const missing = sites.filter((site) => !site.tokens.includes('relative')).map((site) => `${site.file}:${site.line}`);
    expect(missing, `relative 가 없는 넘침 측정 상자:\n${missing.join('\n')}`).toEqual([]);
  });
});
