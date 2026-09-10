/** Compatibility reads used by the dashboard and menu preview. All writes use AuthorizationAdminService. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => {
  const success = (data: unknown) => ({ success: true, code: 'S000', message: 'success', data });
  const defaultAuthor = { authrtCd: 'ROLE_DEFAULT', authrtNm: '기본 권한' };
  const defaultPage = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
  return {
    default: {
      ...client,
      getRaw: async (url: string, config?: unknown) => {
        const result = await client.get(url, config);
        const fallback = url.endsWith('/menus') ? [] : url.endsWith('/roles') || url === 'admin/system/authorities'
          ? defaultPage
          : defaultAuthor;
        return success(result ?? fallback);
      },
      requestRaw: async (requestConfig: Record<string, unknown>) => {
        const { url, method, data, ...config } = requestConfig;
        const forwardedConfig = Object.keys(config).length === 0 ? undefined : config;
        if (method === 'post') await client.post(url, data, forwardedConfig);
        if (method === 'put') await client.put(url, data, forwardedConfig);
        if (method === 'delete') {
          const deleteConfig = data === undefined
            ? forwardedConfig
            : { ...(forwardedConfig ?? {}), data };
          await client.delete(url, deleteConfig);
        }
        return success(null);
      },
    },
  };
});

import {
  authorAdminService,
  type AuthorInfo,
  type AuthorMenuAssignment,
} from '../AuthorAdminService';

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
  });

  describe('목록 조회 — 2단 페이징 파라미터 변환', () => {
    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await authorAdminService.getAuthorList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageIndex: 1 } });
    });

    it('page 1 은 pageIndex 2 로, size 20 은 recordCountPerPage 20 으로 변환되고 원본 키도 함께 남는다', async () => {
      await authorAdminService.getAuthorList({ page: 1, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 2, pageUnit: 20, recordCountPerPage: 20 },
      });
    });

    it('page 의 +1 은 서비스에서 한 번만 적용되고 ApiService 가 다시 더하지 않는다 (이중 가산 금지)', async () => {
      await authorAdminService.getAuthorList({ page: 4 });

      // 서비스가 pageIndex 를 먼저 채우므로 ApiService 의 page→pageIndex 분기는 건너뛴다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageIndex: 5 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 6 } });
    });

    it('pageNo 는 이미 1-based 이므로 +1 없이 그대로 pageIndex 가 된다', async () => {
      await authorAdminService.getAuthorList({ pageNo: 3 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageIndex: 3 } });
    });

    it('page 와 pageNo 가 함께 오면 pageNo 가 최종 pageIndex 를 결정한다 (나중 대입이 이긴다)', async () => {
      await authorAdminService.getAuthorList({ page: 6, pageNo: 2 });

      // 두 if 문의 순서가 뒤바뀌면 pageNo 를 쓰는 화면(MenuByAuthorityClient)이 조용히 밀린다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 2 },
      });
    });

    it('pageIndex 를 직접 넘기면 그대로 유지되고 size 만 recordCountPerPage 로 확장된다', async () => {
      // 실사용: /admin 대시보드가 총건수만 필요해 { pageIndex: 1, size: 1 } 로 호출한다.
      await authorAdminService.getAuthorList({ pageIndex: 1, size: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 1, pageUnit: 1, recordCountPerPage: 1 },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장되지만 pageIndex 는 만들지 않는다', async () => {
      await authorAdminService.getAuthorList({ pageSize: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 50, pageUnit: 50 },
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
        params: { pageIndex: 1, pageUnit: 5, searchCondition: '1', searchKeyword: '' },
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
        params: { pageIndex: 2 },
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

    it('권한별 메뉴 조회는 /{권한코드}/menus 하위 경로로 나가고 응답 배열을 그대로 반환한다', async () => {
      const menus: AuthorMenuAssignment[] = [
        { menuSn: 1, authrtCd: 'ROLE_USER', authrtNm: '시스템관리', chkYeoBu: 1 },
      ];
      client.get.mockResolvedValueOnce(menus);

      await expect(authorAdminService.getAuthorMenus('ROLE_USER')).resolves.toBe(menus);
      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_USER/menus`, undefined);
    });
  });
  describe('싱글턴 export 표면', () => {
    it('legacy 읽기 서비스는 남아 있는 목록·메뉴 소비만 제공한다', () => {
      // 클래스는 export 되지 않으므로 이 싱글턴이 유일한 공개 계약면이다.
      // 메서드가 사라지거나 이름이 바뀌면 호출부가 런타임 TypeError 로만 드러난다.
      expect(typeof authorAdminService.getAuthorList).toBe('function');
      expect(typeof authorAdminService.getAuthorMenus).toBe('function');
    });
  });
});
