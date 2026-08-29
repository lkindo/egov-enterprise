import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_DIR = join(FRONTEND_DIR, 'src');

/**
 * DOM 정체성 불변식 — "같은 것이 두 번 렌더되지 않는다".
 *
 * 2026-08-22 CI run 32555133776 에서 e2e 3건이 strict mode violation 으로 죽었고, 원인은
 * selector 노후가 아니라 **제품이 같은 요소를 중복 렌더**한 것이었다. 두 축이 겹쳐 있었다:
 *   ① 라우트 전환 중 목적지 페이지가 2벌 마운트 (page-transition.tsx)
 *   ② 목록 행과 상세 패널이 같은 data-testid 사용 (MailHistoryHubClient.tsx)
 *
 * ①은 자동화만의 문제가 아니라 **사용자 데이터 유실 경로**였다. ghost 가 DOM 선두라
 * 전환 직후 입력한 값이 ghost 로 들어가고 exit 완료와 함께 사라진다. 종전 e2e 가 초록이던 것은
 * `.first()` 가 ghost 의 submit 을 눌러 원본 값을 저장하면서도 통과하던 false-green 이었다.
 *
 * 두 결함 모두 "조용하다" — 타입도 빌드도 lint 도 잡지 못하고, 화면도 정상으로 보인다.
 * 그래서 소스 계약으로 고정한다.
 */
/**
 * 주석을 제거한 소스를 돌려준다.
 *
 * ⚠ 이 계약은 "금지 토큰이 없어야 한다"를 검사하는데, **그 토큰을 설명하는 주석이 소스에 있다**.
 *   주석을 지우지 않으면 계약이 자기 문서를 위반으로 신고한다(2026-08-22 작성 중 실제로 red 가 났고,
 *   같은 함정을 csp-policy 계약도 겪었다). 검사는 반드시 실행 코드에 대해서만 한다.
 */
/*
 * [2026-08-29] 순서를 뒤집었다 — 줄 주석 먼저, 블록 주석 나중.
 *
 * 블록 주석을 먼저 지우면, 줄 주석 안에 블록 주석 여는 기호가 들어 있는 파일에서 그 기호가
 * 저 아래 다른 블록 주석의 닫는 기호까지 이어져 **그 사이의 실행 코드가 통째로 사라진다.**
 * 이 계약은 소스를 전수로 훑으므로 그런 파일이 하나만 생겨도 조용히 눈이 먼다
 * (실측: WorkHubClient.tsx 에서 코드 1,781자 소실 — honest-affordance 계약이 실제로 그렇게
 * 새어 나갔다). 줄 주석을 먼저 지우면 그 여는 기호도 함께 사라진다.
 *
 * 줄 주석 제거의 콜론 가드는 URL 의 이중 슬래시를 주석으로 오인하지 않기 위한 것이다
 * (csp-policy 계약에서 같은 사각을 먼저 고쳤다).
 *
 * 이 변경으로 census 결과는 바뀌지 않는다(적용 전후 모두 green 실측).
 */
function stripComments(source: string): string {
  return source.replace(/(^|[^:])\/\/[^\n]*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('DOM 정체성 불변식', () => {
  it('PageTransition 은 AnimatePresence·exit 로 라우트 subtree 를 이중 마운트하지 않는다', () => {
    const source = stripComments(
      readFileSync(join(SRC_DIR, 'app', 'components', 'layout', 'page-transition.tsx'), 'utf8'),
    );

    // `{children}` 은 App Router 의 세그먼트 렌더러이지 렌더 시점 스냅샷이 아니다.
    // exit 로 구 key subtree 를 붙잡으면 그 안의 children 이 **현재(목적지) 라우트를 다시 렌더**해
    // 목적지가 2벌이 된다. mode="wait" 도 이 성질 자체는 없애지 못하므로 함께 금지한다.
    expect(
      source,
      'page-transition.tsx 에 AnimatePresence 가 되살아났습니다 — 라우트 전환마다 목적지 페이지가 ' +
        '2벌 마운트되어 전환 직후 사용자 입력이 ghost 로 들어가고 소실됩니다(CI run 32555133776).',
    ).not.toContain('AnimatePresence');

    expect(
      source,
      'page-transition.tsx 에 exit 애니메이션이 되살아났습니다 — 위와 같은 이중 마운트를 만듭니다.',
    ).not.toMatch(/\bexit=\{/);

    // 진입 애니메이션은 유지돼야 한다. 이 단언이 없으면 "컴포넌트를 통째로 비우는" 것도 통과한다.
    expect(
      source,
      '진입 애니메이션(initial/animate)이 사라졌습니다 — 이 계약은 exit 제거를 요구하는 것이지 ' +
        '전환 효과 제거를 요구하지 않습니다.',
    ).toMatch(/initial=\{[\s\S]*?animate=\{/);
  });

  it('StandardDataTable 은 display 전환에도 표 시맨틱이 남도록 명시 role 을 유지한다', () => {
    // md 미만에서 globals.css 가 table/thead/tbody/tr/td 를 display:block 으로 바꾼다(ADR-0006).
    // display 를 바꾸면 <table> 계열의 **암시 role 이 사라지므로** 명시 role 이 유일한 방어선이다.
    //
    // ⚠ 이 검사가 왜 렌더 테스트가 아니라 소스 계약인가: jsdom 은 CSS 를 적용하지 않아
    //   role 속성을 지워도 암시 role 로 통과한다(2026-08-22 red 증명에서 실측). 렌더 테스트로는
    //   이 축을 원리적으로 지킬 수 없다.
    const source = stripComments(
      readFileSync(join(SRC_DIR, 'app', 'components', 'ui', 'standard-data-table.tsx'), 'utf8'),
    );

    for (const [element, role] of [
      ['table', 'table'],
      ['thead', 'rowgroup'],
      ['tbody', 'rowgroup'],
    ] as const) {
      expect(
        source,
        `<${element}> 에 role="${role}" 이 없습니다 — md 미만 display:block 전환에서 표 시맨틱이 ` +
          '통째로 사라져 보조기술 사용자가 행·열 관계를 잃습니다.',
      ).toMatch(new RegExp(`<${element}[\\s\\n]+role="${role}"`));
    }

    // 카드 표현이 열 이름을 보여주는 유일한 경로다. 사라지면 md 미만에서 값만 남는다.
    expect(
      source,
      'td 의 data-label 이 사라졌습니다 — globals.css 의 td::before content:attr(data-label) 이 빈 값이 됩니다.',
    ).toContain('data-label=');

    // 이중 트리 부활의 직접 신호. 단일 표 트리에는 이 조합이 존재할 이유가 없다.
    expect(
      source,
      "'md:hidden' 이 되살아났습니다 — 표·카드 이중 렌더가 부활했을 가능성이 높습니다(ADR-0006).",
    ).not.toContain('md:hidden');
  });

  it('한 파일 안에서 같은 data-testid 리터럴이 두 번 이상 쓰이지 않는다', () => {
    // 목록 행 액션과 상세 패널 액션이 같은 testid 를 공유하면, 같은 항목을 선택했을 때
    // testid 로도 접근 이름으로도 구분되지 않는다(MailHistoryHubClient 가 실제로 그랬다).
    //
    // ⚠ 이 계약은 **소스의 정적 리터럴만** 본다. accessor 가 런타임에 만드는 식별자의 중복은
    //   여기서 잡히지 않는다 — 그 축(구 PROD-3, 표·카드 이중 렌더)은 2026-08-22 ADR-0006 으로
    //   해소됐고 회귀는 ui/__tests__/standard-data-table-single-render.test.tsx 가 담당한다.
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!/^(__tests__|node_modules|\.next)$/.test(entry.name)) walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\./.test(entry.name)) continue;

        const source = readFileSync(full, 'utf8');
        const counts = new Map<string, number>();
        for (const match of source.matchAll(/data-testid=["']([^"']+)["']/g)) {
          counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
        }
        for (const [id, count] of counts) {
          if (count > 1) offenders.push(`${relative(FRONTEND_DIR, full).replace(/\\/g, '/')} → "${id}" ×${count}`);
        }
      }
    };
    walk(SRC_DIR);

    expect(
      offenders,
      [
        '같은 파일 안에서 data-testid 가 중복됐습니다. 서로 다른 UI 위치라면 식별자를 나누십시오',
        '(예: delete-mail-btn / mail-detail-delete-btn). 중복은 strict mode violation 을 만들고,',
        '접근 이름까지 같으면 보조기술 사용자도 두 컨트롤을 구분하지 못합니다:',
        ...offenders.map((o) => `  ${o}`),
      ].join('\n'),
    ).toEqual([]);
  });
});
