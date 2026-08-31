/**
 * LoginPolicyAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/LoginPolicyAdminService.ts` 는 **로그인 정책**(IP 제한·
 * 접속 허용 시간대·OTP 사용 여부)을 다루는 관리자 API 의 유일한 진입점이다. 코드가 4개
 * 메서드뿐이라 "테스트할 게 없다"고 보이지만, 이 도메인은 **틀어졌을 때의 대가가 가장 큰
 * 축**에 속한다 — 경로 변수 하나가 어긋나면 **다른 계정의 로그인 정책을 덮어쓰거나 지운다.**
 * 그리고 그 오류는 컴파일·타입 검사를 전부 통과한 채 런타임에서만 조용히 발생한다.
 *
 * 1) URL 조합 — 이 서비스는 `AdminService('/login-policies')` 를 상속한다. 선행 슬래시는
 *    `ApiService` 생성자에서 제거되고 `admin/{category}/` 접두가 붙어 최종 경로는
 *    `admin/system/login-policies` 다(category 기본값 'system'). 같은 디렉터리에도 `AdminService`
 *    가 아니라 `ApiService` 를 직접 상속해 접두가 다른 서비스가 섞여 있으므로, 접두를 눈으로
 *    가정하지 않고 이 파일에서 고정한다. 한 글자만 어긋나도 4개 메서드가 동시에 404 다.
 *
 * 2) 페이징이 **두 축으로 동시에** 변환된다 — 이 서비스 고유의 위험이다.
 *    - 서비스 자신: `pageNo = pageNo || (page ? page + 1 : 1)`
 *    - 상위 `ApiService.get`: `page`(0-based) → `pageIndex`(1-based, +1), `size` → `recordCountPerPage`
 *    즉 한 번의 목록 조회에 **pageNo 와 pageIndex 라는 1-based 키가 둘 다 실려 나간다.** 둘 중
 *    하나만 +1 을 잃으면 백엔드가 어느 키를 읽느냐에 따라 목록이 한 페이지씩 밀린다. 타입은
 *    그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 폴백 — `searchKeyword || searchWrd || ''` 순서로 승격한다(승격 대상 키 이름도
 *    `searchKeyword` 그대로다 — 설문 서비스처럼 `keyword` 로 이름을 바꾸지 않는다). 이 순서가
 *    뒤집히면 레거시 화면(searchWrd)이나 신규 화면(searchKeyword) 중 한쪽 검색이 통째로 죽는다.
 *
 * 4) 경로 변수 치환 — 단건 조회·저장·삭제 3종이 모두 `/{userId}` 하나에 걸려 있다. `saveLoginPolicy`
 *    는 **본문에도 userId 가 들어 있는** 형태라, 경로를 본문 값으로 잘못 만들면 엉뚱한 계정의
 *    정책을 upsert 한다. `deleteLoginPolicy` 에서 경로 변수가 비면 컬렉션 경로로 DELETE 가 나간다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면 화면 이탈 시
 *    요청 취소가 동작하지 않고 타임아웃이 기본값으로 되돌아간다. 유실돼도 요청 자체는 성공하므로
 *    아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => {
  const legacy = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
  const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
  return {
    ...legacy,
    getRaw: vi.fn(async (url: string, config?: unknown) => envelope(await legacy.get(url, config))),
    requestRaw: vi.fn(async (request: Record<string, unknown>) => {
      const { url, method, data, ...config } = request;
      const forwardedConfig = Object.keys(config).length > 0 ? config : undefined;
      let response: unknown;
      if (method === 'post') response = await legacy.post(url, data, forwardedConfig);
      else if (method === 'put') response = await legacy.put(url, data, forwardedConfig);
      else if (method === 'delete') response = await legacy.delete(url, forwardedConfig);
      else throw new Error(`unexpected method: ${String(method)}`);
      return envelope(response);
    }),
  };
});

vi.mock('@/lib/api/client', () => ({ default: client }));

import { loginPolicyAdminService, type LoginPolicy } from '../LoginPolicyAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/login-policies')` + category 기본값 'system' → `admin/system/login-policies`
 * (선행 슬래시 없음 — 소스에서 확인한 실제 값).
 */
const BASE = 'admin/system/login-policies';

/** 경로 변수로 쓰이는 계정 ID. 본문에 심는 값(OTHER99)과 반드시 다른 값을 쓴다. */
const USER_ID = 'USER01';

describe('LoginPolicyAdminService — 로그인 정책 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockImplementation((url: string) => Promise.resolve(
      url === BASE ? { list: [] } : { userId: USER_ID },
    ));
  });

  describe('목록 조회 (getLoginPolicyList)', () => {
    it('인자 없이 호출해도 admin/system/login-policies 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await loginPolicyAdminService.getLoginPolicyList();

      // params 를 안 넘겨도 BaseSearchDto의 pageIndex 1·searchKeyword ''는 항상 채워져 나간다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('첫 페이지(page 0)는 BaseSearchDto pageIndex 1로 나간다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('page 1은 BaseSearchDto pageIndex 2로 변환된다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ page: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 2, searchKeyword: '' },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('page 3·size 20을 BaseSearchDto pageIndex 4·pageUnit 20으로 변환한다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          pageIndex: 4,
          pageUnit: 20,
          searchKeyword: '',
        },
      });
    });

    it('legacy pageNo를 직접 지정하면 generated pageIndex로 옮겨 보존한다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ pageNo: 5 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 5, searchKeyword: '' },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('size만 지정하면 pageUnit으로 옮겨 페이지 번호는 기본값 1을 유지한다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ size: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, pageUnit: 50, searchKeyword: '' },
      });
    });

    it('searchKeyword 는 이름을 바꾸지 않고 그대로 전달된다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ searchKeyword: '관리자' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '관리자' },
      });
    });

    it('searchKeyword 가 없으면 레거시 키 searchWrd 를 searchKeyword 로 승격한다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ searchWrd: '레거시검색' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '레거시검색' },
      });
    });

    it('두 검색 키가 함께 오면 searchKeyword 가 searchWrd 보다 우선한다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ searchKeyword: '우선', searchWrd: '후순위' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '우선' },
      });
      // 폴백 순서가 뒤집힌 형태(후순위가 이기는 형태)로는 나가지 않는다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchKeyword: '후순위' },
      });
    });

    it('검색 조건(searchCondition) 등 서비스가 모르는 키도 그대로 실려 나간다', async () => {
      await loginPolicyAdminService.getLoginPolicyList({ searchCondition: 'userNm', searchKeyword: '홍길동' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, searchCondition: 'userNm', searchKeyword: '홍길동' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await loginPolicyAdminService.getLoginPolicyList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('params 없이 config 만 넘겨도 signal 이 보존되고 기본 파라미터가 채워진다', async () => {
      const { signal } = new AbortController();

      await loginPolicyAdminService.getLoginPolicyList(undefined, { signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        signal,
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 재사용 시 pageIndex 가 누적 오염되면 안 된다', async () => {
      // ApiService.get 은 넘겨받은 params 객체에 직접 pageIndex 를 써넣는다(파괴적).
      // 서비스가 스프레드로 사본을 만들기 때문에 호출부(React Query key 등)의 객체는 무사하다.
      const callerParams: SearchParams = { page: 1, size: 10 };

      await loginPolicyAdminService.getLoginPolicyList(callerParams);

      expect(callerParams).toEqual({ page: 1, size: 10 });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<LoginPolicy> = {
        list: [
          {
            userId: USER_ID,
            userNm: '홍길동',
            ipAddr: '192.168.0.10',
            dpcnPrmYn: 'Y',
            lmtYn: 'Y',
            bgngTm: '0900',
            endTm: '1800',
            otpUseYn: 'N',
            regYn: 'Y',
            lastMdfrId: 'admin',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(loginPolicyAdminService.getLoginPolicyList()).resolves.toBe(page);
    });
  });

  describe('단건 조회 (getLoginPolicy)', () => {
    it('userId 를 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await loginPolicyAdminService.getLoginPolicy(USER_ID, { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/${USER_ID}`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await loginPolicyAdminService.getLoginPolicy(USER_ID);

      expect(client.get).toHaveBeenCalledWith(`${BASE}/${USER_ID}`, undefined);
    });

    it('단건 응답은 가공 없이 그대로 반환된다', async () => {
      const policy: LoginPolicy = {
        userId: USER_ID,
        userNm: '홍길동',
        ipAddr: '192.168.0.10',
        dpcnPrmYn: 'N',
        lmtYn: 'Y',
        regYn: 'Y',
      };
      client.get.mockResolvedValueOnce(policy);

      await expect(loginPolicyAdminService.getLoginPolicy(USER_ID)).resolves.toBe(policy);
    });
  });

  describe('저장 (saveLoginPolicy)', () => {
    it('등록·수정을 구분하지 않고 /{userId}로 PUT하며 generated 필수 userId를 본문에 보완한다', async () => {
      const payload: Partial<LoginPolicy> = {
        ipAddr: '10.0.0.1',
        lmtYn: 'Y',
        bgngTm: '0800',
        endTm: '2000',
        otpUseYn: 'Y',
      };

      await loginPolicyAdminService.saveLoginPolicy(USER_ID, payload);

      // upsert 성격이라 POST 는 쓰지 않는다.
      expect(client.put).toHaveBeenCalledWith(
        `${BASE}/${USER_ID}`,
        { ...payload, userId: USER_ID },
        undefined,
      );
      expect(client.post).not.toHaveBeenCalled();
    });

    it('경로는 인자로 받은 userId 가 결정한다 — 본문의 userId 가 아니다', async () => {
      // 본문에 다른 계정(OTHER99)을 심어 두고, 경로는 인자(USER01)만 따르는지 확인한다.
      // 여기서 밀리면 남의 계정 로그인 정책을 덮어쓴다.
      const payload: Partial<LoginPolicy> = { userId: 'OTHER99', lmtYn: 'N' };

      await loginPolicyAdminService.saveLoginPolicy(USER_ID, payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(
        `${BASE}/${USER_ID}`,
        { ...payload, userId: USER_ID },
        { timeout: 2000 },
      );
      expect(client.put).not.toHaveBeenCalledWith(
        `${BASE}/OTHER99`,
        expect.anything(),
        { timeout: 2000 },
      );
    });

    it('저장 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await loginPolicyAdminService.saveLoginPolicy(USER_ID, { lmtYn: 'Y' }, { signal });

      expect(client.put).toHaveBeenCalledWith(
        `${BASE}/${USER_ID}`,
        { lmtYn: 'Y', userId: USER_ID },
        { signal },
      );
    });
  });

  describe('삭제 (deleteLoginPolicy)', () => {
    it('지정한 userId 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await loginPolicyAdminService.deleteLoginPolicy(USER_ID);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/${USER_ID}`, undefined);
      // 경로 변수가 비면 전체 컬렉션 DELETE 가 된다 — 절대 발생해선 안 된다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제에서도 config 가 그대로 전달된다', async () => {
      const { signal } = new AbortController();

      await loginPolicyAdminService.deleteLoginPolicy(USER_ID, { signal, timeout: 5000 });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/${USER_ID}`, { signal, timeout: 5000 });
    });
  });

  describe('경로 격리', () => {
    it('단건 계열 3종(조회·저장·삭제)은 완전히 동일한 /{userId} 경로를 공유한다', async () => {
      // 셋 중 하나만 경로 문법이 달라지면 "조회는 되는데 저장이 404" 같은 증상이 된다.
      await loginPolicyAdminService.getLoginPolicy(USER_ID);
      await loginPolicyAdminService.saveLoginPolicy(USER_ID, { lmtYn: 'Y' });
      await loginPolicyAdminService.deleteLoginPolicy(USER_ID);

      const expected = `${BASE}/${USER_ID}`;
      expect(client.get).toHaveBeenCalledWith(expected, undefined);
      expect(client.put).toHaveBeenCalledWith(expected, { lmtYn: 'Y', userId: USER_ID }, undefined);
      expect(client.delete).toHaveBeenCalledWith(expected, undefined);
    });

    it('모든 요청 경로는 admin/system/login-policies 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL 의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await loginPolicyAdminService.getLoginPolicyList();
      await loginPolicyAdminService.getLoginPolicy(USER_ID);
      await loginPolicyAdminService.saveLoginPolicy(USER_ID, { lmtYn: 'Y' });
      await loginPolicyAdminService.deleteLoginPolicy(USER_ID);

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(4);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});
