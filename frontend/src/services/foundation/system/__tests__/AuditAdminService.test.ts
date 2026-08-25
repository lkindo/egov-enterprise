/**
 * AuditAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/AuditAdminService.ts` 는 메서드가 `getAuditLogs` **단 하나**뿐인
 * 12줄짜리 서비스지만, 관리자 대시보드(`/admin`)·감사 타임라인(`/admin/system/audit`)·
 * 모니터링 허브(`/admin/system/monitoring`) **세 화면이 공유하는 유일한 감사 로그 진입점**이다.
 * 여기가 틀어지면 세 화면이 동시에 죽는데, 아래 항목들은 전부 **타입 검사와 컴파일을 통과한 채
 * 런타임에서만 조용히 깨진다** — 화면에는 빈 목록이나 "조회 실패" 토스트 한 줄만 남는다.
 *
 * 1) URL 조합 — `AdminService('/logs/system')` 은 `ApiService` 에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/logs/system` 이 된다(category 기본값 'system').
 *    **'system' 이 두 번 나오는 것이 정상**이다(접두의 system + 도메인 경로의 system).
 *    백엔드 실계약도 `/api/v1/admin/system/logs/system` 이다(api-docs.json 확인).
 *    중복처럼 보인다고 한쪽을 지우면 전 화면이 404 가 되고, 선행 슬래시가 붙으면 axios baseURL
 *    (`/api/v1`)의 경로 세그먼트가 통째로 날아간다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 에 맞춘다. 이 서비스의
 *    호출부는 **화면의 1-based 페이지에서 1을 빼서**(`page: page - 1`) 넘기므로, +1 이 사라지거나
 *    두 번 적용되면 목록이 한 페이지씩 밀리거나 첫 페이지가 통째로 빈다. 특히 `page: 0` 은
 *    falsy 라서, 변환 조건을 `!== undefined` 가 아닌 truthy 검사로 바꾸면 **첫 페이지만** 깨진다.
 *    타입은 그대로이므로 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 전달 규약 — 이 서비스는 같은 디렉터리의 `SurveyAdminService` 와 달리
 *    `searchKeyword || searchWrd || ''` 승격을 **하지 않는다**. `keyword` 를 받은 그대로 보내며,
 *    호출부가 주지 않으면 키 자체가 나가지 않는다. 이 차이를 모르고 "통일" 하면 두 서비스 중
 *    하나의 검색이 무력화된다.
 *
 * 4) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면 화면 이탈 시
 *    요청 취소가 동작하지 않는다. 유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *    또한 `{ ...config, params }` 의 **스프레드 순서**가 `params` 인자를 config 보다 우선시키는데,
 *    순서가 뒤집히면 전용 인자가 조용히 무시된다.
 *
 * 5) 응답·오류 무가공 — 감사 로그는 폴백으로 빈 목록을 만들어 주면 **"사건이 없었다"는 거짓**이 된다.
 *    서비스에 catch 가 없어 오류가 그대로 화면까지 올라가는 것이 계약이다.
 *
 * ※ 경로 변수 치환 축은 이 서비스에 **존재하지 않는다** — 메서드가 하나뿐이고 하위 경로가 ''라
 *   update/delete 자체가 없다. 없는 메서드를 지어내지 않고, 그만큼의 예산을 위 5개 축에 쓴다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { auditAdminService, type AuditLog } from '../AuditAdminService';

/**
 * 이 서비스의 모든 요청이 나가는 유일한 경로.
 * `AdminService('/logs/system')` + category 기본값 'system' → `admin/system/logs/system`
 * (선행 슬래시 없음, 후행 슬래시 없음).
 */
const BASE = 'admin/system/logs/system';

/** 목 호출 인자를 타입 있는 형태로 꺼낸다(`any` 없이 params 키를 직접 들여다보기 위함). */
type GetCall = [string, { params: Record<string, unknown> }];

describe('AuditAdminService — 감사 로그 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('URL 조합', () => {
    it('감사 로그 조회는 admin/system/logs/system 으로 나가며 선행·후행 슬래시가 붙지 않는다', async () => {
      await auditAdminService.getAuditLogs({});

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      // 선행 슬래시가 붙으면 axios 가 절대 경로로 해석해 baseURL('/api/v1')이 날아간다.
      expect(client.get).not.toHaveBeenCalledWith(`/${BASE}`, { params: {} });
    });

    it("접두의 'system' 과 도메인 경로의 'system' 이 둘 다 남는다 — 중복이 아니라 실계약이다", async () => {
      await auditAdminService.getAuditLogs({});

      const [path] = client.get.mock.calls[0] as GetCall;

      // 백엔드 실계약: /api/v1/admin/system/logs/system (api-docs.json).
      // 'system' 세그먼트가 2개여야 한다 — 하나로 줄이면 전 화면이 404 다.
      expect(path.split('/').filter((segment) => segment === 'system')).toHaveLength(2);
      expect(path).toBe(BASE);
      expect(path.startsWith('/')).toBe(false);
      expect(path.endsWith('/')).toBe(false);
    });

    it('반복 호출해도 경로가 누적되지 않는다 — 싱글턴 인스턴스의 basePath 는 불변이다', async () => {
      // auditAdminService 는 모듈 스코프 싱글턴이라, basePath 를 건드리는 변경이 생기면
      // 두 번째 호출부터 경로가 어긋나 앱 수명 내내 복구되지 않는다.
      await auditAdminService.getAuditLogs({ page: 0 });
      await auditAdminService.getAuditLogs({ page: 1 });

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([BASE, BASE]);
    });
  });

  describe('페이징 파라미터 변환', () => {
    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — truthy 검사로 바뀌면 첫 페이지만 빈다', async () => {
      await auditAdminService.getAuditLogs({ page: 0 });

      // page 는 지우지 않는다(Spring Data Pageable 병행 지원).
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 0, pageIndex: 1 } });
      // 0 을 falsy 로 취급해 변환을 건너뛰면 pageIndex 없이 나간다 — 그 형태를 명시적으로 배제한다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 0 } });
    });

    it('화면 2페이지(page 1)는 pageIndex 2 로 변환된다 — +1 이 빠지면 목록이 한 페이지씩 밀린다', async () => {
      // 호출부(AuditTimelineClient·MonitoringHubClient)는 1-based 화면 페이지에서 1을 빼서 넘긴다.
      await auditAdminService.getAuditLogs({ page: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 1, pageIndex: 2 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 1, pageIndex: 1 } });
    });

    it('page 4·size 10 은 pageIndex 5·recordCountPerPage 10 이 되고 원본 키도 함께 남는다', async () => {
      await auditAdminService.getAuditLogs({ page: 4, size: 10 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 4, size: 10, pageIndex: 5, recordCountPerPage: 10 },
      });
    });

    it('size 만 주면 recordCountPerPage 로만 확장되고 pageIndex 는 만들어지지 않는다', async () => {
      await auditAdminService.getAuditLogs({ size: 5 });

      // page 가 없으면 pageIndex 를 임의로 1 로 채우지 않는다 — 백엔드 기본값 판단에 맡긴다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { size: 5, recordCountPerPage: 5 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { size: 5, recordCountPerPage: 5, pageIndex: 1 },
      });
    });

    it('대시보드 실호출 형태(page 0·size 5)는 4개 키로 확장되어 나간다', async () => {
      // AdminDashboardClient / app/admin/page.tsx 가 실제로 쓰는 인자다(최근 5건 미리보기).
      await auditAdminService.getAuditLogs({ page: 0, size: 5 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, size: 5, pageIndex: 1, recordCountPerPage: 5 },
      });
    });
  });

  describe('검색어(searchKeyword) 전달 규약', () => {
    it('searchKeyword 는 승격·가공 없이 받은 그대로 전달된다', async () => {
      await auditAdminService.getAuditLogs({ page: 0, searchKeyword: '로그인' });

      // SurveyAdminService 처럼 searchKeyword/searchWrd 로 복제하지 않는다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, searchKeyword: '로그인', pageIndex: 1 },
      });
    });

    it('searchKeyword 를 주지 않으면 키 자체가 나가지 않는다 — 빈 문자열 기본값을 채우지 않는다', async () => {
      await auditAdminService.getAuditLogs({ page: 0 });

      const [, config] = client.get.mock.calls[0] as GetCall;

      // 이 서비스에는 `searchKeyword: ''` 폴백이 없다(SurveyAdminService 와의 결정적 차이).
      // 빈 문자열을 임의로 채우면 백엔드가 "빈 검색어로 필터" 로 해석할 여지가 생긴다.
      expect(Object.keys(config.params).sort()).toEqual(['page', 'pageIndex']);
    });

    it('검색어를 지운 상태(빈 문자열)는 빈 문자열 그대로 전송된다', async () => {
      // 타임라인 화면은 입력을 지우면 debouncedKeyword 가 '' 가 된 채 그대로 호출한다.
      await auditAdminService.getAuditLogs({ page: 0, size: 20, searchKeyword: '' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, size: 20, searchKeyword: '', pageIndex: 1, recordCountPerPage: 20 },
      });
    });
  });

  describe('config 전달', () => {
    it('호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await auditAdminService.getAuditLogs({ page: 0, size: 5 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, size: 5, pageIndex: 1, recordCountPerPage: 5 },
      });
    });

    it('config 를 생략해도 params 를 담은 config 객체가 반드시 만들어진다 — undefined 로 나가지 않는다', async () => {
      await auditAdminService.getAuditLogs({ searchKeyword: '삭제' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '삭제' } });
      // config 를 통째로 흘려보내면 params 가 사라져 전체 목록이 조회된다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('config 에 params 가 섞여 와도 전용 params 인자가 이긴다 — 스프레드 순서가 계약이다', async () => {
      // `{ ...config, params }` 이므로 뒤에 오는 params 인자가 config.params 를 덮어쓴다.
      // 순서가 뒤집히면(`{ params, ...config }`) 전용 인자가 조용히 무시된다.
      await auditAdminService.getAuditLogs({ page: 0 }, { timeout: 1000, params: { page: 9 } });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 1000,
        params: { page: 0, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        timeout: 1000,
        params: { page: 9, pageIndex: 10 },
      });
    });
  });

  describe('응답·오류 무가공 전달', () => {
    it('응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      // AuditLog 는 백엔드 SysLogDto 를 SSOT 로 삼는 타입 별칭이다. 아래 필드명은 생성 타입
      // (generated-api.d.ts)의 실제 이름이며, 로컬 인터페이스 재선언으로 회귀하면 tsc 가 여기서 깨진다.
      // (과거 `requstId`·`occrrncDe` 같은 유사 이름으로 재선언해 타임라인 전 필드가 공백이 된 적이 있다.)
      const page: PageResponse<AuditLog> = {
        list: [
          {
            sysLogSn: 10254,
            dmndId: 'REQ-20260815-0001',
            srvcNm: 'UserApiController',
            methodNm: 'deleteUser',
            prcsSeCd: 'D',
            prcsTm: '128',
            dmndUserId: 'admin',
            rqesterIp: '10.0.0.12',
            ocrnYmd: '20260815',
          },
        ],
        total: 1,
        page: 1,
        size: 5,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(auditAdminService.getAuditLogs({ page: 0, size: 5 })).resolves.toBe(page);
    });

    it('조회 실패는 삼키지 않고 그대로 전파한다 — 빈 목록 폴백은 "사건이 없었다"는 거짓이 된다', async () => {
      client.get.mockRejectedValueOnce(new Error('감사 로그 조회 권한이 없습니다.'));

      await expect(auditAdminService.getAuditLogs({ page: 0 })).rejects.toThrow(
        '감사 로그 조회 권한이 없습니다.'
      );
    });
  });

  describe('읽기 전용 보장', () => {
    it('감사 로그는 GET 한 번만 발생하고 쓰기 메서드는 전혀 사용하지 않는다', async () => {
      await auditAdminService.getAuditLogs({ page: 0, size: 5, searchKeyword: '로그인' });

      // 감사 추적(audit trail)은 관리자 UI 에서 변경·삭제할 수 없어야 한다.
      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });
});
