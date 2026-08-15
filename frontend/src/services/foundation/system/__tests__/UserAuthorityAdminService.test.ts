/**
 * UserAuthorityAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/UserAuthorityAdminService.ts` 는 **사용자에게 권한을
 * 부여·회수하는 유일한 진입점**인데도 커버리지 0% 였다. 메서드는 5개뿐이고 본문은 한 줄씩이라
 * "테스트할 게 없다"고 보이지만, 이 서비스가 틀어지면 결과는 목록이 안 보이는 정도가 아니라
 * **권한이 엉뚱한 사용자에게 붙거나 회수되지 않는 것**이다. 그리고 아래 항목은 전부
 * 타입 검사·컴파일을 통과한 채 런타임에서만 조용히 깨진다.
 *
 * 1) URL 조합 — `AdminService('/user-authorities')` 는 `ApiService` 생성자에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/user-authorities` 가 된다
 *    (category 기본값 'system'). 백엔드 `UserAuthorityApiController` 의
 *    `@RequestMapping("/api/v1/admin/system/user-authorities")` + axios baseURL `/api/v1` 와
 *    이 문자열이 정확히 맞물려야만 성립한다. 접두 규칙이 한 글자만 어긋나면 5개 메서드가
 *    동시에 404 가 된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 바꿔 백엔드 `BaseSearchDto` 에 맞춘다. 이 +1 이
 *    사라지거나 두 번 적용되면 목록이 한 페이지씩 밀린다. 타입은 그대로라 tsc 로는 안 잡힌다.
 *
 * 3) **단건 저장의 배열 감싸기** — `saveUserAuthority(dto)` 는 `[dto]` 로 감싸 POST 한다.
 *    백엔드가 `@Valid @RequestBody List<UserAuthorityDto>` 로 받기 때문이다. 감싸기가 사라지면
 *    객체 하나가 그대로 나가 **400 으로 저장이 통째로 실패**한다. 두 저장 메서드가 같은
 *    엔드포인트를 공유한다는 사실도 함께 고정한다(단건 전용 하위 경로는 없다).
 *
 * 4) **삭제 식별자는 URL 이 아니라 요청 본문** — `deleteUserAuthorities(uniqIds)` 는
 *    `config.data` 에 배열을 실어 컬렉션 경로로 DELETE 한다(백엔드 `@RequestBody List<String>`).
 *    식별자가 경로나 쿼리스트링으로 새면 회수가 실패하고, 반대로 본문 병합 순서가 뒤집혀
 *    호출부 `config.data` 가 이기면 **지정하지 않은 사용자의 권한을 지운다**.
 *
 * 5) 경로 변수 치환 — 단건 조회는 `scrtyDcsnTrgtId` 를 경로에 붙인다. 컬렉션 경로로 새면
 *    한 사람 대신 전체를 대상으로 삼는다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal)가 유실되면 화면
 *    이탈 시 요청 취소가 동작하지 않고 타임아웃이 기본값으로 되돌아간다. 유실돼도 요청 자체는
 *    성공하므로 아무도 눈치채지 못한다.
 *
 * 7) 검색어 무가공 전달 — 형제 서비스(SurveyAdminService)는 `searchKeyword || searchWrd` 를
 *    `keyword` 로 승격하지만 **이 서비스는 하지 않는다**. "통일"이라는 이름으로 승격 로직이
 *    이식되면 백엔드 `BaseSearchDto` 가 받지 않는 키가 섞여 나간다. 차이 자체를 고정한다.
 *
 * ── 관측했으나 계약으로 고정하지 않은 것 ─────────────────────────────────────
 * - `getUserAuthorityList` 는 `params` 를 **사본 없이 그대로** 넘긴다(`{ ...config, params }`).
 *   `ApiService.get` 이 그 객체에 `pageIndex`·`recordCountPerPage` 를 직접 써넣으므로 호출부
 *   객체가 오염된다. 같은 객체를 재사용하면 두 번째 호출에서 "pageIndex 가 이미 있다"는 이유로
 *   +1 변환이 건너뛰어진다. 형제 서비스는 스프레드 사본을 만들어 이를 피한다 — 결함으로 보아
 *   테스트에서 제외한다(고정하면 수정이 곧 red 가 된다).
 * - `getUserAuthority(scrtyDcsnTrgtId)` 에 대응하는 백엔드 엔드포인트는 현재 존재하지 않는다
 *   (컨트롤러에 `@GetMapping("/{id}")` 없음). 아래 테스트는 백엔드 왕복이 아니라 **클라이언트
 *   측 경로 조합·config 전달**만 고정한다.
 * - 경로 변수는 `encodeURIComponent` 없이 문자열 보간된다. 현재 식별자 형식에서는 문제가
 *   드러나지 않아 계약으로 만들지 않는다.
 *
 * 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  userAuthorityAdminService,
  type AuthorGroupProjection,
  type UserAuthorityDto,
} from '../UserAuthorityAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/user-authorities')` + category 기본값 'system' → `admin/system/user-authorities`
 * (선행 슬래시 없음 — 붙으면 axios baseURL 의 `/api/v1` 세그먼트가 통째로 날아간다).
 */
const BASE = 'admin/system/user-authorities';

describe('UserAuthorityAdminService — 사용자권한 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('목록 조회 — URL 조합과 페이징 변환', () => {
    it('목록은 admin/system/user-authorities 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await userAuthorityAdminService.getUserAuthorityList();

      // 인자를 생략해도 params 키 자체는 항상 만들어지고 값만 undefined 다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await userAuthorityAdminService.getUserAuthorityList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 3·size 20 은 pageIndex 4·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await userAuthorityAdminService.getUserAuthorityList({ page: 3, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 3, size: 20, pageIndex: 4, recordCountPerPage: 20 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 +1 변환이 이를 덮어쓰지 않는다', async () => {
      await userAuthorityAdminService.getUserAuthorityList({ page: 9, pageIndex: 1 });

      // 지정값 1 이 그대로 나가야 한다. page 9 를 근거로 10 을 써넣으면 안 된다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장된다', async () => {
      await userAuthorityAdminService.getUserAuthorityList({ pageSize: 25 });

      // 백엔드(BaseSearchDto)와 Spring Data Pageable 을 동시에 만족시키기 위한 이중 매핑이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, recordCountPerPage: 25, size: 25 },
      });
    });

    it('검색 키는 승격 없이 원래 이름 그대로 나간다 — 이 서비스에는 keyword 승격이 없다', async () => {
      await userAuthorityAdminService.getUserAuthorityList({
        searchKeyword: '홍길동',
        searchCondition: '1',
      });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '홍길동', searchCondition: '1' },
      });
      // 형제 서비스(SurveyAdminService)의 keyword 승격이 이식되면 이 단언이 깨진다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '홍길동', searchCondition: '1', keyword: '홍길동' },
      });
    });

    it('화면 고유 파라미터(authorCode)는 이름이 보존된 채 그대로 전달된다', async () => {
      // 실제 호출부(SecurityHubClient)가 보내는 조합이다. 권한 코드로 목록을 좁히므로
      // 이 키가 유실되면 선택한 역할과 무관한 전체 사용자 목록이 그려진다.
      const params: SearchParams = {
        searchKeyword: '',
        searchCondition: '1',
        authorCode: 'ROLE_ADMIN',
        page: 0,
      };

      await userAuthorityAdminService.getUserAuthorityList(params);

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          searchKeyword: '',
          searchCondition: '1',
          authorCode: 'ROLE_ADMIN',
          page: 0,
          pageIndex: 1,
        },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await userAuthorityAdminService.getUserAuthorityList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('params 없이 config 만 넘겨도 signal 이 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await userAuthorityAdminService.getUserAuthorityList(undefined, { signal });

      expect(client.get).toHaveBeenCalledWith(BASE, { signal, params: undefined });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<AuthorGroupProjection> = {
        list: [
          {
            scrtyDcsnTrgtId: 'USRCNFRM_00000000001',
            userId: 'admin',
            userNm: '관리자',
            authrtId: 'ROLE_ADMIN',
            mbrTypeCd: 'USR',
            regYn: 'Y',
            groupId: 'GRP_0001',
            mberTyNm: '업무사용자',
          },
        ],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(userAuthorityAdminService.getUserAuthorityList()).resolves.toBe(page);
    });
  });

  describe('단건 조회 — 경로 변수 치환', () => {
    it('scrtyDcsnTrgtId 를 경로 변수로 붙인다 — 컬렉션 경로로 새면 한 사람 대신 전체가 대상이 된다', async () => {
      await userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000001');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/USRCNFRM_00000000001`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('단건 조회에는 params 가 없으므로 페이징 정규화가 개입하지 않고 config 가 그대로 간다', async () => {
      await userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000001', { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/USRCNFRM_00000000001`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000002');

      const passedConfig: unknown = client.get.mock.calls[0][1];
      expect(passedConfig).toBeUndefined();
    });

    it('권한 미할당을 뜻하는 null 응답을 가공 없이 그대로 반환한다', async () => {
      // 빈 객체나 undefined 로 바꾸면 호출부의 null 분기가 통째로 죽는다.
      client.get.mockResolvedValueOnce(null);

      await expect(
        userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000001')
      ).resolves.toBeNull();
    });
  });

  describe('저장 — 단건은 배열로 감싸 나간다', () => {
    it('일괄 저장은 배열 본문을 무가공으로 컬렉션 경로에 POST 한다', async () => {
      const payload: UserAuthorityDto[] = [
        { scrtyDcsnTrgtId: 'USRCNFRM_00000000001', authrtId: 'ROLE_ADMIN', mbrTypeCd: 'USR' },
        { scrtyDcsnTrgtId: 'USRCNFRM_00000000002', authrtId: 'ROLE_ADMIN', mbrTypeCd: 'USR' },
      ];

      await userAuthorityAdminService.saveUserAuthorities(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      // 사본이 아니라 원본 배열이 그대로 나간다(정규화·필드 삭제 없음).
      const postedBody: unknown = client.post.mock.calls[0][1];
      expect(postedBody).toBe(payload);
    });

    it('단건 저장은 DTO 를 배열로 감싸 POST 한다 — 감싸기가 사라지면 백엔드 List 바인딩이 400 이다', async () => {
      const dto: UserAuthorityDto = {
        scrtyDcsnTrgtId: 'USRCNFRM_00000000001',
        authrtId: 'ROLE_USER',
        mbrTypeCd: 'USR',
      };

      await userAuthorityAdminService.saveUserAuthority(dto);

      expect(client.post).toHaveBeenCalledWith(BASE, [dto], undefined);
      // 객체를 그대로 보내면 안 된다(배열과 객체는 서로 다른 값이다).
      expect(client.post).not.toHaveBeenCalledWith(BASE, dto, undefined);
    });

    it('감싼 배열은 DTO 원본 참조를 담는다 — 중간에 복제·정규화하지 않는다', async () => {
      const dto: UserAuthorityDto = { scrtyDcsnTrgtId: 'USRCNFRM_00000000003', authrtId: 'ROLE_USER' };

      await userAuthorityAdminService.saveUserAuthority(dto);

      const postedBody: unknown = client.post.mock.calls[0][1];
      expect(Array.isArray(postedBody)).toBe(true);
      expect((postedBody as UserAuthorityDto[])[0]).toBe(dto);
      // mbrTypeCd 는 선택 필드다 — 누락 시 기본값을 끼워 넣지 않고 없는 채로 보낸다.
      expect((postedBody as UserAuthorityDto[])[0]).not.toHaveProperty('mbrTypeCd');
    });

    it('일괄 저장과 단건 저장은 같은 엔드포인트를 쓴다 — 단건 전용 하위 경로는 없다', async () => {
      await userAuthorityAdminService.saveUserAuthorities([
        { scrtyDcsnTrgtId: 'USRCNFRM_00000000001', authrtId: 'ROLE_ADMIN' },
      ]);
      await userAuthorityAdminService.saveUserAuthority({
        scrtyDcsnTrgtId: 'USRCNFRM_00000000002',
        authrtId: 'ROLE_ADMIN',
      });

      expect(client.post.mock.calls.map((call) => String(call[0]))).toEqual([BASE, BASE]);
    });

    it('저장 시 호출부 config(timeout·signal)가 그대로 전달된다', async () => {
      const { signal } = new AbortController();
      const payload: UserAuthorityDto[] = [
        { scrtyDcsnTrgtId: 'USRCNFRM_00000000001', authrtId: 'ROLE_ADMIN' },
      ];

      await userAuthorityAdminService.saveUserAuthorities(payload, { timeout: 5000, signal });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000, signal });
    });
  });

  describe('삭제 — 식별자는 URL 이 아니라 요청 본문으로 간다', () => {
    it('uniqIds 는 config.data(요청 본문)에 실리고 경로는 컬렉션 그대로다', async () => {
      const uniqIds = ['USRCNFRM_00000000001', 'USRCNFRM_00000000002'];

      await userAuthorityAdminService.deleteUserAuthorities(uniqIds);

      // 백엔드는 @RequestBody List<String> 로 받는다 — 경로 변수로 나가면 매핑 자체가 없다.
      expect(client.delete).toHaveBeenCalledWith(BASE, { data: uniqIds });
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/USRCNFRM_00000000001`, undefined);
    });

    it('삭제 대상 배열은 사본이 아니라 원본 참조가 그대로 실린다', async () => {
      const uniqIds = ['USRCNFRM_00000000001'];

      await userAuthorityAdminService.deleteUserAuthorities(uniqIds);

      const passedConfig = client.delete.mock.calls[0][1] as { data: unknown };
      expect(passedConfig.data).toBe(uniqIds);
    });

    it('삭제 시 호출부 config(timeout·signal)가 본문과 함께 보존된다', async () => {
      const { signal } = new AbortController();
      const uniqIds = ['USRCNFRM_00000000001'];

      await userAuthorityAdminService.deleteUserAuthorities(uniqIds, { timeout: 5000, signal });

      expect(client.delete).toHaveBeenCalledWith(BASE, { timeout: 5000, signal, data: uniqIds });
    });

    it('config.data 가 있어도 인자로 받은 uniqIds 가 이긴다 — 병합 순서가 뒤집히면 엉뚱한 사용자를 지운다', async () => {
      await userAuthorityAdminService.deleteUserAuthorities(['USRCNFRM_00000000001'], {
        data: ['USRCNFRM_00000000009'],
      });

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: ['USRCNFRM_00000000001'] });
      expect(client.delete).not.toHaveBeenCalledWith(BASE, { data: ['USRCNFRM_00000000009'] });
    });

    it('빈 배열이어도 요청을 건너뛰지 않는다 — 생략 판단은 호출부의 몫이다', async () => {
      await userAuthorityAdminService.deleteUserAuthorities([]);

      expect(client.delete).toHaveBeenCalledTimes(1);
      expect(client.delete).toHaveBeenCalledWith(BASE, { data: [] });
    });
  });

  describe('경로 격리', () => {
    it('컬렉션을 다루는 3종(목록·저장·삭제)은 정확히 같은 경로를 쓰고 단건 조회만 하위 경로를 갖는다', async () => {
      await userAuthorityAdminService.getUserAuthorityList();
      await userAuthorityAdminService.saveUserAuthorities([
        { scrtyDcsnTrgtId: 'USRCNFRM_00000000001', authrtId: 'ROLE_ADMIN' },
      ]);
      await userAuthorityAdminService.deleteUserAuthorities(['USRCNFRM_00000000001']);
      await userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000001');

      expect(client.get.mock.calls.map((call) => String(call[0]))).toEqual([
        'admin/system/user-authorities',
        'admin/system/user-authorities/USRCNFRM_00000000001',
      ]);
      expect(String(client.post.mock.calls[0][0])).toBe('admin/system/user-authorities');
      expect(String(client.delete.mock.calls[0][0])).toBe('admin/system/user-authorities');
    });

    it('모든 요청 경로는 admin/system/user-authorities 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL 의 경로 세그먼트가 통째로 날아간다(절대 경로로 해석).
      await userAuthorityAdminService.getUserAuthorityList({ page: 0 });
      await userAuthorityAdminService.getUserAuthority('USRCNFRM_00000000001');
      await userAuthorityAdminService.saveUserAuthority({
        scrtyDcsnTrgtId: 'USRCNFRM_00000000001',
        authrtId: 'ROLE_ADMIN',
      });
      await userAuthorityAdminService.deleteUserAuthorities(['USRCNFRM_00000000001']);

      const paths = [client.get, client.post, client.delete].flatMap((fn) =>
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
