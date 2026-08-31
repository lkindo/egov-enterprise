/**
 * IsmAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/IsmAdminService.ts` 는 약식결재(비정형 결재)
 * 화면 전체가 쓰는 **유일한 API 진입점**인데도 커버리지 0% 였다. 이 파일은 로직이
 * 거의 없어 보이지만, 아래 항목들은 **틀어져도 tsc·빌드를 전부 통과한 채 런타임에서만
 * 조용히 깨진다.**
 *
 * 1) URL 조합 — generated operation의 실제 경로 `/api/v1/informal-sanctions`를 사용한다.
 *    path 변수와 `/confirm` 하위 경로도 operation descriptor가 소유한다.
 *
 * 2) 목록 2종의 분기 키 `type` — 결재 대기함은 `type=received`(결재자 시점),
 *    신청함은 `type` **없음**(신청자 시점)으로 서버가 갈라진다
 *    (컨트롤러: `"received".equals(type)`). 이 한 글자가 빠지거나 반대로 붙으면
 *    **남의 결재함이 내 신청함 자리에 뜬다** — 조회는 200 이라 아무도 눈치채지 못한다.
 *
 * 3) 페이징 계약 — 이 엔드포인트는 Spring `Pageable`의 원본 `page`/`size`를 받는다.
 *    BaseSearchDto용 `pageIndex` 같은 계약 밖 키는 transport 전에 차단한다.
 *
 * 4) 경로 변수 치환 — update/confirm/delete 는 id 를 URL 에 박는다. 잘못된 id 가 나가면
 *    **다른 사람의 결재 건을 고치거나 지운다** — 되돌릴 수 없다.
 *
 * 5) 결재 상태 코드 — `SANCTION_STATUS` 는 백엔드 `SanctionStatus` 와 1:1 이며
 *    승인은 'C' 다. 누군가 "승인이니까 'Y'" 같은 임의 변환을 넣으면 서버가 조용히
 *    다른 상태로 저장한다. 코드값 자체를 테스트로 못 박는다.
 *
 * 6) config 전달 — 호출부의 timeout·AbortSignal 이 유실되면 화면 이탈 시 요청 취소가
 *    동작하지 않는다. 유실돼도 요청 자체는 성공하므로 관측되지 않는다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => {
  const success = (data: unknown) => ({ success: true, code: 'S000', message: 'success', data });
  const defaultSanction = { taskSeCd: 'ETC', aplcntId: 'USR0001', aprvrId: 'USR0002' };
  const defaultPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
  return {
    default: {
      ...client,
      getRaw: async (url: string, config?: unknown) => {
        const result = await client.get(url, config);
        return success(result ?? (url === 'informal-sanctions' ? defaultPage : defaultSanction));
      },
      requestRaw: async (requestConfig: Record<string, unknown>) => {
        const { url, method, data, ...config } = requestConfig;
        const forwardedConfig = Object.keys(config).length === 0 ? undefined : config;
        let result: unknown;
        if (method === 'post') result = await client.post(url, data, forwardedConfig);
        if (method === 'put') result = await client.put(url, data, forwardedConfig);
        if (method === 'patch') result = await client.patch(url, null, forwardedConfig);
        if (method === 'delete') result = await client.delete(url, forwardedConfig);
        return success(result ?? (method === 'post' ? 1 : null));
      },
    },
  };
});

import {
  ismAdminService,
  isSanctionPending,
  SANCTION_STATUS,
  type InformalSanctionDto,
} from '../IsmAdminService';

/** 이 서비스가 생성자에 넘기는 경로 원문. 접두가 바뀌면 이 상수 하나로 전 테스트가 red 가 된다. */
const BASE_URL = 'informal-sanctions';

const VALID_SANCTION: InformalSanctionDto = {
  taskSeCd: 'VACATION',
  aplcntId: 'USR0001',
  aprvrId: 'USR0002',
};

/** 마지막 GET 호출의 [URL, config]. `params: undefined` 같은 미묘한 차이까지 직접 관측하기 위함이다. */
function lastGetCall(): [string, AxiosRequestConfig | undefined] {
  const { calls } = client.get.mock;
  return calls[calls.length - 1] as [string, AxiosRequestConfig | undefined];
}

describe('IsmAdminService — 약식결재(비정형 결재) 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('URL 조합 — generated operation 경로', () => {
    it('목록 조회는 informal-sanctions로 나가며 컬렉션 경로에 군더더기 슬래시가 붙지 않는다', async () => {
      await ismAdminService.getPendingList();

      expect(client.get).toHaveBeenCalledWith(BASE_URL, { params: { type: 'received' } });
    });

    it('상세 조회는 일련번호를 경로 변수로 이어 붙인다', async () => {
      await ismAdminService.getInfrmlSanctn(1024);

      expect(client.get).toHaveBeenCalledWith(`${BASE_URL}/1024`, undefined);
    });

    it('승인/반려는 /{일련번호}/confirm 하위 경로로 나간다', async () => {
      await ismAdminService.confirmInfrmlSanctn(7, SANCTION_STATUS.APPROVED);

      expect(client.patch).toHaveBeenCalledWith(
        `${BASE_URL}/7/confirm`,
        null,
        { params: { confmAt: 'C', returnResn: undefined } },
      );
    });

    it('모든 메서드의 요청 경로가 informal-sanctions 접두를 벗어나지 않고 선행·중복 슬래시도 없다', async () => {
      await ismAdminService.getPendingList();
      await ismAdminService.getHistoryList();
      await ismAdminService.getInfrmlSanctn(1);
      await ismAdminService.createInfrmlSanctn(VALID_SANCTION);
      await ismAdminService.updateInfrmlSanctn(1, VALID_SANCTION);
      await ismAdminService.confirmInfrmlSanctn(1, SANCTION_STATUS.APPROVED);
      await ismAdminService.deleteInfrmlSanctn(1);

      const urls = [
        ...client.get.mock.calls,
        ...client.post.mock.calls,
        ...client.put.mock.calls,
        ...client.patch.mock.calls,
        ...client.delete.mock.calls,
      ].map((call) => String(call[0]));

      // GET 3(대기함·신청함·상세) + POST 1 + PUT 1 + PATCH 1 + DELETE 1 = 7
      expect(urls).toHaveLength(7);
      for (const url of urls) {
        expect(url.startsWith(BASE_URL)).toBe(true);
        // baseURL 에 이어 붙는 상대 경로다 — 선행 슬래시가 생기면 호스트 루트로 새어 나간다.
        expect(url.startsWith('/')).toBe(false);
        expect(url).not.toContain('//');
      }
    });
  });

  describe('목록 2종의 분기 — type=received 유무가 결재함/신청함을 가른다', () => {
    it('OpenAPI에 없는 검색 키는 요청 전에 차단한다', async () => {
      await expect(
        ismAdminService.getPendingList({ searchKeyword: '휴가' }),
      ).rejects.toThrow('생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('호출부가 다른 type 을 넘겨도 결재 대기함은 received 로 덮어쓴다 — 메서드 이름과 실제 조회 대상이 어긋나지 않게 한다', async () => {
      await ismAdminService.getPendingList({ type: 'sent' });

      const [, requestConfig] = lastGetCall();
      expect(requestConfig?.params).toEqual({ type: 'received' });
    });

    it('신청함은 type 키를 아예 보내지 않는다 — 붙는 순간 남의 결재함이 조회된다', async () => {
      await ismAdminService.getHistoryList({ page: 0 });

      const [url, requestConfig] = lastGetCall();
      expect(url).toBe(BASE_URL);
      expect(requestConfig?.params).not.toHaveProperty('type');
      expect(requestConfig?.params).toEqual({ page: 0 });
    });

    it('신청함을 인자 없이 호출하면 params 자체가 비어 서버 기본값(Pageable size=10)에 맡겨진다', async () => {
      await ismAdminService.getHistoryList();

      const [url, requestConfig] = lastGetCall();
      expect(url).toBe(BASE_URL);
      expect(requestConfig?.params).toEqual({});
    });
  });

  describe('Pageable 페이징 계약 — 원본 page/size를 유지한다', () => {
    it('첫 페이지는 page=0으로 전송한다', async () => {
      await ismAdminService.getPendingList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE_URL, { params: { page: 0, type: 'received' } });
    });

    it('page 2와 size 20은 Pageable 원형 그대로 전송한다', async () => {
      await ismAdminService.getPendingList({ page: 2, size: 20 });

      // 이 엔드포인트는 Spring Pageable 로 받으므로 원본 page/size 가 지워지면 페이징이 무력화된다.
      expect(client.get).toHaveBeenCalledWith(BASE_URL, {
        params: { page: 2, size: 20, type: 'received' },
      });
    });

    it('신청함도 동일한 Pageable 규칙을 적용받는다', async () => {
      await ismAdminService.getHistoryList({ page: 4, size: 15 });

      expect(client.get).toHaveBeenCalledWith(BASE_URL, { params: { page: 4, size: 15 } });
    });

    it('Pageable 계약에 없는 pageIndex는 요청 전에 차단한다', async () => {
      await expect(
        ismAdminService.getPendingList({ page: 5, pageIndex: 3 }),
      ).rejects.toThrow('생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('결재 대기함은 호출부가 넘긴 params 객체를 오염시키지 않는다 — 같은 객체로 재조회해도 pageIndex 가 누적되지 않는다', async () => {
      const callerParams = { page: 1, size: 10 };

      await ismAdminService.getPendingList(callerParams);

      expect(callerParams).toEqual({ page: 1, size: 10 });
    });
  });

  describe('config 전달 — timeout·AbortSignal 이 유실되면 요청 취소가 죽는다', () => {
    it('목록 조회 시 timeout·signal 이 변환된 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await ismAdminService.getPendingList({ page: 1 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE_URL, {
        timeout: 3000,
        signal,
        params: { page: 1, type: 'received' },
      });
    });

    it('상세 조회는 config 를 가공 없이 그대로 전달한다', async () => {
      const { signal } = new AbortController();

      await ismAdminService.getInfrmlSanctn(88, { timeout: 1000, signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE_URL}/88`, { timeout: 1000, signal });
    });

    it('승인/반려는 params 를 자체 생성하면서도 나머지 config 는 유지한다', async () => {
      await ismAdminService.confirmInfrmlSanctn(9, SANCTION_STATUS.APPROVED, undefined, { timeout: 2000 });

      expect(client.patch).toHaveBeenCalledWith(`${BASE_URL}/9/confirm`, null, {
        timeout: 2000,
        params: { confmAt: 'C', returnResn: undefined },
      });
    });

    it('삭제는 config 를 그대로 전달하고, 생략 시 undefined 로 넘긴다', async () => {
      const { signal } = new AbortController();

      await ismAdminService.deleteInfrmlSanctn(31, { signal });
      await ismAdminService.deleteInfrmlSanctn(32);

      expect(client.delete).toHaveBeenNthCalledWith(1, `${BASE_URL}/31`, { signal });
      expect(client.delete).toHaveBeenNthCalledWith(2, `${BASE_URL}/32`, undefined);
    });
  });

  describe('경로 변수 치환 — 잘못된 id 는 남의 결재 건을 고치거나 지운다', () => {
    const payload: Partial<InformalSanctionDto> = {
      taskSeCd: 'VACATION',
      aplcntId: 'USR0001',
      aprvrId: 'USR0002',
      rjctRsnCn: '',
    };

    it('등록은 컬렉션 경로에 본문을 그대로 실어 POST 한다', async () => {
      await ismAdminService.createInfrmlSanctn(payload);

      expect(client.post).toHaveBeenCalledWith(BASE_URL, payload, undefined);
      // Zod 경계 검증은 안전한 복사본을 전달하되 필드 값은 보존한다.
      expect(client.post.mock.calls[0][1]).toStrictEqual(payload);
    });

    it('수정은 전달받은 일련번호 경로로만 PUT 하며 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await ismAdminService.updateInfrmlSanctn(11, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE_URL}/11`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(BASE_URL, payload, { timeout: 2000 });
    });

    it('삭제는 지정한 일련번호 경로로만 DELETE 하며 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await ismAdminService.deleteInfrmlSanctn(22);

      expect(client.delete).toHaveBeenCalledWith(`${BASE_URL}/22`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE_URL, undefined);
    });

    it('서로 다른 id 로 수정·삭제하면 각 요청은 자기 경로로만 나간다 — 경로가 뒤바뀌면 즉시 red 다', async () => {
      await ismAdminService.updateInfrmlSanctn(11, payload);
      await ismAdminService.deleteInfrmlSanctn(22);

      expect(client.put).toHaveBeenCalledWith(`${BASE_URL}/11`, payload, undefined);
      expect(client.delete).toHaveBeenCalledWith(`${BASE_URL}/22`, undefined);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE_URL}/22`, payload, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE_URL}/11`, undefined);
    });

    it('수정 본문은 서비스가 id 를 주입하지 않고 원본 그대로 나간다 — 일련번호는 서버가 경로에서 취한다', async () => {
      await ismAdminService.updateInfrmlSanctn(11, payload);

      expect(client.put.mock.calls[0][1]).toStrictEqual(payload);
      expect(payload).not.toHaveProperty('ifmlAtrzSn');
    });
  });

  describe('승인/반려 — 상태 코드와 쿼리 파라미터 이름은 컨트롤러 시그니처다', () => {
    it('승인은 confmAt=C 로 나가며 본문은 비운다(PATCH body null)', async () => {
      await ismAdminService.confirmInfrmlSanctn(5, SANCTION_STATUS.APPROVED);

      expect(client.patch).toHaveBeenCalledWith(`${BASE_URL}/5/confirm`, null, {
        params: { confmAt: 'C', returnResn: undefined },
      });
    });

    it('반려는 confmAt=R 과 함께 반려 사유를 returnResn 으로 실어 보낸다', async () => {
      await ismAdminService.confirmInfrmlSanctn(5, SANCTION_STATUS.REJECTED, '증빙 누락');

      expect(client.patch).toHaveBeenCalledWith(`${BASE_URL}/5/confirm`, null, {
        params: { confmAt: 'R', returnResn: '증빙 누락' },
      });
    });

    it('승인/반려는 GET 이 아니므로 페이징 변환 대상이 아니다 — params 는 두 키뿐이다', async () => {
      await ismAdminService.confirmInfrmlSanctn(5, SANCTION_STATUS.APPROVED, '메모');

      const requestConfig = client.patch.mock.calls[0][2] as AxiosRequestConfig;
      expect(Object.keys(requestConfig.params as Record<string, unknown>).sort()).toEqual([
        'confmAt',
        'returnResn',
      ]);
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  describe('응답 무가공 — 서비스는 클라이언트 응답을 그대로 반환한다', () => {
    it('목록 조회는 PageResponse 를 재구성하지 않고 동일 객체를 반환한다', async () => {
      const page = {
        list: [{ ifmlAtrzSn: 1, taskSeCd: 'VACATION', aplcntId: 'USR0001', aprvrId: 'USR0002' }],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(ismAdminService.getPendingList()).resolves.toBe(page);
    });

    it('등록은 서버가 준 신규 일련번호를 그대로 돌려준다', async () => {
      client.post.mockResolvedValueOnce(4242);

      await expect(ismAdminService.createInfrmlSanctn(VALID_SANCTION)).resolves.toBe(4242);
    });

    it('필수 본문이 빠진 등록 요청은 transport 호출 전에 차단한다', async () => {
      await expect(ismAdminService.createInfrmlSanctn({})).rejects.toThrow(
        '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
      );
      expect(client.post).not.toHaveBeenCalled();
    });
  });

  describe('결재 상태 코드 — 백엔드 SanctionStatus 와 1:1 (임의 변환 금지)', () => {
    it('신청 A · 승인 C · 반려 R 세 코드값을 못 박는다', () => {
      expect(SANCTION_STATUS).toEqual({ REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R' });
      // 승인을 'Y' 로 바꾸는 흔한 오해를 방지한다.
      expect(SANCTION_STATUS.APPROVED).not.toBe('Y');
    });

    it('대기 판정은 미설정과 신청(A)만 참이고 승인(C)·반려(R)는 거짓이다', () => {
      expect(isSanctionPending(undefined)).toBe(true);
      expect(isSanctionPending('')).toBe(true);
      expect(isSanctionPending(SANCTION_STATUS.REQUESTED)).toBe(true);
      expect(isSanctionPending(SANCTION_STATUS.APPROVED)).toBe(false);
      expect(isSanctionPending(SANCTION_STATUS.REJECTED)).toBe(false);
    });

    it('알 수 없는 코드는 대기로 간주하지 않는다 — 미처리 뱃지가 영원히 남는 것을 막는다', () => {
      expect(isSanctionPending('X')).toBe(false);
    });
  });
});
