/**
 * AuthorAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/AuthorAdminService.ts` 는 권한 그룹(authorities)
 * 관리 화면 8개 파일(SecurityHubClient · SecurityDeptAuthorityClient ·
 * MenuByAuthorityClient · AdminDashboardClient · 각 page.tsx)이 공유하는 **유일한
 * 진입점**인데도 테스트가 한 건도 없었다. 로직이 얇아 "테스트할 게 없다"고 보이지만,
 * 아래 항목들은 **틀어져도 컴파일·tsc·ESLint 를 전부 통과한 채 런타임에서만 조용히
 * 깨진다.**
 *
 * 1) URL 조합 — `AdminService('/authorities')` 는 category 기본값 'system' 과 합쳐져
 *    ApiService 에서 `admin/system/authorities` 로 합성된다(선행 슬래시 제거 +
 *    `admin/{category}/` 접두). 한 글자만 어긋나도 결과는 404 이고 화면에는 실패
 *    토스트만 뜬다 — 어느 경로가 틀렸는지 아무도 모른다.
 *
 * 2) 페이징 변환이 **2단으로 겹쳐 있다** — 이 서비스가 가장 위험한 지점이다.
 *    - AuthorAdminService.getAuthorList 가 먼저 `page`(0-based) → `pageIndex`(+1),
 *      `pageNo`(1-based) → `pageIndex`(그대로) 를 계산하고,
 *    - 그 결과를 ApiService.get 이 다시 받아 `size`/`pageSize` → `recordCountPerPage`
 *      를 매핑한다. ApiService 의 `page` → `pageIndex` 변환은 `pageIndex` 가 이미
 *      채워져 있어 **건너뛴다**.
 *    이 순서가 무너져 +1 이 사라지거나 두 번 적용되면 목록이 한 페이지씩 밀리거나
 *    첫 페이지가 빈다. 타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 호출부 params 의 비(非)변형 — ApiService.get 은 넘겨받은 params 객체를 **제자리에서
 *    변형(mutate)** 한다. getAuthorList 가 사본(`{ ...params }`)이 아니라 원본을 넘기면
 *    React Query 의 queryKey 객체가 오염돼 캐시 키가 요청 후 바뀐다.
 *
 * 4) 경로 변수 치환 — update/delete 는 인자로 받은 권한 코드를 URL 에 박는다. 본문 필드
 *    (authrtNm 등)를 잘못 집으면 **엉뚱한 권한 그룹을 수정하거나 삭제한다** — 되돌릴 수
 *    없는 사고다. 특히 `deleteAuthor`(단건, `/{코드}`)와 `deleteAuthors`(다중, 컬렉션
 *    경로 + 본문 배열)는 URL 이 서로 달라 뒤바뀌면 전량 삭제/미삭제로 갈린다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·signal 등)가 유실되면 화면
 *    이탈 시 요청 취소(AbortSignal)가 동작하지 않고 SSR 의 쿠키 주입 config(page.tsx)도
 *    사라진다. 유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { MenuByAuthority } from '@/types/foundation/security';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { authorAdminService, type AuthorInfo } from '../AuthorAdminService';

/** 이 서비스가 합성해야 하는 실제 최종 URL 접두. 클래스는 export 되지 않으므로 싱글턴으로만 관측한다. */
const BASE = 'admin/system/authorities';

describe('AuthorAdminService — 권한 그룹 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('URL 조합 (basePath)', () => {
    it('인자 없는 목록 조회는 admin/system/authorities 로 나가며 후행 슬래시가 붙지 않는다', async () => {
      await authorAdminService.getAuthorList();

      // params 를 안 넘겨도 서비스가 빈 객체를 만들어 config.params 로 실어 보낸다.
      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', { params: {} });
    });

    it('모든 공개 메서드가 동일한 admin/system/authorities 접두 아래로만 나간다', async () => {
      await authorAdminService.getAuthorList();
      await authorAdminService.getAuthor('A');
      await authorAdminService.getAuthorMenus('E');
      await authorAdminService.createAuthor({});
      await authorAdminService.updateAuthor('B', {});
      await authorAdminService.deleteAuthor('C');
      await authorAdminService.deleteAuthors(['D']);

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        BASE,
        `${BASE}/A`,
        `${BASE}/E/menus`,
      ]);
      expect(client.post.mock.calls.map((call) => call[0])).toEqual([BASE]);
      expect(client.put.mock.calls.map((call) => call[0])).toEqual([`${BASE}/B`]);
      // 단건 삭제는 /{코드}, 다중 삭제는 컬렉션 경로 — 둘의 URL 이 같아지면 전량 삭제 사고다.
      expect(client.delete.mock.calls.map((call) => call[0])).toEqual([`${BASE}/C`, BASE]);
    });
  });

  describe('목록 조회 — 2단 페이징 파라미터 변환', () => {
    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await authorAdminService.getAuthorList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 0, pageIndex: 1 } });
    });

    it('page 1 은 pageIndex 2 로, size 20 은 recordCountPerPage 20 으로 변환되고 원본 키도 함께 남는다', async () => {
      await authorAdminService.getAuthorList({ page: 1, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 20, pageIndex: 2, recordCountPerPage: 20 },
      });
    });

    it('page 의 +1 은 서비스에서 한 번만 적용되고 ApiService 가 다시 더하지 않는다 (이중 가산 금지)', async () => {
      await authorAdminService.getAuthorList({ page: 4 });

      // 서비스가 pageIndex 를 먼저 채우므로 ApiService 의 page→pageIndex 분기는 건너뛴다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 5 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 6 } });
    });

    it('pageNo 는 이미 1-based 이므로 +1 없이 그대로 pageIndex 가 된다', async () => {
      await authorAdminService.getAuthorList({ pageNo: 3 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageNo: 3, pageIndex: 3 } });
    });

    it('page 와 pageNo 가 함께 오면 pageNo 가 최종 pageIndex 를 결정한다 (나중 대입이 이긴다)', async () => {
      await authorAdminService.getAuthorList({ page: 6, pageNo: 2 });

      // 두 if 문의 순서가 뒤바뀌면 pageNo 를 쓰는 화면(MenuByAuthorityClient)이 조용히 밀린다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 6, pageNo: 2, pageIndex: 2 },
      });
    });

    it('pageIndex 를 직접 넘기면 그대로 유지되고 size 만 recordCountPerPage 로 확장된다', async () => {
      // 실사용: /admin 대시보드가 총건수만 필요해 { pageIndex: 1, size: 1 } 로 호출한다.
      await authorAdminService.getAuthorList({ pageIndex: 1, size: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, size: 1, recordCountPerPage: 1 },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장되지만 pageIndex 는 만들지 않는다', async () => {
      await authorAdminService.getAuthorList({ pageSize: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 50, recordCountPerPage: 50, size: 50 },
      });
    });

    it('검색 조건과 pageUnit 은 변형 없이 그대로 전달되며 page 변환과 공존한다', async () => {
      await authorAdminService.getAuthorList({
        page: 0,
        pageUnit: 5,
        searchCondition: '1',
        searchKeyword: '',
      });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageUnit: 5, searchCondition: '1', searchKeyword: '', pageIndex: 1 },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 사본을 만들지 않으면 queryKey 가 오염된다', async () => {
      const callerParams: SearchParams = { page: 1, size: 10 };

      await authorAdminService.getAuthorList(callerParams);

      // ApiService.get 은 넘겨받은 params 를 제자리에서 변형하므로, 사본 전달이 계약이다.
      expect(callerParams).toEqual({ page: 1, size: 10 });
      expect(callerParams.pageIndex).toBeUndefined();
      expect(callerParams.recordCountPerPage).toBeUndefined();
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await authorAdminService.getAuthorList({ page: 1 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 1, pageIndex: 2 },
      });
    });

    it('목록 조회는 클라이언트 응답을 가공 없이 그대로 반환한다', async () => {
      const page: PageResponse<AuthorInfo> = {
        list: [{ authrtCd: 'ROLE_ADMIN', authrtNm: '관리자' }],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(authorAdminService.getAuthorList({})).resolves.toBe(page);
    });
  });

  describe('단건 조회 · 생성 · 수정 — 경로 변수 치환', () => {
    it('단건 조회는 권한 코드를 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await authorAdminService.getAuthor('ROLE_ADMIN', { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 (빈 객체로 대체하지 않는다)', async () => {
      await authorAdminService.getAuthor('ROLE_ADMIN');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, undefined);
    });

    it('권한 생성은 컬렉션 경로에 payload 를 가공 없이 실어 POST 한다', async () => {
      const payload: Partial<AuthorInfo> = {
        authrtCd: 'ROLE_NEW',
        authrtNm: '신규권한',
        authrtExpln: '설명',
      };

      await authorAdminService.createAuthor(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      // 참조까지 동일해야 한다 — 중간에서 필드를 추리거나 재조립하지 않는다는 뜻이다.
      expect(client.post.mock.calls[0][1]).toBe(payload);
    });

    it('권한 수정의 경로는 첫 번째 인자(authorCode)로 결정되며 본문 필드가 경로를 바꾸지 않는다', async () => {
      const payload: Partial<AuthorInfo> = { authrtCd: 'ROLE_ADMIN', authrtNm: 'ROLE_EDITOR' };

      await authorAdminService.updateAuthor('ROLE_ADMIN', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, payload, { timeout: 2000 });
      // 본문의 authrtNm('ROLE_EDITOR')을 집으면 엉뚱한 권한 그룹을 덮어쓴다.
      expect(client.put).not.toHaveBeenCalledWith(
        `${BASE}/ROLE_EDITOR`,
        expect.anything(),
        expect.anything(),
      );
    });

    it('권한별 메뉴 조회는 /{권한코드}/menus 하위 경로로 나가고 응답 배열을 그대로 반환한다', async () => {
      const menus: MenuByAuthority[] = [
        { menuNo: 1, menuNm: '시스템관리', upperMenuId: 0, menuOrdr: 1, prgrmFileNm: '/admin/system' },
      ];
      client.get.mockResolvedValueOnce(menus);

      await expect(authorAdminService.getAuthorMenus('ROLE_USER')).resolves.toBe(menus);
      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_USER/menus`, undefined);
    });
  });

  describe('삭제 — 단건과 다중은 URL·본문 규약이 다르다', () => {
    it('단건 삭제는 지정한 코드 경로로만 나가고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await authorAdminService.deleteAuthor('ROLE_TEMP');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ROLE_TEMP`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('다중 삭제는 컬렉션 경로로 나가며 코드 배열을 요청 본문(data)에 담는다', async () => {
      const codes = ['ROLE_A', 'ROLE_B'];

      await authorAdminService.deleteAuthors(codes);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: codes });
      // 경로 변수로 이어붙이면 'admin/system/authorities/ROLE_A,ROLE_B' 가 되어 404 다.
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/ROLE_A,ROLE_B`, expect.anything());
    });

    it('다중 삭제도 호출부 config 를 보존하며 data 와 병합한다', async () => {
      const { signal } = new AbortController();

      await authorAdminService.deleteAuthors(['ROLE_A'], { timeout: 5000, signal });

      expect(client.delete).toHaveBeenCalledWith(BASE, {
        timeout: 5000,
        signal,
        data: ['ROLE_A'],
      });
    });

    it('단건 삭제와 다중 삭제는 서로 다른 URL 로 나간다 — 뒤바뀌면 전량 삭제 또는 미삭제가 된다', async () => {
      await authorAdminService.deleteAuthor('ROLE_ONE');
      await authorAdminService.deleteAuthors(['ROLE_TWO']);

      expect(client.delete.mock.calls).toEqual([
        [`${BASE}/ROLE_ONE`, undefined],
        [BASE, { data: ['ROLE_TWO'] }],
      ]);
    });
  });

  describe('싱글턴 export 표면', () => {
    it('authorAdminService 는 화면 8개가 의존하는 7개 메서드를 모두 노출한다', () => {
      // 클래스는 export 되지 않으므로 이 싱글턴이 유일한 공개 계약면이다.
      // 메서드가 사라지거나 이름이 바뀌면 호출부가 런타임 TypeError 로만 드러난다.
      expect(typeof authorAdminService.getAuthorList).toBe('function');
      expect(typeof authorAdminService.getAuthor).toBe('function');
      expect(typeof authorAdminService.createAuthor).toBe('function');
      expect(typeof authorAdminService.updateAuthor).toBe('function');
      expect(typeof authorAdminService.deleteAuthor).toBe('function');
      expect(typeof authorAdminService.deleteAuthors).toBe('function');
      expect(typeof authorAdminService.getAuthorMenus).toBe('function');
    });
  });
});
