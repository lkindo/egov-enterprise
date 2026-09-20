import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(relativePath: string): string {
  return readFileSync(join(SRC, relativePath), 'utf8');
}

describe('r6 accessibility regressions', () => {
  it('makes the bounded scrollers of the user/org hub keyboard reachable and named', () => {
    const userHub = source('app/admin/user/UserOrgHubClient.tsx');
    const dataTable = source('app/components/ui/standard-data-table.tsx');

    /*
      [2026-09-20 업무형 이행] 종전 anchor 는 이 화면이 **직접** 만든 스크롤 영역의 탭 분기
      aria-label 이었다(`activeTab === 'DEPTS' ? '부서 조직 구조' : '조직·사용자 결과 스크롤 영역'`).
      사용자 결과가 StandardDataTable 로 넘어가면서 그 else 가지는 도달할 수 없는 코드가 됐고,
      표의 유계 스크롤은 셸이 `useOverflowRegion` 으로 소유한다 — 그쪽은 **실제로 넘칠 때만**
      role=region·tabIndex=0·이름을 붙이므로 손으로 만든 상시 tab stop 보다 정확하다.

      불변식은 그대로다: 이 화면의 유계 스크롤 영역은 키보드로 도달 가능하고 이름이 있다.
      anchor 만 (a) 화면에 남은 손수 스크롤 영역(부서 조직도)과 (b) 표에 대한 위임 사실로 옮긴다.
    */
    // (a) 부서 조직도 — 이 화면이 직접 만드는 유계 스크롤러.
    expect(userHub).toContain('aria-label="부서 조직 구조"');
    expect(userHub).toMatch(/role="region"[\s\S]*tabIndex=\{0\}[\s\S]*overflow-y-auto[^\"]*focus-visible:ring-2/);

    /*
      (b) 상세 본문 — 부서 탭에서는 포커스 가능한 자손이 하나도 없다(액션은 헤더가 갖고,
      권한 안내는 사용자 탭 전용이다). 부서 설명은 4,000자까지 들어가고 정의 목록은 의도적으로
      truncate 하지 않으므로 고정 높이 안에서 실제로 넘친다 → 키보드만 쓰는 사용자가 볼 방법이
      없어진다. 표와 같은 훅으로 **넘칠 때만** role·tabIndex·이름을 붙인다.
    */
    //     ⚠ 훅은 스크롤 노드와 같은 컴포넌트에서 불러야 한다 — 허브에서 부르고 props 만 내려보내면
    //       상세 패널이 선택 뒤에 마운트되므로 effect 가 다시 돌지 않아 **한 번도 붙지 않는다**.
    //       그래서 소스 문자열이 아니라 렌더 결과를 고정하는 계약이 따로 있다
    //       (app/admin/user/__tests__/detail-scroll-area.test.tsx). 여기서는 배선 형태만 본다.
    const parts = source('app/admin/user/UserOrgHubParts.tsx');
    expect(userHub).toContain('<DetailScrollArea>');
    expect(parts).toContain("useOverflowRegion<HTMLDivElement>('상세 정보 스크롤 영역')");

    /*
      (c) 사용자·부재 결과 — 유계 스크롤은 StandardDataTable 이 소유한다.

      ⚠ 이 축을 `not.toContain('stickyHeader={false}')` 같은 **부재 검사**로만 두면 안 된다.
        표가 통째로 사라지고 수제 `<div className="max-h-[600px] overflow-y-auto">` 로 되돌아가는
        회귀에서 그 단언은 공허하게 참이 되고(검사 대상이 없으니 금지 문자열도 없다), 속성 사이
        공백(`stickyHeader={ false }`)으로도 우회된다. 표의 존재를 **긍정으로** 고정한 뒤 그
        블록 안에서만 금지한다.
    */
    const tableBlock = userHub.match(/<StandardDataTable<UserManage>[\s\S]*?\/>/);
    expect(tableBlock, '사용자 목록은 StandardDataTable 을 경유해야 한다').not.toBeNull();
    expect(tableBlock?.[0]).not.toMatch(/stickyHeader\s*=\s*\{\s*false\s*\}/);
    expect(dataTable).toContain('useOverflowRegion<HTMLDivElement>');
    expect(dataTable).toContain('스크롤 영역');
  });

  it('does not dim repeated user identifiers or the empty-selection notice below the muted token', () => {
    const userHub = source('app/admin/user/UserOrgHubClient.tsx');

    expect(userHub).not.toContain('text-[10px] font-bold tracking-tight opacity-60');

    /*
      종전 anchor 였던 `text-3xl font-black text-muted-foreground tracking-tighter` 는 '선택 대기 중'
      히어로 heading 의 클래스였고, 업무형 이행에서 그 heading 자체가 한 줄 안내로 대체됐다.
      장식 클래스 문자열 대신 **성질**을 직접 검사한다 — 미선택 안내와 반복 식별자를 muted
      토큰보다 더 흐리게 만들지 않는다(투명도를 깎은 전경색은 대비를 조용히 떨어뜨린다).
    */
    expect(userHub).not.toMatch(/text-muted-foreground\/[0-9]/);
    expect(userHub).not.toMatch(/text-foreground\/[0-9]/);
    expect(userHub).toMatch(/role="status"[\s\S]{0,400}text-muted-foreground(?![/\w-])/);
  });

  it('keeps FAQ labels on full-strength semantic foreground tokens', () => {
    const help = source('app/help/HelpClient.tsx');

    expect(help).toContain('text-primary text-3xl');
    expect(help).not.toContain('text-primary opacity-30 text-3xl');
    expect(help).not.toContain('text-muted-foreground/60 hover:text-foreground');
    expect(help).toContain('text-muted-foreground hover:text-foreground');
  });

  /**
   * [2026-08-29] 이 검사가 보던 라벨이 사라졌다.
   *
   * 종전에는 감사 타임라인 헤더의 '보안 거버넌스 엔진 활성' 배지가 theme-aware
   * success-emphasis 토큰을 쓰는지(라이트 테마 대비 미달 회귀 방지) 확인했다. r6 시점의
   * 그 수정은 옳았지만, **그 배지 자체가 사실이 아니었다** — '보안 거버넌스 엔진' 이라는
   * 구성요소도 '실시간 데이터 무결성 모니터링' 이라는 동작도 저장소에 없다. 이 컴포넌트가
   * 하는 일은 tb_sys_log 조회 결과를 시간순으로 그리는 것뿐인데, 방패 아이콘과 초록색까지
   * 붙어 보안 장치가 돌고 있다는 뜻으로 읽혔다. 대비만 완벽한 거짓 상태였다.
   *
   * 검사를 지우면 emerald 리터럴이 다시 들어와도 아무도 모른다. 그래서 **하드코딩 금지**
   * 쪽으로 뒤집는다 — 배지가 되살아나더라도 토큰을 쓰게 강제된다.
   */
  it('감사 타임라인 상태 라벨에 emerald 리터럴이 되살아나지 않는다', () => {
    const timeline = source('app/components/ui/visual-audit-timeline.tsx');

    // 배지 자체의 부재(정직성 축)는 honest-affordance-contract 가 소유한다 — 그쪽은 주석을
    // 지우고 보므로 사유를 코드 옆에 적을 수 있다. 이 파일의 source() 는 원문을 그대로 읽어
    // 설명 주석까지 위반으로 신고하므로, 여기서는 r6 의 본래 축(하드코딩 대비 회귀)만 남긴다.
    expect(timeline).not.toContain('text-emerald-700 tracking-tight');
  });

  it('keeps A2 aria-current selection visible in Windows forced-colors mode', () => {
    const globals = source('app/globals.css');
    const forcedColors = globals.match(/@media \(forced-colors: active\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

    expect(forcedColors).toContain('[aria-current="true"]');
    expect(forcedColors).toMatch(/\[aria-current="true"\][\s\S]*outline:\s*2px solid Highlight/);
  });
});
