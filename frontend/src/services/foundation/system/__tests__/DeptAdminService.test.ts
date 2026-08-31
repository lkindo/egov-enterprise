/**
 * DeptAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/DeptAdminService.ts` 는 조직(부서) 관리의 유일한 API 진입점이며,
 * 사용자 관리·근태·보안 정책·조직도 편집 등 **7개 이상의 화면이 이 한 클래스에 물려 있다**
 * (실측: absences / departments / indvdl-info-policy / login-policy / manage / UserOrgHubClient /
 * SecurityDeptAuthorityClient). 그런데도 커버리지 0% 였다. 메서드 본문이 한 줄씩이라 "테스트할 게
 * 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히
 * 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/departments')` 는 `ApiService` 생성자에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/departments` 가 된다(category 기본값 'system').
 *    백엔드 `DeptApiController` 의 `@RequestMapping("/api/v1/admin/system/departments")` 와 맞물리는
 *    지점이며, 접두가 한 글자만 어긋나도 전 메서드가 동시에 404 가 된다. 선행 슬래시가 되살아나면
 *    axios `baseURL`('/api/v1') 의 경로 세그먼트가 통째로 날아가 절대 경로로 해석된다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 규약에 맞춘다. UserOrgHubClient 가
 *    `page: deptPage - 1` 로 0-based 를 넘기므로 이 +1 이 사라지거나 두 번 적용되면 부서 목록이 한
 *    페이지씩 밀리거나 첫 페이지가 통째로 빈다. 타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 검색어 축 — 이 서비스는 형제 서비스(SurveyAdminService 등)와 달리 `searchKeyword → keyword`
 *    승격을 **하지 않는다**. 백엔드가 `@RequestParam(required=false) String keyword` 단일 축으로
 *    받고 모든 호출부도 `keyword` 를 직접 넘기기 때문이다. 여기에 승격 로직이 끼어들면 두 키가
 *    동시에 나가며 서버 바인딩이 흔들린다.
 *
 * 4) 트리 전용 경로 — 조직도는 `/tree` 로 나가야 서버가 `Pageable.unpaged()` 로 전량을 준다(D-11).
 *    이 경로가 목록 경로로 되돌아가면 기본 size=10 이 걸려 **11번째 부서부터 조직도에서 사라지고**,
 *    그 상태로 계층을 저장하면 sortOrdr 가 어긋난 채 영속된다 — 되돌리기 어려운 사고다.
 *
 * 5) 경로 변수 치환 — `updateDept`/`deleteDept` 는 인자 `deptId` 가 경로를 결정한다. 본문에 실린
 *    ognzId 를 따라가도록 바뀌면 **다른 부서를 고치거나 지운다**. 특히 `updateDeptHierarchy` 의
 *    `/batch-hierarchy` 는 **경로 변수가 아니라 리터럴 세그먼트**라서, `/{deptId}` 규칙과 뒤섞이면
 *    "batch-hierarchy 라는 부서" 를 수정하는 요청이 되어 버린다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·Authorization 헤더)가
 *    유실되면 화면 이탈 시 요청 취소가 안 되고, SSR 서버 액션(`saveDeptHierarchyAction`)의 Bearer
 *    토큰이 빠져 401 이 된다. 유실돼도 브라우저 경로에서는 요청이 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
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
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptAdminService, type Department } from '../DeptAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/departments')` + category 기본값 'system' → `admin/system/departments`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/departments';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };

function generatedDeptFallback(url: string): unknown {
  if (url === BASE) return emptyPage;
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

  describe('부서 목록 조회 (getDeptList)', () => {
    it('목록은 admin/system/departments 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await deptAdminService.getDeptList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: {} });
    });

    it('params 를 생략하면 params: undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      // 빈 객체({})로 바꾸면 axios 가 `?` 만 붙은 URL 을 만들 수 있고, 무엇보다
      // 아래 페이징 정규화 분기(config?.params 가 truthy 일 때만 동작)의 전제가 달라진다.
      await deptAdminService.getDeptList(undefined);

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('첫 페이지(page 0)는 생성 Pageable 계약의 page 0으로 유지된다', async () => {
      await deptAdminService.getDeptList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0 },
      });
    });

    it('page 3·size 20 은 생성 Pageable 계약의 두 키만 전달된다', async () => {
      await deptAdminService.getDeptList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 3, size: 20 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await deptAdminService.getDeptList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('pageSize 만 오면 생성 Pageable 계약의 size 로 변환한다', async () => {
      await deptAdminService.getDeptList({ pageSize: 25 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { size: 25 },
      });
    });

    it('실제 화면이 쓰는 { keyword, page: 0, size: 1000 } 조합을 그대로 보존한다', async () => {
      // admin/user/* 5개 페이지가 공통으로 쓰는 호출 형태다(전량 로딩용 size=1000).
      await deptAdminService.getDeptList({ keyword: '', page: 0, size: 1000 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { keyword: '', page: 0, size: 1000 },
      });
    });

    it('keyword 는 가공 없이 그대로 실린다 — 백엔드 @RequestParam("keyword") 와 1:1 이다', async () => {
      await deptAdminService.getDeptList({ keyword: '인사' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { keyword: '인사' } });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 부서 목록은 keyword 단일 축이다', async () => {
      // 형제 서비스(SurveyAdminService)는 승격하지만 이 서비스는 하지 않는다.
      // 승격 로직이 잘못 이식되면 keyword 와 searchKeyword 가 동시에 나가 서버 바인딩이 흔들린다.
      await deptAdminService.getDeptList({ searchKeyword: '인사' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { keyword: '인사' } });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await deptAdminService.getDeptList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0 },
      });
    });

    it('SSR 호출부가 넘기는 Authorization 헤더가 유실되지 않는다', async () => {
      // 서버 컴포넌트(admin/user/*/page.tsx)는 쿠키에서 뽑은 Bearer 토큰을 config 로 넘긴다.
      const headers = { Authorization: 'Bearer test-token' };

      await deptAdminService.getDeptList({ keyword: '' }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, { headers, params: { keyword: '' } });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<Department> = {
        list: [
          { ognzId: 'ORG_001', ognzNm: '경영지원부', ognzExpln: '총무·회계', sortOrdr: 1 },
          { ognzId: 'ORG_002', ognzNm: '인사팀', upOgnzId: 'ORG_001', sortOrdr: 2 },
        ],
        total: 2,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(deptAdminService.getDeptList()).resolves.toBe(page);
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
    it('조회 3종의 경로는 서로 겹치지 않는다 — 트리가 목록으로 흡수되면 조직도가 10건에서 잘린다', async () => {
      await deptAdminService.getDeptList();
      await deptAdminService.getDeptTree('인사');
      await deptAdminService.getDept('ORG_001');

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/departments',
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
      await deptAdminService.getDeptList({ page: 0 });
      await deptAdminService.getDeptTree('인사');
      await deptAdminService.getDept('ORG_001');
      await deptAdminService.createDept({ ognzNm: '신설팀' });
      await deptAdminService.updateDept('ORG_001', { ognzNm: '수정' });
      await deptAdminService.updateDeptHierarchy([{ ognzId: 'ORG_001', sortOrdr: 1 }]);
      await deptAdminService.deleteDept('ORG_002');

      const paths = [client.get, client.post, client.put, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toHaveLength(7);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });
  });
});
