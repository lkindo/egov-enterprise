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

  describe('목록 조회 — 페이징 파라미터 전달(ADR-0036)', () => {
    it('첫 페이지(page 1)는 page 1 그대로 나간다 — 종전의 pageIndex 변환이 되살아나면 red', async () => {
      await authorAdminService.getAuthorList({ page: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 1 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { pageIndex: 1 } });
    });

    it('page 2·size 20 은 두 키 그대로 나가고 옛 크기 이름(pageUnit·recordCountPerPage)은 만들지 않는다', async () => {
      await authorAdminService.getAuthorList({ page: 2, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 2, size: 20 } });
      const [, config] = client.get.mock.calls[0] as [string, { params: Record<string, unknown> }];
      expect(Object.keys(config.params).sort()).toEqual(['page', 'size']);
    });

    it('page 는 어디서도 ±1 되지 않는다 (서비스·transport 이중 가산·감산 금지)', async () => {
      await authorAdminService.getAuthorList({ page: 5 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 5 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 4 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { page: 6 } });
    });

    it('옛 별칭 pageNo 는 page 로 번역하지도 서버로 보내지도 않는다', async () => {
      await authorAdminService.getAuthorList({ pageNo: 3 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('page 와 옛 별칭 pageNo 가 함께 오면 page 만 나간다', async () => {
      await authorAdminService.getAuthorList({ page: 6, pageNo: 2 });

      // MenuByAuthorityClient 등 호출부는 이제 page 를 쓴다 — 옛 이름이 번호를 덮어쓰면 조용히 밀린다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 6 },
      });
    });

    it('대시보드 실호출 형태(page 1·size 1)는 그대로 나간다', async () => {
      // 실사용: /admin 대시보드가 총건수만 필요해 { page: 1, size: 1 } 로 호출한다.
      await authorAdminService.getAuthorList({ page: 1, size: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 1 },
      });
    });

    it('옛 크기 이름(pageSize·pageUnit·recordCountPerPage)은 size 로 번역하지도 보내지도 않는다', async () => {
      await authorAdminService.getAuthorList({ pageSize: 50, pageUnit: 50, recordCountPerPage: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('검색 조건과 size 는 변형 없이 그대로 전달되며 page 와 공존한다', async () => {
      await authorAdminService.getAuthorList({
        page: 1,
        size: 5,
        searchCondition: '1',
        searchKeyword: '',
      });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 5, searchCondition: '1', searchKeyword: '' },
      });
    });

    it('호출부가 넘긴 params 객체는 변형되지 않는다 — 사본을 만들지 않으면 queryKey 가 오염된다', async () => {
      const callerParams: SearchParams = { page: 1, size: 10 };

      await authorAdminService.getAuthorList(callerParams);

      // 서비스는 새 query 객체를 만든다 — 호출부 객체를 그대로 transport 에 넘기지 않는다.
      expect(callerParams).toEqual({ page: 1, size: 10 });
      const [, config] = client.get.mock.calls[0] as [string, { params: Record<string, unknown> }];
      expect(config.params).not.toBe(callerParams);
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await authorAdminService.getAuthorList({ page: 2 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 2 },
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
