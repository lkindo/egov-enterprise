import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_DIR = join(process.cwd(), 'src');
const APP_DIR = join(SRC_DIR, 'app');
const readAppSource = (...parts: string[]) => readFileSync(join(APP_DIR, ...parts), 'utf8');
/** 생산 소스(.ts·.tsx, 테스트 제외) 전수 — 표현 변형의 소비처를 센다. */
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('app shell accessibility source contract', () => {
  it('PageHeader의 정적 제목 shell은 server-safe이고 breadcrumb만 client leaf로 남는다', () => {
    const pageHeader = readAppSource('components', 'layout', 'page-header.tsx');
    const breadcrumb = readAppSource('components', 'layout', 'DynamicBreadcrumb.tsx');

    expect(pageHeader).not.toMatch(/^\s*['"]use client['"];?/);
    expect(breadcrumb).toMatch(/^\s*['"]use client['"];?/);
    expect(pageHeader.match(/<h1\b/g)).toHaveLength(1);
    expect(pageHeader).toContain('<DynamicBreadcrumb customItems={customItems} />');
  });

  it('breadcrumb 은 이름 있는 nav + 순서 목록 + aria-current 구조를 유지한다 (KRDS/WCAG)', () => {
    // [2026-08-22 정렬] 종전에는 이름 없는 <nav> 안에 평평한 Link/span 나열이라 스크린리더가
    // "몇 단계 중 어디"도 "여기가 현재 페이지"도 알 수 없었다. 네 요소가 한 세트다 —
    // 하나라도 빠지면 구조 정보가 그만큼 소실된다.
    const breadcrumb = readAppSource('components', 'layout', 'DynamicBreadcrumb.tsx');

    expect(breadcrumb, 'nav 의 접근 이름이 사라졌습니다').toMatch(/aria-label="현재 위치"/);
    expect(breadcrumb, '순서 목록(ol) 시맨틱이 사라졌습니다').toMatch(/<ol[\s>]/);
    expect(breadcrumb, '현재 항목의 aria-current="page" 가 사라졌습니다')
      .toMatch(/aria-current=\{isCurrent \? 'page' : undefined\}/);
    expect(breadcrumb, '장식 구분자(ChevronRight)가 접근성 트리에 노출됩니다')
      .toMatch(/<ChevronRight[^>]*aria-hidden="true"/);
  });

  it('primary nav 는 현재 route 의 canonical node 에 aria-current 를 선언한다 (IA §7.3)', () => {
    // 사이드바: 공통 matcher가 선택한 정본만 현재 페이지이고 조상은 강조·자동 펼침용이다.
    const navItem = readAppSource('components', 'layout', 'NavItem.tsx');
    expect(navItem, '사이드바 canonical node 의 aria-current="page" 가 사라졌습니다')
      .toMatch(/aria-current=\{isCurrentPage \? 'page' : undefined\}/);
    expect(navItem, 'aria-current 판정이 선택된 정본 메뉴 ID와 다릅니다')
      .toMatch(/const isCurrentPage = match\?\.menuNo === item\.menuNo/);

    // GNB: 활성 도메인은 섹션 표지다. 'page' 를 쓰면 하위 화면에서도 페이지를 사칭하므로 'true' 로 선언한다.
    const header = readAppSource('components', 'layout', 'header.tsx');
    expect(header, 'GNB 활성 도메인의 aria-current="true" 가 사라졌습니다')
      .toMatch(/aria-current=\{isActive \? 'true' : undefined\}/);
  });

  it('sticky header와 skip target이 focus occlusion 여유를 갖고 모바일 trigger를 dialog에 연결한다', () => {
    const layout = readAppSource('layout.tsx');
    const frame = readAppSource('components', 'layout', 'ApplicationFrame.tsx');
    const header = readAppSource('components', 'layout', 'header.tsx');
    const sidebar = readAppSource('components', 'layout', 'sidebar.tsx');
    const headerClasses = header.match(/<header\b[\s\S]*?className="([^"]+)"/)?.[1] ?? '';

    expect(headerClasses.split(/\s+/)).toContain('sticky');
    expect(headerClasses.split(/\s+/)).not.toContain('relative');
    expect(headerClasses.split(/\s+/)).not.toContain('overflow-hidden');
    // [2026-09-16 GAP-UIF-001] next/font 변수가 <html> 로 올라가며 className 이 식이 됐다.
    //   이 계약이 고정하려는 사실은 문자열 형태가 아니라 "html 이 lang 과 scroll-pt-16 을 갖는다" 이다.
    const htmlTag = layout.slice(layout.indexOf('<html'), layout.indexOf('<body'));
    expect(htmlTag).toContain('lang="ko"');
    expect(htmlTag).toContain('scroll-pt-16');
    expect(frame).toContain('scroll-mt-[var(--app-header-height)]');
    expect(frame).toContain('id="main-content"');
    expect(frame).toContain('data-sidebar-modal-background="skip-link"');
    expect(frame).toContain('data-sidebar-modal-background="main"');
    expect(header).toContain('data-sidebar-modal-background="header"');
    expect(header).toContain('aria-controls="primary-sidebar"');
    expect(sidebar).toContain('id="primary-sidebar"');
  });

  it('넓은 화면 사이드바 접기는 그리기 전에 복원되고 CSS 로만 상자를 띠로 줄이며 사이드바 자리표시까지 함께 줄인다', () => {
    // [2026-10-05 DEC-OPS-228] 접힘의 화면 표현은 전부 CSS 다 — JS 로 aside 를 언마운트하거나 뷰포트를 재지 않는다(ADR-0006).
    //   ① 복원 스크립트는 요청 nonce 를 달고 본문(ThemeProvider)보다 먼저 실행돼야 첫 화면이 펼쳤다가 접히지 않는다.
    //   ② 접힘 규칙은 lg 이상 미디어쿼리 안에만 있다 — lg 미만 서랍형 사이드바는 이 표지와 무관해야 한다.
    //   ③ 사이드바와 Suspense 자리표시 둘 다 표지를 달아야 한다 — 자리표시만 남으면 접힌 첫 화면에 사이드바 폭의 빈 띠가 생긴다.
    //   ④ 본문 여백은 폭 토큰이 아니라 inset 토큰이다 — 폭을 직접 쓰면 접어도 사이드바 폭의 빈 자리가 남는다.
    //   ⑤ 접으면 사이드바 상자(랜드마크)는 남아 띠 폭이 되고 안쪽 내용 컨테이너만 숨는다 — 상자를 display:none 으로 없애면
    //      그 안의 경계선 단추도 사라져 포커스가 떨어지고 펼칠 길이 없어진다.
    const layout = readAppSource('layout.tsx');
    const sidebar = readAppSource('components', 'layout', 'sidebar.tsx');
    const frame = readAppSource('components', 'layout', 'ApplicationFrame.tsx');
    const globals = readAppSource('globals.css').replace(/\/\*[\s\S]*?\*\//g, '');

    const scriptTag = '<script nonce={nonce} dangerouslySetInnerHTML={{ __html: SIDEBAR_COLLAPSE_SCRIPT }} />';
    expect(layout).toContain(scriptTag);
    expect(layout.indexOf(scriptTag)).toBeLessThan(layout.indexOf('<ThemeProvider'));
    expect(layout).toMatch(/<aside data-app-sidebar=""[^>]*lg:block/);
    expect(sidebar).toMatch(/<aside\s+id="primary-sidebar"\s+data-app-sidebar=""/);
    expect(sidebar).toMatch(/<div\s+id=\{SIDEBAR_CONTENT_ID\}\s+data-app-sidebar-content=""/);
    expect(frame).toContain('lg:pl-[var(--app-sidebar-inset)]');
    expect(frame).not.toContain('lg:pl-[var(--app-sidebar-width)]');

    const media = globals.match(/@media \(min-width: 64rem\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    // 접으면 본문 여백은 0 이 아니라 띠 폭이다 — 띠(줄어든 사이드바 상자)가 그 자리를 쓴다.
    expect(media).toMatch(/:root\[data-sidebar-collapsed="true"\]\s*\{\s*--app-sidebar-inset:\s*var\(--app-sidebar-rail-width\);\s*\}/);
    expect(media).toMatch(/:root\[data-sidebar-collapsed="true"\] \[data-app-sidebar\]\s*\{\s*width:\s*var\(--app-sidebar-rail-width\);\s*\}/);
    expect(media).toMatch(/:root\[data-sidebar-collapsed="true"\] \[data-app-sidebar-content\]\s*\{\s*display:\s*none;\s*\}/);
    // 화면(screen)에서 사이드바 상자를 없애는 규칙은 없다 — 인쇄 규칙 밖에서 [data-app-sidebar] 를 display:none 으로 두면 ⑤가 깨진다.
    const screenRules = media.slice(0, media.indexOf('@media print'));
    expect(media.indexOf('@media print')).toBeGreaterThan(-1);
    expect(screenRules).not.toMatch(/\[data-app-sidebar\]\s*\{[^}]*display:\s*none/);
    expect(screenRules).not.toMatch(/data-app-sidebar-edge-toggle/);
    // 인쇄에서는 경계선 단추를 늘 숨기고, 접힌 화면에는 띠도 그 자리도 남기지 않는다 — 같은 블록 끝의 인쇄 규칙이 뒤에서 이긴다.
    //   본문에 print:pl-0 을 붙이면 펼친 상태의 넓은 인쇄에서 사이드바가 본문을 덮으므로 접힘 조건 안에서만 비운다.
    const print = media.match(/@media print \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
    expect(print).toMatch(/(?:^|\n)\s*\[data-app-sidebar-edge-toggle\]\s*\{\s*display:\s*none;\s*\}/);
    expect(print).toMatch(/:root\[data-sidebar-collapsed="true"\]\s*\{\s*--app-sidebar-inset:\s*0px;\s*\}/);
    expect(print).toMatch(/:root\[data-sidebar-collapsed="true"\] \[data-app-sidebar\]\s*\{\s*display:\s*none;\s*\}/);
    expect(print.match(/\{/g)).toHaveLength(3);
    expect(media.indexOf('@media print')).toBeGreaterThan(media.search(/\[data-app-sidebar-content\]\s*\{\s*display:\s*none/));
    // 블록 안의 규칙은 이 셋과 인쇄 규칙 셋뿐이다 — 다른 것을 숨기거나 보이는 규칙이 슬며시 늘지 않는다.
    expect(media.match(/\{/g)).toHaveLength(7);
    // 미디어쿼리 밖에는 접힘 규칙이 없다(서랍형 보존). 예외는 경계선 단추의 아이콘을 고르는 표현 변형 하나뿐이다 —
    //   그 변형은 아무것도 숨기지 않고(배치 무관) lg 이상에서만 보이는 단추 안에서만 쓴다(아래 소비처 검사).
    const variantRule = '@custom-variant sidebar-collapsed (:root[data-sidebar-collapsed="true"] &);';
    expect(globals.split(variantRule)).toHaveLength(2);
    expect(globals.replace(media, '').replace(variantRule, '').match(/data-sidebar-collapsed/g)).toBeNull();
    expect(globals.replace(media, '').match(/data-app-sidebar-(?:content|edge-toggle)/g)).toBeNull();
    const variantConsumers = listSourceFiles(SRC_DIR)
      .filter((file) => /sidebar-collapsed:/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC_DIR, file).split(sep).join('/'))
      .sort();
    expect(variantConsumers, 'sidebar-collapsed: 변형은 경계선 단추 아이콘 전용이다')
      .toEqual(['app/components/layout/sidebar-edge-toggle.tsx']);
  });

  it('접기·펼치기 단추는 사이드바 경계선의 하나뿐이고, 사이드바 상자 안·내용 컨테이너 밖에 늘 있다', () => {
    // [2026-10-05 DEC-OPS-228] 사용자 결정 — 머리글 로고 옆 아이콘·사이드바 맨 위 글자 단추·접힘 막대를 걷고 경계선의 원형
    //   아이콘 단추 하나만 남긴다.
    //   ① 단추는 사이드바 상자(aside '주 메뉴', 랜드마크) 안에서 안쪽 내용 컨테이너보다 앞·밖에 그린다 — 접어도 사라지지 않는다.
    //   ② 머리글에는 접기 단추가 없다(같은 기능의 단추가 둘이 되지 않는다). '메뉴 보기'가 접힌 사이드바를 펴는 일은 남는다.
    //   ③ 띠 폭 토큰은 :root 에 하나 있고(1.25rem), 띠(줄어든 상자)와 본문 여백이 같은 토큰을 쓴다.
    //   ④ 사이드바 상자는 overflow 를 자르지 않는다 — 단추가 경계선 밖으로 반쯤 나간다(스크롤은 안쪽 컨테이너가 한다).
    const sidebar = readAppSource('components', 'layout', 'sidebar.tsx');
    const header = readAppSource('components', 'layout', 'header.tsx');
    const layout = readAppSource('layout.tsx');
    const toggle = readAppSource('components', 'layout', 'sidebar-edge-toggle.tsx');
    const globals = readAppSource('globals.css').replace(/\/\*[\s\S]*?\*\//g, '');

    const asideStart = sidebar.search(/<aside\s+id="primary-sidebar"/);
    expect(asideStart).toBeGreaterThan(-1);
    const aside = sidebar.slice(asideStart, sidebar.indexOf('</aside>', asideStart));
    expect(sidebar.match(/<SidebarEdgeToggle\b/g)).toHaveLength(1);
    expect(aside.indexOf('<SidebarEdgeToggle />')).toBeGreaterThan(-1);
    expect(aside.indexOf('<SidebarEdgeToggle />')).toBeLessThan(aside.indexOf('data-app-sidebar-content'));
    const asideClasses = aside.match(/className=\{cn\(\s*'([^']+)'/)?.[1].split(/\s+/) ?? [];
    expect(asideClasses).toContain('fixed');
    expect(asideClasses.filter((name) => /overflow/.test(name))).toEqual([]);

    expect(toggle).toContain('data-app-sidebar-edge-toggle=""');
    expect(toggle).toContain('aria-label={SIDEBAR_TOGGLE_LABEL}');
    expect(toggle).toContain('aria-controls={SIDEBAR_CONTENT_ID}');
    expect(header).not.toMatch(/SIDEBAR_TOGGLE_LABEL|PanelLeft|SidebarEdgeToggle/);
    expect(header).toContain('if (isSidebarCollapsed) setSidebarCollapsed(false);');
    expect(layout).not.toMatch(/SidebarRail|SidebarEdgeToggle/);
    expect(listSourceFiles(SRC_DIR).filter((file) => /SidebarRail|data-app-sidebar-rail/.test(readFileSync(file, 'utf8'))))
      .toEqual([]);

    expect(globals.match(/--app-sidebar-rail-width:\s*1\.25rem;/g)).toHaveLength(1);
    expect(globals.match(/--app-sidebar-rail-width:/g)).toHaveLength(1);
  });

  it('fill 화면에서 숨는 푸터의 링크는 같은 조건(lg 이상)에서 보이는 머리글 링크로도 닿고, 같은 pack 과 함께 남는다', () => {
    // [2026-10-05] fill 셸이 있는 화면은 work-fill 조건(폭 lg 이상·높이 600px 이상)에서 푸터를 숨긴다(globals.css, :has).
    //   푸터에만 있는 길이 생기면 그 화면에서는 닿을 수 없게 된다(2.4.5 여러 경로·3.2.3 일관된 내비게이션). 그래서 푸터의 모든
    //   링크 목적지가 머리글에도 있고, 그 머리글 링크가 lg 이상에서 숨지 않으며, 푸터 링크가 남는 프로필에서 함께 남는지 본다.
    //   주석 속 링크 예시는 세지 않는다(재사용 pack 마커만 남기고 다른 주석은 같은 길이의 공백으로 지운다).
    const blankComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, (comment) => (
      /^\/\*\s*reusable-base:[a-z-]+:(?:start|end)\s*\*\/$/.test(comment) ? comment : comment.replace(/[^\n]/g, ' ')
    ));
    const packAt = (source: string, index: number) => {
      const before = source.slice(0, index);
      const start = [...before.matchAll(/reusable-base:([a-z-]+):start/g)].at(-1);
      const end = [...before.matchAll(/reusable-base:([a-z-]+):end/g)].at(-1);
      return start && (!end || end.index! < start.index!) ? start[1] : null;
    };
    const linkTags = (source: string) => [...source.matchAll(/<(?:Link|a)\b[\s\S]*?\/?>/g)]
      .map((match) => ({ tag: match[0], index: match.index!, href: match[0].match(/\bhref="([^"]+)"/)?.[1] ?? null }));

    const footer = blankComments(readAppSource('components', 'layout', 'footer.tsx'));
    const header = blankComments(readAppSource('components', 'layout', 'header.tsx'));
    const footerLinks = linkTags(footer);
    // 정규식이 링크를 놓쳐 검사가 비는 일을 막는다 — 모든 링크 태그가 정적 href 를 가져야 대조할 수 있다.
    expect(footerLinks.length).toBe((footer.match(/<(?:Link|a)\b/g) ?? []).length);
    for (const link of footerLinks) {
      expect(link.href, `푸터 링크의 목적지를 정적으로 읽을 수 없습니다: ${link.tag}`).toBeTruthy();
      const twin = linkTags(header).find((candidate) => candidate.href === link.href);
      expect(twin, `푸터의 ${link.href} 가 머리글에 없어 fill 화면에서 닿을 수 없습니다`).toBeTruthy();
      const tokens = [...twin!.tag.matchAll(/["'`]([^"'`]*)["'`]/g)].flatMap((match) => match[1].split(/\s+/));
      expect(tokens.filter((token) => /^(?:sm|md|lg|xl|2xl):hidden$/.test(token)), `머리글의 ${link.href} 가 넓은 화면에서 숨습니다`).toEqual([]);
      if (tokens.includes('hidden')) {
        expect(tokens.some((token) => /^(?:sm|md|lg):(?:flex|inline-flex|block|inline-block|inline|grid)$/.test(token)),
          `머리글의 ${link.href} 가 lg 이상에서 다시 보이지 않습니다`).toBe(true);
      }
      const footerPack = packAt(footer, link.index);
      const headerPack = packAt(header, twin!.index);
      expect(headerPack === null || headerPack === footerPack,
        `머리글의 ${link.href}(pack ${headerPack})가 푸터 링크(pack ${footerPack})보다 먼저 빠지는 프로필이 있습니다`).toBe(true);
    }
  });

  it('A1 archetype 셸이 페이지의 h1 을 단독으로 소유한다', () => {
    // [2026-08-24 A1 이행] 조회형 목록 화면은 제목을 자기 소스에 쓰지 않고 WorkListPage 에
    //   문자열로 넘긴다(카탈로그 §5 A1). 그래서 "화면 소스에 <h1 이 있는가"로는 더 이상
    //   주 제목 소유를 판정할 수 없다 — 셸이 정확히 하나의 h1 을 갖는다는 사실이 그 자리를 대신한다.
    const shell = readAppSource('components', 'patterns', 'work-list-page.tsx');

    expect(shell, 'WorkListPage의 기본 주 제목 수준이 h1이 아닙니다').toMatch(/headingLevel\s*=\s*1/);
    expect(shell, '임베디드 A1 제목 수준을 h2로 낮추는 계약이 없습니다').toMatch(
      /const PageHeading = headingLevel === 1 \? 'h1' : 'h2'/,
    );
    expect(shell.match(/<PageHeading\b/g), 'WorkListPage가 주 제목을 잃었거나 둘 이상 갖습니다').toHaveLength(1);
    expect(shell, '셸이 제목을 title prop으로 받지 않습니다').toMatch(/<PageHeading[^>]*>\{title\}<\/PageHeading>/);
  });

  it('A2 전체 셸과 점진 레이아웃 소비자는 최종 h1을 하나만 소유한다', () => {
    const shell = readAppSource('components', 'patterns', 'master-detail-page.tsx');
    const menus = readAppSource('admin', 'system', 'menus', 'MenuAdminClient.tsx');
    const userOrg = readAppSource('admin', 'user', 'UserOrgHubClient.tsx');
    const mailHistory = readAppSource(
      'admin', 'collaboration', 'mail-history', 'MailHistoryHubClient.tsx',
    );

    expect(shell, 'MasterDetailPage의 기본 주 제목 수준이 h1이 아닙니다').toMatch(/headingLevel\s*=\s*1/);
    expect(shell, '임베디드 A2 제목 수준을 h2로 낮추는 계약이 없습니다').toMatch(
      /const PageHeading = headingLevel === 1 \? 'h1' : 'h2'/,
    );
    expect(shell.match(/<PageHeading\b/g), 'MasterDetailPage가 주 제목을 잃었거나 둘 이상 갖습니다').toHaveLength(1);
    expect(shell).toMatch(/<PageHeading[^>]*>\{title\}<\/PageHeading>/);
    expect(menus, '메뉴 화면은 h1을 MasterDetailPage에 위임해야 합니다').not.toMatch(/<h1\b/);
    expect(userOrg, '부서 화면은 h1을 PageHeader에 위임해야 합니다').not.toMatch(/<h1\b/);
    expect(mailHistory, '메일 이력 화면은 h1을 MasterDetailPage에 위임해야 합니다').not.toMatch(/<h1\b/);
  });

  it('A1 이행 화면은 제목을 셸에 위임한다(자체 h1 을 다시 만들지 않는다)', () => {
    const delegatedHeadingSources = [
      ['admin', 'collaboration', 'scraps', 'selectScrapList', 'ScrapListClient.tsx'],
      ['admin', 'collaboration', 'address-book', 'select-address-book-list', 'AddressBookListClient.tsx'],
      ['admin', 'operation', 'events', 'EventManagementClient.tsx'],
      ['admin', 'operation', 'rewards', 'RewardManageClient.tsx'],
      ['admin', 'system', 'logs', 'user', 'SystemLogsUserClient.tsx'],
      // 시스템 정책은 2026-08-24 A1 이행으로 standalone HubHeader 를 떠나 셸에 위임한다.
      ['admin', 'system', 'policies', 'PolicyAdminClient.tsx'],
      // [2026-09-20] 권한보안 두 화면도 같은 경로로 이행했다 — 로그인 정책 관리는 standalone
      //   HubHeader 를, 그룹별 메뉴 현황은 PageHeader 를 떠나 WorkListPage 에 제목을 위임한다.
      //   로그인 정책 관리는 아래 standaloneHubSources 에서 함께 제거했다(같은 불변식의 소유자 이동).
      ['admin', 'security', 'login-policy', 'LoginPolicyAdminClient.tsx'],
      ['admin', 'system', 'menus', 'by-authority', 'MenuByAuthorityClient.tsx'],
    ];

    // A7(현황) 셸로 이행한 화면은 제목을 ReportPage 에 위임한다 — 자체 h1 을 다시 만들지 않는다.
    for (const pathParts of [
      ['admin', 'stats', 'AdminStatsClient.tsx'],
      ['admin', 'survey', 'stats', 'SurveyStatsClient.tsx'],
    ]) {
      const source = readAppSource(...pathParts);
      expect(source, `${pathParts.join('/')}: A7 셸을 경유하지 않습니다`).toMatch(/<ReportPage[\s>]/);
      expect(source, `${pathParts.join('/')}: 셸 밖에서 h1 을 다시 만듭니다`).not.toMatch(/<h1[\s>]/);
    }

    for (const pathParts of delegatedHeadingSources) {
      const source = readAppSource(...pathParts);
      expect(source, `${pathParts.join('/')}: 셸을 경유하지 않습니다`).toMatch(/<WorkListPage\b/);
      expect(source, `${pathParts.join('/')}: 셸 밖에서 h1 을 다시 만듭니다`).not.toMatch(/<h1\b/);
    }
  });

  it('실제 UI route의 검증된 주 제목은 h1이고 preview 제목은 페이지 제목을 사칭하지 않는다', () => {
    const routeHeadingSources = [
      // [2026-09-12 §A3-1] 스크랩 등록·수정 전용 화면 2개는 목록 위 모달로 이행했다 —
      // 제목 소유 계약은 아래 '모달 이행' 검사로 옮겼다(지운 것이 아니다).
      ['admin', 'community', 'boards', 'select-board-list', 'BoardListClient.tsx'],
      ['admin', 'sanctn', 'WorkflowHubClient.tsx'],
      ['admin', 'stats', 'IntelligenceHubClient.tsx'],
      ['admin', 'survey', 'manage', '[id]', 'SurveyManageDetailClient.tsx'],
      ['admin', 'system', 'common-code', 'codes', 'CommonCodeCodesClient.tsx'],
      ['smart-toolkit', 'dept-job', 'create', 'DeptJobCreateClient.tsx'],
      ['smart-toolkit', 'dept-job', '[id]', 'DeptJobDetailClient.tsx'],
      ['smart-toolkit', 'schedule', 'dept', 'ScheduleDeptClient.tsx'],
      ['admin', 'community', 'boards', 'maker', 'components', 'BoardMakerWizard.tsx'],
    ];

    for (const pathParts of routeHeadingSources) {
      const source = readAppSource(...pathParts);
      expect(source, pathParts.join('/')).toMatch(/<(?:[A-Za-z]+\.)?h1\b/);
    }

    const preview = readAppSource('admin', 'community', 'boards', 'maker', 'components', 'BoardPreview.tsx');
    expect(preview).not.toMatch(/<h1\b/);
  });

  /*
    [2026-09-12 §A3-1 · DEC-OPS-079] 스크랩 등록·수정과 설문 등록은 전용 페이지를 떠나 목록 위
    모달로 이행했다. 제목 계약은 사라진 것이 아니라 **소유자가 옮겨 갔다** — 라우트에는 redirect 만
    남고, 제목은 `StandardModal` 의 `title`(Radix `DialogTitle`)이 갖는다. 두 축을 함께 고정하지
    않으면 "페이지가 없어졌으니 제목 검사도 지운다" 가 되어 신호가 조용히 줄어든다(H2).
  */
  it('§A3-1 모달 이행 라우트는 redirect 만 남기고 제목은 모달이 소유한다', () => {
    const redirected: Array<[string[], string]> = [
      [['admin', 'collaboration', 'scraps', 'insertScrap', 'page.tsx'],
        '/admin/collaboration/scraps/selectScrapList'],
      [['admin', 'collaboration', 'scraps', 'selectScrapDetail', '[id]', 'page.tsx'],
        '/admin/collaboration/scraps/selectScrapList'],
      [['admin', 'survey', 'manage', 'create', 'page.tsx'], '/admin/survey/manage'],
      [['admin', 'collaboration', 'address-book', 'insert-address-book', 'page.tsx'],
        '/admin/collaboration/address-book/select-address-book-list'],
    ];

    for (const [pathParts, target] of redirected) {
      const source = readAppSource(...pathParts);
      expect(source, `${pathParts.join('/')}: redirect 목적지가 사라졌습니다`)
        .toContain(`redirect('${target}')`);
      expect(source, `${pathParts.join('/')}: 삭제한 전용 입력 화면이 되살아났습니다`)
        .not.toMatch(/<h1\b/);
    }

    for (const pathParts of [
      ['admin', 'collaboration', 'scraps', 'ScrapFormDialog.tsx'],
      ['admin', 'survey', 'manage', 'SurveyFormDialog.tsx'],
      ['admin', 'collaboration', 'address-book', 'AddressBookCreateDialog.tsx'],
    ]) {
      const source = readAppSource(...pathParts);
      expect(source, `${pathParts.join('/')}: StandardModal 을 경유하지 않습니다`)
        .toMatch(/<StandardModal\b/);
      expect(source, `${pathParts.join('/')}: 모달이 접근 가능한 제목을 선언하지 않습니다`)
        .toMatch(/\btitle=(?:\{|")\S/);
      expect(source, `${pathParts.join('/')}: 모달 안에서 페이지 제목(h1)을 사칭합니다`)
        .not.toMatch(/<h1\b/);
    }
  });

  it('PageHeader가 없는 standalone HubHeader route만 명시적으로 h1을 소유한다', () => {
    const standaloneHubSources = [
      ['admin', 'AdminDashboardClient.tsx'],
      // 행사 운영 센터는 2026-08-24 A1 이행으로 WorkListPage 가 h1 을 소유한다(위 위임 계약이 검사).
      ['help', 'policies', '[type]', 'page.tsx'],
    ];

    for (const pathParts of standaloneHubSources) {
      const source = readAppSource(...pathParts);
      expect(source, pathParts.join('/')).toMatch(
        /<HubHeader\b(?:(?!\/>)[\s\S])*?headingLevel\s*=\s*\{1\}/,
      );
    }
  });

  it('loading/error shell도 h1을 보존하고 설문 hub는 내부 페이지 제목을 중첩하지 않는다', () => {
    const layout = readAppSource('layout.tsx');
    const boardDetailPage = readAppSource('admin', 'community', 'boards', 'detail', 'page.tsx');
    const boardListPage = readAppSource('admin', 'community', 'boards', 'select-board-list', 'page.tsx');
    const boardListClient = readAppSource('admin', 'community', 'boards', 'select-board-list', 'BoardListClient.tsx');
    const adminLoading = readAppSource('admin', 'loading.tsx');
    const statsFallback = readAppSource('admin', 'stats', 'StatsHubFallback.tsx');
    const surveyHub = readAppSource('admin', 'survey', 'hub', 'SurveyHubClient.tsx');

    expect(layout).toContain('보안 세션을 확인하는 중');
    expect(layout).toContain('애플리케이션을 준비하는 중');
    expect(layout.match(/<h1\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(boardDetailPage).toMatch(/BoardDetailSkeleton[\s\S]*?<h1\b/);
    expect(boardListPage).not.toMatch(/<Suspense\b/);
    expect(boardListPage).toMatch(/<BoardListClient\b/);
    expect(adminLoading).toMatch(/<h1\b[^>]*>관리자 화면을 불러오는 중입니다\.<\/h1>/);
    expect(boardListClient.match(/<h1\b/g)).toHaveLength(1);
    expect(statsFallback).toMatch(/<h1\b/);
    expect(surveyHub).toContain('<SurveyManageClient embedded />');
    // [2026-09-08 PD-SRVY-001] 응답자 탭을 걷었다 — tb_srvy_rspdnt 는 개인정보를 담는데 응답
    //   결과와 ID 로 연결되지 않고 행을 만드는 경로가 없어 항상 빈 목록이었다. 나머지 임베드
    //   화면(manage·stats)의 h1 중첩 금지 계약은 그대로다.
    expect(surveyHub).toContain('<SurveyStatsClient embedded />');
  });

  it('동적 import의 독립 로딩 화면도 최종 화면과 교대하는 h1을 제공한다', () => {
    const dashboardPage = readAppSource('page.tsx');
    const addressBookPage = readAppSource(
      'admin', 'collaboration', 'address-book', 'select-address-book-list', 'page.tsx',
    );
    const boardMasterPage = readAppSource('admin', 'community', 'boards', 'master', 'page.tsx');
    const boardMakerPage = readAppSource('admin', 'community', 'boards', 'maker', 'page.tsx');

    expect(dashboardPage).toMatch(/DashboardLoading[\s\S]*?<h1\b/);
    expect(dashboardPage.match(/<DashboardLoading\s*\/>/g)).toHaveLength(2);
    expect(addressBookPage).toMatch(/AddressBookListSkeleton[\s\S]*?<h1\b/);
    expect(boardMasterPage).toMatch(/loading:\s*\(\)\s*=>\s*<h1\b/);
    expect(boardMakerPage).toMatch(/loading:\s*\(\)\s*=>\s*<h1\b/);
  });

  it('client 내부 early-return 로딩·오류 상태도 최종 제목과 교대하는 h1을 보존한다', () => {
    const dashboardClient = readAppSource('UnifiedDashboardClient.tsx');
    const dashboardLoadingStart = dashboardClient.indexOf('if (loading || !user)');
    const dashboardLoadingEnd = dashboardClient.indexOf('\n  return (', dashboardLoadingStart);

    const pollParticipate = readAppSource(
      'admin', 'survey', 'polls', 'participate', 'OnlinePollParticipateClient.tsx',
    );
    const pollLoadingStart = pollParticipate.indexOf("if (loading && viewMode === 'list')");
    const pollBranchReturnStart = pollParticipate.indexOf('\n return (', pollLoadingStart);
    const pollLoadingEnd = pollParticipate.indexOf('\n return (', pollBranchReturnStart + 1);

    const responseDetail = readAppSource('survey', 'response', '[id]', 'SurveyResponseDetailClient.tsx');
    const responseLoadingStart = responseDetail.indexOf('if (isLoading)');
    const responseErrorStart = responseDetail.indexOf('if (isError)', responseLoadingStart);
    const responseFinalStart = responseDetail.indexOf('\n    return (', responseErrorStart);

    expect(dashboardClient.slice(dashboardLoadingStart, dashboardLoadingEnd)).toMatch(/<h1\b/);
    expect(pollParticipate.slice(pollLoadingStart, pollLoadingEnd)).toMatch(/<h1\b/);
    expect(responseDetail.slice(responseLoadingStart, responseErrorStart)).toMatch(/<h1\b/);
    expect(responseDetail.slice(responseErrorStart, responseFinalStart)).toMatch(/<h1\b/);
  });

  it('공통 segment loading/error 경계는 지속 상태에서도 페이지 제목을 제공한다', () => {
    const boundarySources = [
      ['global-error.tsx'],
      ['admin', 'error.tsx'],
      ['loading.tsx'],
      ['admin', 'loading.tsx'],
    ];

    for (const pathParts of boundarySources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(/<h1\b/);
    }
  });

  it('route-local Suspense fallback은 route 의미에 맞는 h1을 보존한다', () => {
    const routeFallbackSources = [
      ['admin', 'collaboration', 'page.tsx'],
      ['admin', 'collaboration', 'scraps', 'page.tsx'],
      ['admin', 'community', 'templates', 'page.tsx'],
      ['admin', 'help', 'page.tsx'],
      ['admin', 'help', 'faq', 'page.tsx'],
      ['admin', 'help', 'qna', 'page.tsx'],
      // [2026-09-06 DEC-OPS-038] admin/notifications/page.tsx 는 목록에서 뺐다 — ?view= 상태가 사라져 useSearchParams 도
      //   route-local Suspense 도 없어졌고, h1 은 PageHeader 가 최종 화면에서 그린다(fallback 자체가 존재하지 않는다).
      ['admin', 'operation', 'events', 'page.tsx'],
      ['admin', 'operation', 'external-hr', 'page.tsx'],
      ['admin', 'operation', 'memo-reports', 'page.tsx'],
      ['admin', 'operation', 'rewards', 'page.tsx'],
      ['admin', 'security', 'authority', 'page.tsx'],
      ['admin', 'stats', 'page.tsx'],
      ['admin', 'system', 'audit', 'page.tsx'],
      ['admin', 'system', 'banner', 'page.tsx'],
      ['admin', 'system', 'common-code', 'page.tsx'],
      // [2026-09-06 DEC-OPS-040] admin/system/ism/page.tsx 는 /approvals 로의 page-redirect 가 되어 route-local fallback 이 없다.
      ['admin', 'system', 'logs', 'page.tsx'],
      ['admin', 'system', 'logs', 'login', 'page.tsx'],
      ['admin', 'system', 'logs', 'privacy', 'page.tsx'],
      ['admin', 'system', 'logs', 'system', 'page.tsx'],
      ['admin', 'system', 'logs', 'user', 'page.tsx'],
      ['admin', 'system', 'logs', 'web', 'page.tsx'],
      ['admin', 'system', 'menus', 'by-authority', 'page.tsx'],
      ['admin', 'system', 'menus', 'page.tsx'],
      ['admin', 'system', 'programs', 'page.tsx'],
      ['admin', 'user', 'absences', 'page.tsx'],
      ['admin', 'user', 'departments', 'page.tsx'],
      ['admin', 'user', 'indvdl-info-policy', 'page.tsx'],
      ['admin', 'user', 'login-policy', 'page.tsx'],
      ['admin', 'user', 'manage', 'page.tsx'],
      ['admin', 'uss', 'ion', 'sms', 'page.tsx'],
      ['admin', 'uss', 'olh', 'online-manual', 'page.tsx'],
    ];

    for (const pathParts of routeFallbackSources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(/<h1\b/);
    }

    expect(readAppSource('admin', 'system', 'monitoring', 'MonitoringHubSkeleton.tsx')).toMatch(/<h1\b/);
  });

  it('client-local Suspense fallback도 최종 화면과 교대하는 h1을 제공한다', () => {
    const localFallbackSources = [
      ['admin', 'community', 'board', 'CommunityBoardClient.tsx'],
      ['login', 'LoginClient.tsx'],
      ['search', 'SearchShell.tsx'],
      ['survey', 'stats', 'SurveyStatsClient.tsx'],
    ];

    for (const pathParts of localFallbackSources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(
        /<Suspense\s+fallback\s*=\s*\{[\s\S]*?<h1\b/,
      );
    }
  });
});
