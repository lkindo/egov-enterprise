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
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
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

  it('한 파일 안에서 같은 data-testid 리터럴이 두 번 이상 쓰이지 않는다', () => {
    // 목록 행 액션과 상세 패널 액션이 같은 testid 를 공유하면, 같은 항목을 선택했을 때
    // testid 로도 접근 이름으로도 구분되지 않는다(MailHistoryHubClient 가 실제로 그랬다).
    //
    // ⚠ 이 계약의 한계: **소스의 정적 리터럴만** 본다. StandardDataTable 이 데스크톱 테이블과
    //   모바일 카드를 동시 렌더해 accessor 산출물이 런타임에 2배가 되는 축(PROD-3)은 잡지 못한다.
    //   그 축은 별도 과제이며 여기서 잡힌다고 오해하지 말 것.
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
