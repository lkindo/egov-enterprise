/**
 * CodeAdminService — 행정코드·기관코드 요청 계약 테스트
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 이 두 화면은 **타입이 전부 통과하는 채로 조회 조건이 통째로 버려지고 있었다.**
 *
 * 서버(`BaseSearchDto`)가 읽는 키는 `searchKeyword`·`pageIndex`(1-base)·`pageUnit` 뿐이다.
 * 화면은 `searchWrd`·`pageNo` 를 보내고 있었는데, 이 둘은
 *   - 서버 DTO 에 **필드가 없고**
 *   - `ApiService.get` 의 자동 매핑 대상(`page`→`pageIndex`, `size`/`pageSize`→`recordCountPerPage`)에도 **없다**
 * 즉 쿼리스트링에 실려 나가서 조용히 무시됐다. 결과적으로 검색어를 넣어도 목록이 그대로였고,
 * 2·3페이지를 눌러도 늘 1페이지 10건만 나왔다. 총건수만 전체 수로 정확히 표시되므로
 * 사용자는 "있다는데 안 보인다" 상태가 된다.
 *
 * `SearchParams` 의 인덱스 시그니처(`[key: string]: unknown`)가 오타를 전부 삼키므로
 * `tsc` 는 이 결함을 원리적으로 잡지 못한다. 따라서 **실제로 나가는 파라미터**를 여기서 고정한다.
 *
 * 수신 '반영'(process)은 축이 다르다 — 서버가 `@Valid @RequestBody` 를 요구하는데 본문 없이
 * 쿼리 파라미터로만 보내 항상 400(Required request body is missing)이었다. 본문으로 나가는지,
 * 그리고 완료 구분값(`procSe`)을 **클라이언트가 정하지 않는지**를 함께 고정한다.
 *
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { codeAdminService } from '../CodeAdminService';

/** `AdminService('/codes')` + category 기본값 'system' → `admin/system/codes` (선행 슬래시 없음). */
const BASE = 'admin/system/codes';

/** 서버 `BaseSearchDto` 에 필드가 존재하지 않아 어디에도 바인딩되지 않는 키들. */
const UNBOUND_KEYS = ['searchWrd', 'pageNo'] as const;

function paramsOf(call: unknown[]): Record<string, unknown> {
  const config = call[1] as { params?: Record<string, unknown> } | undefined;
  return config?.params ?? {};
}

describe('CodeAdminService — 조회 조건이 서버에 실제로 닿는다', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('행정코드 목록 (getAdministCodeList)', () => {
    it('검색어·페이지·페이지당 건수가 서버가 읽는 키로 나간다', async () => {
      await codeAdminService.getAdministCodeList({
        searchKeyword: '종로',
        pageIndex: 3,
        pageUnit: 50,
      });

      expect(client.get).toHaveBeenCalledTimes(1);
      const [url, config] = client.get.mock.calls[0];
      expect(url).toBe(`${BASE}/administ`);
      expect((config as { params: Record<string, unknown> }).params).toMatchObject({
        searchKeyword: '종로',
        pageIndex: 3,
        pageUnit: 50,
      });
    });

    it('서버가 읽지 않는 searchWrd·pageNo 로는 나가지 않는다', async () => {
      await codeAdminService.getAdministCodeList({
        searchKeyword: '종로',
        pageIndex: 2,
        pageUnit: 10,
      });

      const params = paramsOf(client.get.mock.calls[0]);
      for (const key of UNBOUND_KEYS) {
        expect(params).not.toHaveProperty(key);
      }
    });
  });

  describe('기관코드 목록 (getInstitutionCodeList)', () => {
    it('검색어·페이지·페이지당 건수가 서버가 읽는 키로 나간다', async () => {
      await codeAdminService.getInstitutionCodeList({
        searchKeyword: '교육청',
        pageIndex: 2,
        pageUnit: 20,
      });

      const [url, config] = client.get.mock.calls[0];
      expect(url).toBe(`${BASE}/institution`);
      expect((config as { params: Record<string, unknown> }).params).toMatchObject({
        searchKeyword: '교육청',
        pageIndex: 2,
        pageUnit: 20,
      });
    });
  });

  describe('기관코드 수신 이력 (getInstitutionCodeRecptnList)', () => {
    it('수신 이력도 같은 키를 쓴다 — 서버가 페이징하므로 페이저가 거짓 번호를 그리지 않는다', async () => {
      await codeAdminService.getInstitutionCodeRecptnList({
        searchKeyword: '교육청',
        pageIndex: 4,
        pageUnit: 10,
      });

      const [url, config] = client.get.mock.calls[0];
      expect(url).toBe(`${BASE}/institution/receptions`);
      expect((config as { params: Record<string, unknown> }).params).toMatchObject({
        searchKeyword: '교육청',
        pageIndex: 4,
        pageUnit: 10,
      });
    });
  });

  describe('기관코드 수신 반영 (processInstitutionCodeRecptn)', () => {
    it('대상을 쿼리가 아니라 요청 본문으로 보낸다 — 본문이 없으면 서버가 400 을 낸다', async () => {
      await codeAdminService.processInstitutionCodeRecptn({
        ocrnYmd: '20260828',
        instCd: 'INST01',
        jobSn: 7,
      });

      expect(client.post).toHaveBeenCalledTimes(1);
      const [url, body, config] = client.post.mock.calls[0];
      expect(url).toBe(`${BASE}/institution/receptions/process`);
      expect(body).toEqual({ ocrnYmd: '20260828', instCd: 'INST01', jobSn: 7 });
      // 본문 대신 쿼리로 실어 보내던 형태로 되돌아가면 red 다.
      expect((config as { params?: unknown } | undefined)?.params).toBeUndefined();
    });

    it('완료 구분값(procSe)을 클라이언트가 정하지 않는다 — 상태 판정은 서버 몫이다', async () => {
      await codeAdminService.processInstitutionCodeRecptn({
        ocrnYmd: '20260828',
        instCd: 'INST01',
        jobSn: 7,
      });

      const [, body] = client.post.mock.calls[0];
      expect(body).not.toHaveProperty('procSe');
    });
  });
});
