import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * A1 archetype 채택 census — 이행이 진행 중임을 **숫자로** 고정한다.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §6·§7.
 *
 * 이 게이트가 없으면 이행은 "했다는 주장"으로만 남는다. 화면 문법은 컴포넌트가 존재한다고
 * 지켜지는 게 아니라 **화면이 그것을 경유할 때** 지켜지기 때문에, 두 모집단을 exact 로 묶는다.
 *
 *   ADOPTERS       WorkListPage 를 경유하는 화면 수 — 줄어들면 red(이행 되돌리기 차단)
 *   DIRECT_ONLY    셸 없이 StandardDataTable 을 직접 조립하는 화면 수 — 늘어나면 red(신규 유입 차단)
 *
 * ⚠ DIRECT_ONLY 의 목표는 0 이 아니다. 마스터-디테일(A2)·매트릭스(A5)처럼 A1이 아닌
 *   archetype 은 정당하게 직접 소비한다 — 각 화면이 자기 셸로 이행할 때 함께 내려간다. 지금 0 을
 *   목표로 잡으면 A1 이 아닌 화면을 A1 셸에 우겨넣는 잘못된 압력이 된다.
 *
 * 값을 바꿀 때는 소스를 먼저 고치고 **실측 red 를 확인한 뒤** 상수를 갱신한다.
 * ADOPTERS 상향과 DIRECT_ONLY 하향만 정상 경로다(AGENTS H2).
 */
// [2026-09-06 DEC-OPS-040] 40 → 39: /admin/system/ism(IsmClient)이 /approvals 로 통합돼 화면이 사라졌다 — 되돌리기가 아니라
//   같은 개인 결재함 두 화면을 하나로 모은 결과다(DEC-OPS-039 제안의 owner 승인). 정본 /approvals 는 A2 MasterDetailPage 소비자다.
// [2026-09-07] 39 -> 40: /admin/system/isg 신설. 백엔드 5본이 완비인데 프런트 호출부가 0 이라
//   등록 경로조차 없던 고아 도메인을 배선했다 — 되돌리기가 아니라 새 A1 소비자다.
// [2026-09-08 PD-SRVY-001] 40 -> 39: /admin/survey/respondents 를 걷었다. tb_srvy_rspdnt 는 성명·
//   생년월일·전화번호를 담는데 응답 결과와 ID 로 연결되지 않고 행을 만드는 경로가 없어 그 A1 화면은
//   **항상 빈 목록**이었다. 되돌리기가 아니라 표면 제거이며, 사용자 결정(PD-SRVY-001)에 따른다.
// [2026-09-08 PD-MYPG-001] 39 -> 38: /admin/workspace/my-page 를 걷었다. tb_indv_pg_conts 는 시드도
//   생성 경로도 없고 **그 값을 읽는 화면조차 없어**(대시보드 위젯 SPI 구현 2개가 쓰지 않는다) 켜고
//   꺼도 어디에도 나타나지 않았다. 되돌리기가 아니라 표면 제거이며 사용자 결정(PD-MYPG-001)에 따른다.
// The unified authority hub adopts WorkListPage and retires one direct table.
const ADOPTERS = 39;
const DIRECT_ONLY = 3;

const TABLE_IMPORT = 'components/ui/standard-data-table';
const SHELL_IMPORT = 'components/patterns/work-list-page';
/**
 * A1 이 아닌 archetype 셸들. 이 셸을 쓰는 화면은 "셸 없이 직접 조립"이 아니다 —
 * A2(마스터-디테일)·A7(현황+원본 표)은 각자의 census 가 따로 검증한다.
 * 여기서 빼지 않으면 이미 이행한 화면이 영원히 미이행으로 집계된다.
 */
const OTHER_SHELL_IMPORTS = [
  'components/patterns/master-detail-page',
  'components/patterns/report-page',
];

/** 화면 파일만 센다 — 테스트와 로딩 스켈레톤은 소비자가 아니다. */
function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx')) return [];
    if (entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

/** `pagination={{ … }}` 로 넘기는 객체 본문만 잘라낸다(파일 전체 스캔의 오탐 방지). */
function paginationBlocks(code: string): string[] {
  const blocks: string[] = [];
  const opening = /pagination=\{\{/g;
  let match = opening.exec(code);
  while (match !== null) {
    const end = code.indexOf('}}', match.index);
    blocks.push(end === -1 ? code.slice(match.index) : code.slice(match.index, end));
    match = opening.exec(code);
  }
  return blocks;
}

function census() {
  const adopters: string[] = [];
  const directOnly: string[] = [];

  for (const path of screenFiles(APP_DIR)) {
    const source = readFileSync(path, 'utf8');
    const usesShell = source.includes(SHELL_IMPORT);
    const usesOtherShell = OTHER_SHELL_IMPORTS.some((shell) => source.includes(shell));
    const usesTable = source.includes(TABLE_IMPORT);
    const relativePath = relative(FRONTEND_DIR, path).split(sep).join('/');

    if (usesShell) adopters.push(relativePath);
    else if (usesTable && !usesOtherShell) directOnly.push(relativePath);
  }

  return { adopters: adopters.sort(), directOnly: directOnly.sort() };
}

describe('A1 archetype 채택 census', () => {
  const { adopters, directOnly } = census();

  it(`WorkListPage 경유 화면은 ${ADOPTERS}개 이상이다(이행 되돌리기 차단)`, () => {
    expect(adopters.length, `현재 채택 화면:\n${adopters.join('\n')}`).toBe(ADOPTERS);
  });

  it(`셸 없이 표를 직접 조립하는 화면은 ${DIRECT_ONLY}개를 넘지 않는다(신규 유입 차단)`, () => {
    expect(
      directOnly.length,
      directOnly.length > DIRECT_ONLY
        ? `신규 ${directOnly.length - DIRECT_ONLY}건 유입 — 조회형 목록이면 WorkListPage 를 경유하세요.`
        : `${DIRECT_ONLY - directOnly.length}건 감소 — 이행분을 확정하려면 DIRECT_ONLY 를 ${directOnly.length}로 내리세요.`,
    ).toBe(DIRECT_ONLY);
  });

  it('셸을 쓰는 화면은 총 건수를 표 하단에 중복 표기하지 않는다', () => {
    const duplicated = adopters.filter((relativePath) => {
      const source = readFileSync(join(FRONTEND_DIR, relativePath), 'utf8');
      // ⚠ 주석을 먼저 지운다 — 이 규칙을 **설명하는 주석**이 대상 파일에 들어 있어서, 지우지 않으면
      //   계약이 자기 설명을 위반으로 신고한다(dom-identity-invariants 가 남긴 함정과 같은 것).
      // ⚠ [2026-08-29] 지우는 **순서**도 중요하다. 블록 주석을 먼저 지우면 줄 주석 안의 블록
      //   주석 여는 기호가 저 아래 닫는 기호까지 이어져 그 사이 실행 코드가 통째로 사라진다
      //   (실측: WorkHubClient.tsx 1,781자 소실). 이 census 는 소스를 전수로 훑으므로 그런
      //   파일이 하나만 생겨도 조용히 눈이 먼다. 콜론 가드는 URL 오인 방지용이다.
      const code = source.replace(/(^|[^:])\/\/[^\n]*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
      // 셸이 총 건수를 소유하므로 표 pagination 에 totalCount 를 다시 넘기면 위아래 이중 표기가 된다.
      // ⚠ 검사는 pagination 블록 **안**으로 한정한다 — 파일 전체를 훑으면 셸에 정상적으로 넘긴
      //   `totalCount={...}` 까지 걸려 오탐이 난다(2026-08-24 실측: 설문 응답자 화면).
      // ⚠ **속성 전달**만 본다. `totalPages: Math.ceil(totalCount / PAGE_SIZE)` 처럼 계산식에
      //   식별자로 쓰는 것은 이중 표기가 아니다(2026-08-25 실측: 온라인 설문 관리에서 오탐).
      return paginationBlocks(code).some((block) => /(^|[\s,{])totalCount\s*[,:}]/.test(block));
    });

    expect(duplicated, `총 건수 이중 표기:\n${duplicated.join('\n')}`).toEqual([]);
  });
});
