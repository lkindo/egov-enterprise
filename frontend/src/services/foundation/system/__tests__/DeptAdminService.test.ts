/**
 * 부서 관리자 API의 생성 operation 경계를 검증한다.
 * 조직도·부서 선택은 /tree 전량 조회를 사용하며 페이지 상한을 두지 않는다.
 * 경로 변수, 본문, SSR 인증 헤더·취소 신호와 계층 저장 timeout을 보존해야 한다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptAdminService, type Department } from '../DeptAdminService';

/** 생성 operation이 사용하는 부서 API 접두. */
const BASE = 'admin/system/departments';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });

function generatedDeptFallback(url: string): unknown {
  if (url === `${BASE}/tree`) return [];
  return { ognzId: 'ORG_001', ognzNm: '부서' };
}

describe('DeptAdminService — 부서(조직) 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation(async (url: string, config?: unknown) => {
      const data = await client.get(url, config);
      return envelope(data ?? generatedDeptFallback(url));
    });
    client.requestRaw.mockImplementation(async (request: Record<string, unknown>) => {
      const { url, method, data, ...config } = request;
      const forwardedConfig = Object.keys(config).length === 0 ? undefined : config;
      let result: unknown;
      if (method === 'post') result = await client.post(url, data, forwardedConfig);
      else if (method === 'put') result = await client.put(url, data, forwardedConfig);
      else if (method === 'delete') {
        result = await client.delete(url, data === undefined ? forwardedConfig : { ...config, data });
      }
      return envelope(result ?? (method === 'post' ? 'ORG_001' : undefined));
    });
  });

  describe('조직도 트리 조회 (getDeptTree)', () => {
    it('트리는 전용 경로 /tree 로 나간다 — 목록 경로로 되돌아가면 기본 size=10 에 잘린다', async () => {
      await deptAdminService.getDeptTree();

      expect(client.get).toHaveBeenCalledWith(`${BASE}/tree`, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('keyword 를 주면 params.keyword 하나만 실린다 — 페이징 키는 절대 동승하지 않는다', async () => {
      // 서버가 Pageable.unpaged() 로 전량을 주므로 size/pageIndex 를 보낼 이유가 없다(D-11).
      // 객체 전체 비교이므로 page·size·pageIndex·recordCountPerPage 가 끼어들면 이 단언이 깨진다.
      await deptAdminService.getDeptTree('인사');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/tree`, { params: { keyword: '인사' } });
    });

    it('빈 문자열 keyword 는 params 자체를 생략한다 — keyword= 빈값을 서버로 보내지 않는다', async () => {
      await deptAdminService.getDeptTree('');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/tree`, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/tree`, { params: { keyword: '' } });
    });

    it('keyword 없이 config 만 넘겨도 signal 이 보존된다', async () => {
      const { signal } = new AbortController();

      await deptAdminService.getDeptTree(undefined, { signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/tree`, { signal, params: {} });
    });

    it('검색어와 함께 SSR 인증 헤더·timeout·취소 신호를 보존한다', async () => {
      const { signal } = new AbortController();
      const headers = { Authorization: 'Bearer test-token' };

      await deptAdminService.getDeptTree('인사', { headers, timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/tree`, {
        headers, timeout: 3000, signal, params: { keyword: '인사' },
      });
    });

    it('트리 응답은 PageResponse 로 감싸지 않은 배열 그대로 반환된다', async () => {
      const tree: Department[] = [
        { ognzId: 'ORG_001', ognzNm: '경영지원부', sortOrdr: 1 },
        { ognzId: 'ORG_002', ognzNm: '인사팀', upOgnzId: 'ORG_001', sortOrdr: 2 },
      ];
      client.get.mockResolvedValueOnce(tree);

      await expect(deptAdminService.getDeptTree()).resolves.toBe(tree);
    });
  });

  describe('부서 단건 조회 (getDept)', () => {
    it('deptId 가 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await deptAdminService.getDept('ORG_001', { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/ORG_001`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/ORG_002`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await deptAdminService.getDept('ORG_001');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/ORG_001`, undefined);
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const dept: Department = {
        ognzId: 'ORG_002',
        ognzNm: '인사팀',
        ognzExpln: '채용·평가',
        upOgnzId: 'ORG_001',
        sortOrdr: 2,
      };
      client.get.mockResolvedValueOnce(dept);

      await expect(deptAdminService.getDept('ORG_002')).resolves.toBe(dept);
    });
  });

  describe('부서 등록 (createDept)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<Department> = {
        ognzNm: '신설팀',
        ognzExpln: '신규 조직',
        upOgnzId: 'ORG_001',
        sortOrdr: 3,
      };

      await deptAdminService.createDept(payload);

      // ognzId 는 서버가 채번하므로 본문에 없어도 되고, 경로에도 붙지 않는다.
      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('등록 시 config(timeout)가 유실되지 않는다', async () => {
      const payload: Partial<Department> = { ognzNm: '신설팀' };

      await deptAdminService.createDept(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
    });

    it('서버가 채번한 ognzId 문자열을 가공 없이 반환한다', async () => {
      client.post.mockResolvedValueOnce('ORG_009');

      await expect(deptAdminService.createDept({ ognzNm: '신설팀' })).resolves.toBe('ORG_009');
    });
  });

  describe('부서 수정 (updateDept)', () => {
    it('인자로 받은 deptId 가 경로를 결정한다 — 본문의 ognzId 가 아니다', async () => {
      // 본문에 다른 ognzId(ORG_009)를 심어 두고, 경로는 인자(ORG_001)만 따르는지 확인한다.
      // 본문을 따라가도록 바뀌면 화면에서 고른 부서가 아닌 엉뚱한 부서가 수정된다.
      const payload: Partial<Department> = { ognzId: 'ORG_009', ognzNm: '이름만 수정' };

      await deptAdminService.updateDept('ORG_001', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ORG_001`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/ORG_009`, payload, { timeout: 2000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다', async () => {
      const payload: Partial<Department> = { ognzNm: '이름만 수정' };

      await deptAdminService.updateDept('ORG_001', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ORG_001`, payload, undefined);
    });
  });

  describe('조직 계층 일괄 저장 (updateDeptHierarchy)', () => {
    const items: Array<Pick<Department, 'ognzId'> & { upOgnzId?: string; sortOrdr?: number }> = [
      { ognzId: 'ORG_001', upOgnzId: undefined, sortOrdr: 1 },
      { ognzId: 'ORG_002', upOgnzId: 'ORG_001', sortOrdr: 2 },
    ];

    it('리터럴 경로 /batch-hierarchy 로 PUT 한다 — /{deptId} 규칙과 섞이면 다른 부서를 수정한다', async () => {
      await deptAdminService.updateDeptHierarchy(items);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, { timeout: 60000 });
      // 첫 항목 id 를 경로 변수로 오인하면 단건 수정 요청이 되어 계층이 저장되지 않는다.
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/ORG_001`, items, { timeout: 60000 });
    });

    it('항목 배열을 래핑 없이 그대로 본문에 싣는다 — 백엔드가 List<DeptManageDto> 로 받는다', async () => {
      await deptAdminService.updateDeptHierarchy(items);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, { timeout: 60000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, { items }, { timeout: 60000 });
    });

    it('일괄 저장은 60초 timeout 을 강제한다 — 호출부가 지정한 timeout 보다 우선한다', async () => {
      // `{ ...config, timeout: 60000 }` 이라 spread 뒤에 오는 60000 이 항상 이긴다.
      // 순서가 뒤집혀 기본값(15초)으로 돌아가면 대규모 조직 저장이 중간에 끊긴다.
      await deptAdminService.updateDeptHierarchy(items, { timeout: 1000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, { timeout: 60000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, { timeout: 1000 });
    });

    it('서버 액션이 넘긴 Authorization 헤더는 timeout 강제와 무관하게 보존된다', async () => {
      // saveDeptHierarchyAction 은 쿠키의 accessToken 을 헤더로 실어 보낸다. 유실되면 401 이다.
      const headers = { Authorization: 'Bearer test-token' };

      await deptAdminService.updateDeptHierarchy(items, { headers });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, {
        headers,
        timeout: 60000,
      });
    });

    it('AbortSignal 도 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await deptAdminService.updateDeptHierarchy(items, { signal });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/batch-hierarchy`, items, {
        signal,
        timeout: 60000,
      });
    });
  });

  describe('부서 삭제 (deleteDept)', () => {
    it('지정한 deptId 경로로만 DELETE 하고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await deptAdminService.deleteDept('ORG_002');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ORG_002`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await deptAdminService.deleteDept('ORG_002', { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ORG_002`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 409 를 그대로 전파한다', async () => {
      // 소속 사용자·하위 부서가 있으면 서버가 409 로 막는다. 이를 삼키면 화면이 성공으로 오인한다.
      const conflict = new Error('하위 부서가 존재합니다');
      client.delete.mockRejectedValueOnce(conflict);

      await expect(deptAdminService.deleteDept('ORG_001')).rejects.toBe(conflict);
    });
  });

  describe('경로 격리', () => {
    it('트리와 단건 조회 경로를 구분하고 페이징 목록 경로를 호출하지 않는다', async () => {
      await deptAdminService.getDeptTree('인사');
      await deptAdminService.getDept('ORG_001');

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/departments/tree',
        'admin/system/departments/ORG_001',
      ]);
    });

    it('두 종류의 PUT 은 서로 다른 경로를 쓴다 — 단건 수정과 계층 일괄 저장은 별개 엔드포인트다', async () => {
      await deptAdminService.updateDept('ORG_001', { ognzNm: '수정' });
      await deptAdminService.updateDeptHierarchy([{ ognzId: 'ORG_001', sortOrdr: 1 }]);

      expect(client.put.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/departments/ORG_001',
        'admin/system/departments/batch-hierarchy',
      ]);
    });

    it('모든 요청 경로는 admin/system/departments 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await deptAdminService.getDeptTree('인사');
      await deptAdminService.getDept('ORG_001');
      await deptAdminService.createDept({ ognzNm: '신설팀' });
      await deptAdminService.updateDept('ORG_001', { ognzNm: '수정' });
      await deptAdminService.updateDeptHierarchy([{ ognzId: 'ORG_001', sortOrdr: 1 }]);
      await deptAdminService.deleteDept('ORG_002');

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(6);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});
