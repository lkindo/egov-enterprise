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
     * '선택한 기간에 집계된 통계가 없습니다' 는 기간을 바꾸면 나온다는 뜻이다. 아래 세 탭은
     * 읽는 테이블에 쓰는 쪽이 없어 어떤 기간에도 값이 없다 — 사용자는 조건만 계속 바꾸게 된다.
     *
     * [2026-08-28] CONTENT_STATS 는 이 목록에서 빠졌다 — 아래 별도 케이스가 그 근거를 고정한다.
     */
    expect(client).toContain('UNINSTRUMENTED_TABS');
    for (const tab of ['USER_STATS', 'DATA_USAGE', 'REPORTS']) {
      expect(client, `${tab} 이 미수집 목록에서 빠졌다`).toMatch(
        new RegExp(`UNINSTRUMENTED_TABS[\\s\\S]{0,200}${tab}`),
      );
    }
    expect(client).toContain('아직 수집되지 않습니다');
  });

  /**
   * CONTENT_STATS 를 미수집 목록에서 뺀 근거를 **서버 배선에 결속**한다.
   *
   * 종전에는 이 탭도 `dtaUseStatsRepository.countByDate` 를 불러 DATA_USAGE 와 완전히 같은
   * 질의였다 — 게시글을 하나도 세지 않았고, 그 표에는 쓰는 코드가 없어 늘 비어 있었다.
   * 이제 게시글을 실제로 센다.
   *
   * 목록에서만 빼고 서버가 되돌아가면 화면이 다시 거짓말한다("기간을 바꾸면 나온다"). 그래서
   * 프런트 목록과 서버 배선을 **함께** 검사한다.
   */
  it('CONTENT_STATS 가 미수집이 아닌 이유는 서버가 게시글을 실제로 세기 때문이다', () => {
    expect(client).not.toMatch(/UNINSTRUMENTED_TABS[\s\S]{0,200}CONTENT_STATS/);

    const service = readRepo(
      'business-app/src/main/java/nuri/business/service/stats/ReportStatsService.java',
    );
    const method = service.slice(service.indexOf('public List<Object[]> getBbsStatsByDate'));
    const body = method.slice(0, method.indexOf('}'));
    expect(body, '게시물 통계가 다시 자료이용현황 표를 읽는다').toContain('boardRepository.countPostsByDate');
    expect(body).not.toContain('dtaUseStatsRepository');
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

  /**
   * 개별 문자열만 금지하면 다음 지어낸 값이 그대로 들어온다.
   *
   * 실제로 그랬다 — '42_Active_Entities' 를 지운 뒤에도 바로 옆 줄에
   * `frstRegisterNm || 'System_Admin'` 이 남아 있었다. 서버는 그 필드를 **어떤 경로에서도
   * 채우지 않으므로**(CommunityDto.from() 이 frstRgtrId 만 매핑한다) 모든 커뮤니티가
   * '운영 담당자 = System_Admin' 으로 보였다. 같은 부류인데 계약이 이름 하나만 봤다.
   *
   * 그래서 검사를 **서버가 채우지 않는 필드를 읽지 않는다**는 축으로 넓힌다.
   */
  it('서버가 채우지 않는 필드를 읽고 기본값을 지어내지 않는다', () => {
    const dto = readRepo(
      'business-app/src/main/java/nuri/business/service/system/content/community/dto/CommunityDto.java',
    );
    const builder = dto.slice(dto.indexOf('CommunityDto.builder()'));
    // 선언만 있고 빌더에서 채우지 않는 필드는 화면이 읽으면 안 된다.
    expect(builder).not.toContain('.frstRegisterNm(');
    expect(client).not.toContain('frstRegisterNm');
    expect(client).not.toContain('System_Admin');
  });

  /**
   * ADR-0002 는 UI 한국어 우선을 규정한다. 이 화면은 라벨 자체가 의사코드였다 —
   * 'Operational Manager'·'Visibility Protocol'·'PUBLIC_ACCESS' 는 데이터의 뜻을 가린다.
   */
  it('업무 라벨을 의사코드로 쓰지 않는다', () => {
    for (const pseudo of [
      'Operational Manager', 'Initialization Date', 'Visibility Protocol',
      'PUBLIC_ACCESS', 'PRIVATE_NODE', 'Overview & Intelligence',
      'Knowledge Stream', 'Introduction_cn',
    ]) {
      expect(client).not.toContain(pseudo);
    }
    expect(client).toContain('등록자');
    expect(client).toContain('사용 여부');
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

/**
 * 계측 원천이 없는 값을 지표처럼 보여 주지 않는다.
 *
 * ── 부류 ──────────────────────────────────────────────────────────────────────
 * 소스에 **문자열/숫자로 박힌 상수**를 화면이 '지표'·'실시간'·'측정' 어휘와 함께 렌더하면,
 * 사용자는 그것을 실행 중인 시스템을 계측한 값으로 읽는다. 관제 화면에서 특히 위험하다 —
 * 그 화면의 존재 이유가 "지금 상태를 알려 주는 것" 이기 때문이다.
 *
 * 문자열 하나를 금지하면 다음 사람이 다른 숫자를 넣는다. 그래서 **원천이 없는데 계측 어휘를
 * 쓰는 것** 자체를 막는다.
 */
describe('계측 원천 없는 지표 금지', () => {
  const monitoringPanels = stripComments(
    readRepo('frontend/src/app/admin/system/monitoring/components/MonitoringPanels.tsx'),
  );

  it('관제 패널이 하드코딩된 성능 수치를 지표로 보여 주지 않는다', () => {
    /*
      종전에는 meta 객체에 "메모리 점유 1.2GB | 스캔 속도 240ms | 정밀도 100%" 같은 문자열이
      박혀 있었고 화면이 'PERFORMANCE METRICS' 라벨로 그것을 렌더했다. 어떤 계측도 없었다.
    */
    for (const fabricated of [
      '메모리 점유', '스캔 속도', '계약 검증률', '보안 점수', '자가치유율', '평균 복구',
      'PERFORMANCE METRICS',
    ]) {
      expect(monitoringPanels, `계측 원천 없이 '${fabricated}' 를 표시한다`).not.toContain(fabricated);
    }
  });

  it("정적 요약을 '실시간'이라 부르지 않는다", () => {
    // 이 패널의 내용은 저장소 규범 문서를 요약한 정적 텍스트다. 폴링도 구독도 없다.
    expect(monitoringPanels).not.toMatch(/실시간 (?:DB 호출 스택|JPA)/);
  });

  it('현재 페이지만 반출하면서 서버 전량 반출이 불가능하다고 말하지 않는다', () => {
    /*
      모달은 현재 페이지만 반출한다(scope="page"). 그런데 안내가 "서버 전량 반출은 지원하지
      않으며" 라고 단정했다 — 이 제품에는 로그 5종의 서버측 전량 export 가 실재한다.
      할 수 있는 일을 없다고 말하면 사용자는 존재하는 기능을 찾지 않는다.
    */
    const hub = stripComments(
      readRepo('frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx'),
    );
    expect(hub).not.toContain('서버 전량 반출은 지원하지 않으며');
    expect(hub).toContain('이 모달은 현재 페이지만 반출하며');
  });
});

/**
 * 화면이 **없는 것을 있다고 말하지 않는다.**
 *
 * ── 부류 ──────────────────────────────────────────────────────────────────────
 * 세 가지 얼굴이 있고 셋 다 같은 뿌리다 — 화면 문구가 제품의 실제 상태보다 앞서 나간다.
 *
 * ① 도메인에 없는 필드를 조회한다고 말한다 (부서 업무 '기한·처리 상태')
 * ② 존재하지 않는 대체 경로로 안내한다 (결재 '기존 경로', 레이아웃 '[콘텐츠 운영] 탭')
 * ③ 서버가 하지 않는 일을 확인 문구가 약속한다 (그룹 삭제 '접근 정책이 함께 사라집니다')
 *
 * 어느 쪽이든 사용자는 있지도 않은 것을 찾아 헤매고, 그 시간은 전부 낭비다. ③은 더 나쁘다 —
 * 파괴적 동작의 범위를 잘못 알려 주면 되돌릴 수 없는 판단을 잘못하게 만든다.
 */
describe('없는 것을 있다고 말하지 않는다', () => {
  it('부서 업무가 도메인에 없는 필드를 조회한다고 말하지 않는다', () => {
    const entity = stripComments(
      readRepo('business-core/src/main/java/nuri/business/domain/deptjob/DeptJob.java'),
    );
    // 실제로 있는 축 — 이 단언이 계약의 입력이다.
    for (const field of ['picId', 'prrtyRnk', 'deptTaskBoxSn']) {
      expect(entity, `DeptJob 에서 ${field} 를 찾지 못했다 — 계약이 vacuous 하다`).toContain(field);
    }
    // 없는 축. 컬럼이 생기면(Flyway) 이 단언을 뒤집고 문구를 되살려라.
    expect(entity).not.toMatch(/dueDt|deadline|sttsCd/);

    const screen = stripComments(readRepo('frontend/src/app/admin/work-hub/WorkHubClient.tsx'));
    expect(screen).not.toContain('담당·기한·처리 상태');
    expect(screen).toContain('담당자·우선순위·업무함');
  });

  it('업무 보고 범위를 실제 스코프보다 넓게 말하지 않는다', () => {
    /*
      서버는 비관리자에게 본인 보고만 준다(WorkReportService 가 인증 주체로 scopedId 를
      덮어쓴다). 그런데 화면은 '조직에서 작성된' 이라 말해, 일반 사용자는 조직 전체를
      본다고 믿으면서 실제로는 자기 것만 봤다.
    */
    const service = stripComments(
      readRepo('business-app/src/main/java/nuri/business/service/report/WorkReportService.java'),
    );
    expect(service).toContain('getCurrentLoginId');

    const screen = stripComments(readRepo('frontend/src/app/admin/work-hub/WorkHubClient.tsx'));
    expect(screen).not.toContain('조직에서 작성된');
    expect(screen).toContain('관리자 권한이면 전체 보고가 조회됩니다');
  });

  it('존재하지 않는 대체 경로로 안내하지 않는다', () => {
    const draft = stripComments(
      readRepo('frontend/src/app/approvals/draft/ApprovalDraftHubClient.tsx'),
    );
    expect(draft).not.toContain('결재 목록 화면의 기존 경로');

    const layout = stripComments(
      readRepo('frontend/src/app/admin/system/layout/LayoutManagerClient.tsx'),
    );
    // '[콘텐츠 운영]' 이라는 메뉴는 시드에 없다. 실재하는 메뉴는 '배너 및 팝업 관리' 다.
    expect(layout).not.toContain('콘텐츠 운영');
    expect(layout).toContain('/admin/system/banner');
  });

  it('삭제 확인 문구가 서버가 하지 않는 정리를 약속하지 않는다', () => {
    const service = stripComments(
      readRepo('business-core/src/main/java/nuri/business/service/group/GroupManageService.java'),
    );
    // 서버가 실제로 하는 일: 배정 사용자의 groupId 해제 + 그룹 행 삭제. '접근 정책' 은 없다.
    expect(service).toContain('clearGroupIdByGroupIdIn');
    expect(service).not.toMatch(/accessPolicy|정책/);

    const screen = stripComments(
      readRepo('frontend/src/app/admin/security/group/SecurityGroupClient.tsx'),
    );
    expect(screen).not.toContain('연결된 접근 정책이 함께 사라집니다');
  });

  it('눌러도 아무 일이 없는 버튼을 두지 않는다', () => {
    /*
      마이페이지의 '관리' 열은 onClick 없는 ⋮ 버튼이었다. 메뉴가 열릴 것처럼 보이는 아이콘과
      '위젯 추가 옵션' 이라는 aria-label 까지 달려 있어 스크린리더 사용자에게 더 분명한
      거짓말이었다.
    */
    const screen = stripComments(
      readRepo('frontend/src/app/admin/workspace/my-page/WorkspaceMyPageClient.tsx'),
    );
    expect(screen).not.toContain('위젯 추가 옵션');
    expect(screen).not.toContain('MoreVertical');
  });
});

/**
 * 같은 화면 안에서 한쪽은 '미수집' 이라 하고 다른 쪽은 0을 측정값으로 보여 주지 않는다.
 *
 * 통계 허브의 차트는 사용자·자료이용·보고서 세 축을 이미 '미수집' 으로 고지했다. 그 표에
 * 쓰는 코드가 저장소에 없어(writer 0건) **아무도 기록하지 않기 때문**이다. 그런데 요약 카드는
 * 같은 축의 합계 0을 숫자로 찍었다. 사용자는 "활동이 0건" 으로 읽는다 — 없는 것과 세지 않는
 * 것은 다른데, 화면이 그 차이를 지웠다.
 */
describe('미수집 축을 0으로 보여 주지 않는다', () => {
  const statsHub = stripComments(
    readRepo('frontend/src/app/admin/stats/IntelligenceHubClient.tsx'),
  );

  it('미수집으로 고지한 축의 요약 카드가 합계를 숫자로 찍지 않는다', () => {
    // 고지 목록이 계약의 입력이다 — 여기서 축이 빠지면(writer 신설) 이 검사도 함께 판정한다.
    expect(statsHub, '미수집 목록을 찾지 못했다 — 계약이 vacuous 하다')
      .toContain("UNINSTRUMENTED_TABS: readonly StatsTab[] = ['USER_STATS', 'DATA_USAGE', 'REPORTS']");

    expect(statsHub).not.toContain('sumStatsCo(userStats)');
    expect(statsHub).not.toContain('sumStatsCo(dataUsage)');
    // 계측 원천이 있는 접속 통계는 그대로 값을 보여 준다 — 금지만 하는 계약이 되지 않게.
    expect(statsHub).toContain('sumStatsCo(connectStats)');
  });
});

/**
 * 생성 마법사가 실제로 만드는 상태를 말한다.
 *
 * 게시판 생성 마법사는 메뉴를 `useYn: 'N'`(미사용)으로 만든다. 그런데 안내는 '생성 즉시
 * 메뉴 시스템에 활성화됩니다', 완료 화면은 '메뉴에 성공적으로 연결되었습니다' 라고 했다.
 * 관리자는 메뉴가 나타날 것으로 믿고 기다렸고, 나타나지 않는 이유를 알 방법이 없었다.
 *
 * 문구만 검사하면 다음 사람이 `useYn` 을 'Y' 로 바꾸면서 문구를 되돌릴 수 있다 — 그건
 * 권한 축을 우회해 전 관리자에게 즉시 노출되는 제품 결정이다. 그래서 **소스의 실제 값과
 * 화면 문구를 함께** 고정한다.
 */
describe('생성 마법사가 만드는 상태를 사실대로 말한다', () => {
  const wizard = stripComments(
    readRepo('frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx'),
  );

  it('메뉴를 비활성으로 만들면 비활성이라고 말한다', () => {
    // 실제 값이 계약의 입력이다. 'Y' 로 바꾸는 것은 제품 결정이며, 그때 문구도 함께 바뀐다.
    expect(wizard, "메뉴 생성의 useYn 을 찾지 못했다 — 계약이 vacuous 하다").toContain("useYn: 'N'");
    expect(wizard).not.toContain('생성 즉시 메뉴 시스템에 활성화됩니다');
    expect(wizard).toContain('메뉴 관리에서 활성화');
  });

  /**
   * 집행자 없는 게시판 옵션을 묻지 않는다.
   *
   * DOM 부재는 자매 파일(BoardMakerWizard.accessibility.test.tsx)이 잡는다. 여기서는 **왜**
   * 걷었는지를 고정한다 — 두 값이 조건문에 쓰이지 않는다는 사실이 그 근거이므로, 집행이
   * 생기면 이 계약이 red 가 되어 토글을 되살릴 시점을 알려 준다.
   */
  it('댓글·첨부 플래그의 집행자가 여전히 없다 — 생기면 이 계약을 갱신하고 토글을 되살려야 한다', () => {
    const detail = stripComments(
      readRepo('frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx'),
    );
    expect(detail, '게시글 상세에서 CommentSection 을 찾지 못했다 — 계약이 vacuous 하다').toContain('<CommentSection');
    // 렌더 자체가 무조건이다. 게이트가 생기면 이 단언이 red 가 된다.
    expect(detail).not.toMatch(/ansPsbltyYn\s*[=!]==?/);
    expect(detail).not.toMatch(/ansPsbltyYn\s*&&/);

    // 서버도 게시판 마스터를 보지 않는다.
    const commentService = stripComments(
      readRepo('business-app/src/main/java/nuri/business/service/comment/CommentService.java'),
    );
    expect(commentService, 'CommentService 를 찾지 못했다 — 계약이 vacuous 하다').toContain('class CommentService');
    expect(commentService).not.toContain('BoardMaster');
  });

  /**
   * 사용자 선택기가 서버에 없는 검색 축을 약속하지 않는다.
   *
   * 서버 술어는 `user.userNm.containsIgnoreCase(trimmed)` 하나이고, 특히 로그인 ID 매칭은
   * 계정 열거 방어를 위해 **의도적으로 배제**돼 있다(UserRepositoryImpl 주석). 화면이 그
   * 결정을 뒤집어 'ID 로도 찾을 수 있다' 고 말하면, 사용자는 되지 않는 검색을 반복하다
   * "그런 사람이 없다" 고 잘못 결론 내린다.
   *
   * 서버 술어 자체도 함께 본다 — 부서·ID 축이 실제로 생기면 이 계약이 red 가 되어 문구를
   * 되살릴 시점을 알려 준다.
   */
  it('사용자 선택기의 안내가 실제 검색 축(성명)과 일치한다', () => {
    const picker = stripComments(readRepo('frontend/src/app/components/ui/user-picker.tsx'));
    expect(picker, '사용자 선택기를 찾지 못했다 — 계약이 vacuous 하다').toContain('사용자 검색어 입력');
    expect(picker).not.toContain('이름, 부서, ID');
    expect(picker).not.toContain('부서명');

    const repo = stripComments(
      readRepo('business-core/src/main/java/nuri/business/domain/user/repository/UserRepositoryImpl.java'),
    );
    // ⚠ 파일 전체를 보면 안 된다. 같은 파일의 getPagedUserList(관리자 사용자 목록)는 로그인 ID
    //   검색을 **정당하게** 쓴다 — 그 메서드까지 묶으면 계약이 엉뚱한 곳을 신고한다.
    const start = repo.indexOf('searchAssignableUsers');
    expect(start, 'searchAssignableUsers 를 찾지 못했다 — 계약이 vacuous 하다').toBeGreaterThan(-1);
    // 다음 메서드 선언 직전까지가 이 메서드의 본문이다.
    const next = repo.indexOf('public ', start);
    const body = repo.slice(start, next > start ? next : undefined);
    expect(body, '메서드 본문 추출이 깨졌다 — 계약이 vacuous 하다').toContain('userNm');
    // 성명 외 축이 이 메서드의 where 에 들어오면 red 다.
    expect(body).not.toContain('userId.containsIgnoreCase');
    expect(body).not.toContain('deptNm.containsIgnoreCase');
  });

  it('알림 드로어에 갈 곳 없는 버튼과 지어낸 시스템 이름을 두지 않는다', () => {
    const drawer = stripComments(
      readRepo('frontend/src/app/components/ui/app-notification-drawer.tsx'),
    );
    expect(drawer, '드로어를 찾지 못했다 — 계약이 vacuous 하다').toContain('AppNotificationDrawer');

    // 전체 삭제: 서버에 일괄 삭제 경로가 없다(단건 DELETE 뿐).
    expect(drawer).not.toContain('알림 전체 삭제');
    // 상세 보기: /admin/notifications 에 [id] 세그먼트가 없다.
    expect(drawer).not.toContain('상세 보기');
    // '무결성 피드' 는 저장소에 없는 시스템 이름이다 — 이 화면은 알림 목록을 보여 준다.
    expect(drawer).not.toContain('무결성 피드');
  });

  it('예시 데이터로 그린 미리보기를 실시간 시스템이라 부르지 않는다', () => {
    expect(wizard).not.toContain('LIVE_SYSTEM_PREVIEW');
    const preview = stripComments(
      readRepo('frontend/src/app/admin/community/boards/maker/components/BoardPreview.tsx'),
    );
    expect(preview).not.toContain('SYSTEM_PREVIEW_GENERATOR');
    // 미리보기가 외부 호스트로 나가지 않는다 — 레이아웃 확인에 사진이 필요하지 않다.
    expect(preview).not.toContain('unsplash.com');
  });
});
