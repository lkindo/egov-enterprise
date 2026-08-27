/**
 * 화면이 없는 것을 약속하지 않는다 — 어포던스 정직성 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 이 저장소의 UI 결함 중 가장 비싼 부류는 "동작하지 않는다"가 아니라 **"동작하는 것처럼
 * 보인다"** 였다. 사용자는 없는 절차를 기다리고, 나오지 않을 값을 찾아 조건을 계속 바꾸고,
 * 해소되지 않을 오류를 새로고침한다. 그 시간은 전부 사용자가 지불한다.
 *
 * 문구 하나를 고치는 것으로는 재발을 막지 못한다 — 다음 사람이 되돌리면 그만이다. 그래서
 * "무엇이 사실인가"를 코드 옆에 고정한다. 아래 세 축은 전부 2026-08-28 저장소 실측이다.
 *
 * 이 계약이 red 가 되는 정상적인 경우가 하나 있다: **해당 기능을 실제로 구현했을 때.**
 * 그때는 이 파일의 해당 항목을 지우고 진짜 동작을 검증하는 테스트로 교체한다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC = path.resolve(__dirname, '..');

const readSrc = (relative: string) => fs.readFileSync(path.join(SRC, relative), 'utf8');
const readRepo = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/** 디렉터리 아래 .java 소스를 전부 읽는다(파일 경로가 아니라 내용으로 판정하기 위해). */
function collectJavaSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJavaSources(full));
    else if (entry.name.endsWith('.java')) out.push(fs.readFileSync(full, 'utf8'));
  }
  return out;
}

/** 주석 안의 문자열을 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

describe('포상: 없는 승인 절차를 약속하지 않는다', () => {
  const client = stripComments(readSrc('app/admin/operation/rewards/RewardManageClient.tsx'));

  it('승인 상태·일시 열을 표에 두지 않는다 — 그 값을 바꿀 경로가 제품에 없다', () => {
    /*
     * RewardManageApiController 에는 GET 목록과 POST 등록 두 개뿐이고 PUT/PATCH 가 없다.
     * RewardManageService 에도 confmYn 을 갱신하는 메서드가 없다. 그래서 두 열은 전 건 영구
     * '대기중'·빈칸이었고, 결재자는 무엇을 눌러야 할지 등록자는 왜 안 넘어가는지 알 수 없었다.
     */
    expect(client).not.toContain('승인상태');
    expect(client).not.toContain('승인일시');
  });

  it('승인자 ID 를 미리 박지 않는다 — 승인되지 않은 기록에 승인자를 쓰면 데이터가 거짓이 된다', () => {
    expect(client).not.toContain('sanctnerId');
  });

  it('서버 auditing 이 채우는 등록자·수정자를 클라이언트가 위조하지 않는다', () => {
    expect(client).not.toContain("frstRgtrId: 'SYSTEM'");
    expect(client).not.toContain("lastMdfrId: 'SYSTEM'");
  });

  it('승인 갱신 경로가 실제로 없다 — 있는데도 열을 지웠다면 이 계약이 틀린 것이다', () => {
    const controller = readRepo(
      'api-server/src/main/java/nuri/api/controller/business/operation/RewardManageApiController.java',
    );
    expect(controller).not.toContain('@PutMapping');
    expect(controller).not.toContain('@PatchMapping');
  });
});

describe('통계: 수집되지 않는 지표를 기간 탓으로 돌리지 않는다', () => {
  const client = stripComments(readSrc('app/admin/stats/IntelligenceHubClient.tsx'));

  it('계측 writer 가 없는 탭은 기간 문구가 아니라 미수집 사실을 말한다', () => {
    /*
     * '선택한 기간에 집계된 통계가 없습니다' 는 기간을 바꾸면 나온다는 뜻이다. 아래 네 탭은
     * 읽는 테이블에 쓰는 쪽이 없어 어떤 기간에도 값이 없다 — 사용자는 조건만 계속 바꾸게 된다.
     */
    expect(client).toContain('UNINSTRUMENTED_TABS');
    for (const tab of ['USER_STATS', 'CONTENT_STATS', 'DATA_USAGE', 'REPORTS']) {
      expect(client, `${tab} 이 미수집 목록에서 빠졌다`).toMatch(
        new RegExp(`UNINSTRUMENTED_TABS[\\s\\S]{0,200}${tab}`),
      );
    }
    expect(client).toContain('아직 수집되지 않습니다');
  });

  it('SYSTEM_STATS 는 미수집 목록에 넣지 않는다 — 이 축만 실제 writer 가 있다', () => {
    // loginLog 는 LogService 가 실제로 기록한다. 값이 있는 탭까지 '미수집'이라고 하면 새 거짓말이다.
    const list = client.match(/UNINSTRUMENTED_TABS[^;]*;/)?.[0] ?? '';
    expect(list).not.toContain('SYSTEM_STATS');
  });

  it('미수집 판정의 근거가 유지된다 — 보고서 통계 저장 경로가 제품에 노출되면 이 계약을 갱신해야 한다', () => {
    /*
     * ⚠ ReportStatsService 에는 insertReprtStats(save 포함)가 **있다.** 그러나 호출자가
     *   자기 단위 테스트뿐이라 제품 경로에서는 한 번도 실행되지 않는다(전 저장소 grep 실측).
     *   저장소의 UnreachableServiceLinterTest·unreachableActions 와 같은 판정이다 —
     *   "코드가 있다"와 "실행 경로가 있다"는 다르고, 사용자가 보는 것은 후자다.
     *   API 로 노출되는 순간 REPORTS 탭에 값이 생기므로 그때 문구를 되돌려야 한다.
     */
    const apiSources = collectJavaSources(path.join(ROOT, 'api-server', 'src', 'main'));
    const exposed = apiSources.filter((source) => source.includes('insertReprtStats'));
    expect(exposed).toEqual([]);
  });
});

describe('정책: 권한 벽을 일시 장애처럼 안내하지 않는다', () => {
  it('열람 실패가 권한 때문이면 기다리라고 하지 않는다', () => {
    /*
     * 본문은 /api/v1/admin/system/policies/{type} 에서 읽는데 그 경로는 ROLE_ADMIN·ROLE_SYSTEM
     * 전용이다. 일반 사용자에게는 영구 403 이라, '잠시 후 다시 시도' 는 끝나지 않는 새로고침을
     * 유도한다.
     */
    const page = stripComments(readSrc('app/help/policies/[type]/page.tsx'));
    expect(page).toContain('403');
    expect(page).toContain('관리자만 열람할 수 있습니다');
  });

  it('관리 허브가 이 화면을 공개 페이지라고 부르지 않는다', () => {
    const hub = stripComments(readSrc('app/admin/user/UserOrgHubClient.tsx'));
    expect(hub).not.toContain('공개 페이지에 노출되는 정책 본문');
  });
});

/**
 * 커뮤니티 상세: 없는 데이터를 'Live' 로 보여 주지 않는다.
 *
 * 이 화면은 회원 수를 '42_Active_Entities' 로 고정 출력하고, 하드코딩한 다섯 명을
 * 'Live' 라벨과 초록 점으로 **접속 중인 실제 회원처럼** 보여 줬다. 그런데 회원 수를 내려주는
 * API 도, 회원 목록을 내려주는 경로도 없다 — /api/v1/communities 는 목록·상세·join 3개뿐이고
 * CommunityDto 에 회원 수 필드가 없다(2026-08-28 실측).
 *
 * 지어낸 숫자는 단순한 잡음이 아니다. 관리자가 그 값을 근거로 판단하기 때문이다.
 */
describe('커뮤니티 상세: 지어낸 지표와 죽은 버튼을 두지 않는다', () => {
  const client = stripComments(
    readSrc('app/cop/cmy/selectCommunityDetail/[id]/CommunityDetailHubClient.tsx'),
  );

  it('회원 수를 고정 문자열로 지어내지 않는다', () => {
    expect(client).not.toContain('42_Active_Entities');
    expect(client).not.toContain('Member Count');
  });

  it("하드코딩한 회원 목록을 'Live' 로 보여 주지 않는다", () => {
    expect(client).not.toContain('Member_Pulse');
    expect(client).not.toContain('Active_Entity_');
  });

  it('눌러도 아무 일이 없는 버튼을 두지 않는다', () => {
    expect(client).not.toContain('ADMIN_PANEL_LOGIN');
    expect(client).not.toContain('VIEW_ALL_ENTITIES');
  });

  it('조회하지 않은 채 게시글이 없다고 단정하지 않는다', () => {
    // 이 섹션은 어떤 조회도 하지 않는다 — 실제로 글이 있는 커뮤니티에서도 비었다고 말했다.
    expect(client).not.toContain('등록된 게시글이 없습니다');
    expect(client).toContain('아직 제공되지 않습니다');
  });

  it('회원 수 API 가 여전히 없다 — 생기면 이 계약을 갱신하고 값을 되살려야 한다', () => {
    const controller = readRepo(
      'api-server/src/main/java/nuri/api/controller/business/community/CommunityUserApiController.java',
    );
    expect(stripComments(controller)).not.toContain('members');
  });
});
