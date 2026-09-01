/**
 * RoleAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/RoleAdminService.ts` 는 시스템 보안 롤(Role) 관리의 API
 * 진입점이며, 화면 호출부는 `app/admin/security/role/SecurityRoleClient.tsx` 한 곳이다
 * (실측: getRoleList / createRole / deleteRole 3개 사용, 나머지 3개는 공개 시그니처만 존재).
 * 메서드 본문이 한 줄씩이라 "테스트할 게 없다"고 보이지만, 아래 항목은 **틀어져도 컴파일과
 * 타입 검사를 모두 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/roles')` 는 `ApiService` 생성자에서 선행 슬래시가 제거되고
 *    `admin/{category}/` 접두가 붙어 최종 `admin/system/roles` 가 된다(category 기본값 'system').
 *    백엔드 `RoleApiController` 의 `@RequestMapping("/api/v1/admin/system/roles")` 와 맞물리는
 *    지점이며, 접두가 한 글자만 어긋나도 전 메서드가 동시에 404 가 된다. 선행 슬래시가 되살아나면
 *    axios `baseURL`('/api/v1') 의 경로 세그먼트가 통째로 날아가 절대 경로로 해석된다.
 *
 * 2) 단건 삭제 ↔ 다중 삭제의 분기가 **경로 하나뿐이다** — 백엔드에 `@DeleteMapping("/{roleCode}")`
 *    와 `@DeleteMapping`(컬렉션, `@RequestBody List<String>`) 이 **둘 다** 존재한다. 즉
 *    `deleteRole` 이 경로 변수를 잃으면 404 가 아니라 **다중 삭제 엔드포인트로 떨어진다**.
 *    반대로 `deleteRoles` 가 본문(`config.data`)을 잃으면 컬렉션 DELETE 가 본문 없이 나간다.
 *    그래서 이 두 메서드는 "무엇이 호출됐나"가 아니라 **경로와 본문의 조합**으로 고정한다.
 *    (이 경로는 `PrivilegeEscalationVulnerabilityTest` 가 수직 권한 상승 표적으로 삼는
 *     `DELETE /api/v1/admin/system/roles/{roleCode}` 와 동일하다 — 흔들리면 그 전제도 흔들린다.)
 *
 * 3) 경로 변수 치환 — `updateRole` 은 **인자 `roleCode` 만** 경로를 결정한다. 서버 컨트롤러가
 *    `dto.setRoleId(roleCode)` 로 본문의 roleId 를 덮어쓰므로 **경로가 진실의 원천**이다.
 *    경로가 본문 roleId 를 따라가도록 바뀌면 화면에서 고른 롤이 아닌 **다른 롤이 수정된다**.
 *
 * 4) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 규약에 맞춘다. 이 +1 이
 *    사라지거나 두 번 적용되면 롤 목록이 한 페이지씩 밀리거나 첫 페이지가 통째로 빈다.
 *    타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 5) 검색어 축 — 이 서비스는 형제 서비스와 달리 `searchKeyword → keyword` 승격을 **하지 않는다**.
 *    백엔드가 `BaseSearchDto.searchKeyword` 로 받고 화면도 `searchKeyword` 를 직접 넘긴다.
 *    여기에 승격 로직이 끼어들면 두 키가 동시에 나가며 서버 바인딩이 흔들린다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·헤더)가 유실되면
 *    화면 이탈 시 요청 취소가 안 된다. 유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * ※ 같은 백엔드 엔드포인트를 치는 **또 다른 클라이언트**가 존재한다
 *   (`services/foundation/security/SecurityAdminService.ts` 의 `RoleAdminService` — `updateRole` 이
 *    경로를 인자가 아닌 `role.roleId` 에서 뽑는 다른 시그니처다). 두 클라이언트가 같은 자원을
 *    겨루므로, 이 파일 쪽 계약을 명시적으로 고정해 둔다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';
import type { RoleManage } from '@/types/foundation/security';

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

import { roleAdminService } from '../RoleAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/roles')` + category 기본값 'system' → `admin/system/roles`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/roles';

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };

/** 롤 픽스처 — RoleManage 의 필수 필드를 모두 채운다. */
const ROLE_ADMIN: RoleManage = {
  roleId: 'ROLE_ADMIN',
  roleNm: '시스템 관리자',
  rolePatrn: '/admin/**',
  roleExpln: '관리자 전 기능 접근',
  roleTypeCd: 'url',
  roleSort: '1',
};

describe('RoleAdminService — 시스템 롤(Role) 관리자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation(async (url: string, config?: unknown) => {
      const data = await client.get(url, config);
      return envelope(data ?? (url === BASE ? emptyPage : ROLE_ADMIN));
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
      return envelope(result);
    });
  });

  describe('롤 목록 조회 (getRoleList)', () => {
    it('목록은 admin/system/roles 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await roleAdminService.getRoleList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: {} });
    });

    it('params 를 생략하면 params: undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      // 빈 객체({})로 바꾸면 axios 가 `?` 만 붙은 URL 을 만들 수 있고, 무엇보다
      // 페이징 정규화 분기(config?.params 가 truthy 일 때만 동작)의 전제가 달라진다.
      await roleAdminService.getRoleList(undefined);

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await roleAdminService.getRoleList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageIndex: 1, searchKeyword: '' } });
      // +1 이 사라지면 pageIndex 0 이 되고, 서버는 firstIndex 가 음수인 쿼리를 받는다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { pageIndex: 0, searchKeyword: '' } });
    });

    it('page 3·size 20 은 BaseSearch 생성 계약의 1-based 페이지 필드로 정규화된다', async () => {
      await roleAdminService.getRoleList({ page: 3, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 4, pageUnit: 20, recordCountPerPage: 20, searchKeyword: '' },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await roleAdminService.getRoleList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { pageIndex: 1, searchKeyword: '' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { pageIndex: 10, searchKeyword: '' } });
    });

    it('호출부가 recordCountPerPage 를 직접 지정하면 size 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // size 20 이었다면 변환 결과는 recordCountPerPage 20 이겠지만, 명시값 50 이 이긴다.
      await roleAdminService.getRoleList({ size: 20, recordCountPerPage: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageUnit: 20, recordCountPerPage: 50, searchKeyword: '' },
      });
    });

    it('pageSize 만 오면 BaseSearch 생성 계약의 pageUnit 을 함께 채운다', async () => {
      await roleAdminService.getRoleList({ pageSize: 25 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, pageUnit: 25, searchKeyword: '' },
      });
    });

    it('size 와 pageSize 가 함께 오면 size 축이 먼저 평가돼 recordCountPerPage 는 size 값을 갖는다', async () => {
      // ApiService.get 의 분기 순서(page → size → pageSize)가 그대로 드러나는 지점이다.
      // size 분기가 recordCountPerPage 를 10 으로 채운 뒤이므로 pageSize(25)는 더 이상 끼어들지 못한다.
      await roleAdminService.getRoleList({ pageSize: 25, size: 10 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, pageUnit: 10, recordCountPerPage: 10, searchKeyword: '' },
      });
      // 분기 순서가 뒤집히면 25 가 들어가 페이지당 건수가 조용히 2.5배로 늘어난다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, size: 10, recordCountPerPage: 25 },
      });
    });

    it('searchCondition·searchKeyword 는 가공 없이 그대로 실린다 — BaseSearchDto 축과 1:1 이다', async () => {
      await roleAdminService.getRoleList({ searchCondition: 'roleNm', searchKeyword: '관리' });

      // 객체 전체 비교이므로 다른 키가 끼어들면 이 단언이 깨진다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchCondition: 'roleNm', searchKeyword: '관리' },
      });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 롤 목록은 searchKeyword 단일 축이다', async () => {
      // 형제 서비스(DeptAdminService)는 keyword 축을 쓰지만 이 서비스는 BaseSearchDto 축이다.
      // 승격 로직이 잘못 이식되면 두 키가 동시에 나가 서버 바인딩이 흔들린다.
      await roleAdminService.getRoleList({ searchKeyword: '관리' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '관리' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '관리', keyword: '관리' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await roleAdminService.getRoleList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { pageIndex: 1, searchKeyword: '' },
      });
    });

    it('config 의 헤더가 페이징 정규화 과정에서 유실되지 않는다', async () => {
      // 현재 화면 호출부는 config 를 쓰지 않지만 시그니처는 공개돼 있고,
      // 정규화 분기가 config 를 통째로 재조립(`{ ...config, params }`)하므로 유실 가능성이 실재한다.
      const headers = { Authorization: 'Bearer test-token' };

      await roleAdminService.getRoleList({ page: 1 }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        headers,
        params: { pageIndex: 2, searchKeyword: '' },
      });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<RoleManage> = {
        list: [
          ROLE_ADMIN,
          {
            roleId: 'ROLE_USER',
            roleNm: '일반 사용자',
            rolePatrn: '/user/**',
            roleExpln: '일반 사용자 접근',
            roleTypeCd: 'url',
            roleSort: '2',
          },
        ],
        total: 2,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(roleAdminService.getRoleList()).resolves.toBe(page);
    });

    it('목록 조회 실패를 빈 결과로 위장하지 않고 그대로 전파한다', async () => {
      // 화면(SecurityRoleClient)이 error 를 받아 재시도 UI 를 띄우는 전제다.
      // 여기서 삼키면 권한 목록이 "데이터 없음"으로 보여 관리자가 롤이 사라진 줄 안다.
      const failure = new Error('500 Internal Server Error');
      client.get.mockRejectedValueOnce(failure);

      await expect(roleAdminService.getRoleList()).rejects.toBe(failure);
    });
  });

  describe('롤 단건 조회 (getRole)', () => {
    it('roleCode 가 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await roleAdminService.getRole('ROLE_ADMIN', { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/ROLE_USER`, { timeout: 1000 });
    });

    it('단건 조회는 config 를 params 로 감싸지 않는다 — 생략 시 undefined 가 그대로 간다', async () => {
      await roleAdminService.getRole('ROLE_ADMIN');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, undefined);
      // 목록 경로처럼 `{ params: ... }` 로 감싸면 상세 요청에 불필요한 쿼리스트링이 붙는다.
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, { params: undefined });
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      client.get.mockResolvedValueOnce(ROLE_ADMIN);

      await expect(roleAdminService.getRole('ROLE_ADMIN')).resolves.toBe(ROLE_ADMIN);
    });
  });

  describe('롤 등록 (createRole)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<RoleManage> = {
        roleNm: '신규 롤',
        rolePatrn: '/report/**',
        roleExpln: '보고서 열람',
        roleTypeCd: 'url',
        roleSort: '3',
      };

      await roleAdminService.createRole(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
      // 백엔드가 RoleManageDto 단일 객체로 받으므로 래핑하면 400 이다.
      expect(client.post).not.toHaveBeenCalledWith(BASE, { data: payload }, undefined);
    });

    it('본문의 roleId 는 경로로 승격되지 않는다 — 등록은 언제나 컬렉션 경로다', async () => {
      // 화면은 roleId 를 사용자가 직접 입력해 등록한다. 그 값이 경로에 붙으면
      // 존재하지 않는 롤에 대한 하위 경로 요청이 되어 404 가 된다.
      const payload: Partial<RoleManage> = { roleId: 'ROLE_NEW', roleNm: '신규 롤' };

      await roleAdminService.createRole(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/ROLE_NEW`, payload, undefined);
    });

    it('등록 시 config(timeout)가 유실되지 않는다', async () => {
      const payload: Partial<RoleManage> = { roleId: 'ROLE_NEW', roleNm: '신규 롤' };

      await roleAdminService.createRole(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
    });

    it('roleId 중복 등 서버 오류를 삼키지 않고 그대로 전파한다', async () => {
      // 화면은 onError 에서 토스트를 띄운다. 여기서 삼키면 등록 실패가 성공으로 보인다.
      const duplicated = new Error('이미 존재하는 roleId 입니다');
      client.post.mockRejectedValueOnce(duplicated);

      await expect(roleAdminService.createRole({ roleId: 'ROLE_ADMIN', roleNm: '중복 롤' })).rejects.toBe(duplicated);
    });
  });

  describe('롤 수정 (updateRole)', () => {
    it('인자로 받은 roleCode 가 경로를 결정한다 — 본문의 roleId 가 아니다', async () => {
      // 본문에 다른 roleId(ROLE_USER)를 심어 두고, 경로는 인자(ROLE_ADMIN)만 따르는지 확인한다.
      // 서버가 dto.setRoleId(roleCode) 로 본문을 덮어쓰므로 경로가 곧 수정 대상이다.
      const payload: Partial<RoleManage> = { roleId: 'ROLE_USER', roleNm: '이름만 수정' };

      await roleAdminService.updateRole('ROLE_ADMIN', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/ROLE_USER`, payload, { timeout: 2000 });
    });

    it('본문에 roleId 를 자동 주입하지 않는다 — 서버가 경로 값으로 채운다', async () => {
      const payload: Partial<RoleManage> = { roleNm: '이름만 수정' };

      await roleAdminService.updateRole('ROLE_ADMIN', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(
        `${BASE}/ROLE_ADMIN`,
        { roleNm: '이름만 수정', roleId: 'ROLE_ADMIN' },
        undefined
      );
    });

    it('수정은 컬렉션 경로로 나가지 않는다 — 경로 변수가 사라지면 대상이 소실된다', async () => {
      const payload: Partial<RoleManage> = { roleNm: '이름만 수정' };

      await roleAdminService.updateRole('ROLE_ADMIN', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/ROLE_ADMIN`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(BASE, payload, undefined);
    });

    it('수정 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await roleAdminService.updateRole('ROLE_ADMIN', { roleNm: '이름만 수정' }, { signal });

      expect(client.put).toHaveBeenCalledWith(
        `${BASE}/ROLE_ADMIN`,
        { roleNm: '이름만 수정' },
        { signal }
      );
    });
  });

  describe('롤 단건 삭제 (deleteRole)', () => {
    it('지정한 roleCode 경로로만 DELETE 한다 — 컬렉션 경로는 다중 삭제 엔드포인트다', async () => {
      await roleAdminService.deleteRole('ROLE_OBSOLETE');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ROLE_OBSOLETE`, undefined);
      // 경로 변수를 잃으면 404 가 아니라 백엔드의 @DeleteMapping(컬렉션)으로 떨어진다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('단건 삭제는 본문(data)을 싣지 않는다 — 다중 삭제와 요청 형태가 다르다', async () => {
      await roleAdminService.deleteRole('ROLE_OBSOLETE');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ROLE_OBSOLETE`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/ROLE_OBSOLETE`, {
        data: ['ROLE_OBSOLETE'],
      });
    });

    it('삭제 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await roleAdminService.deleteRole('ROLE_OBSOLETE', { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/ROLE_OBSOLETE`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 거부를 그대로 전파한다', async () => {
      // 사용자·메뉴에 연결된 롤은 서버가 막는다. 이를 삼키면 화면이 삭제 성공으로 오인한다.
      const conflict = new Error('사용 중인 롤은 삭제할 수 없습니다');
      client.delete.mockRejectedValueOnce(conflict);

      await expect(roleAdminService.deleteRole('ROLE_ADMIN')).rejects.toBe(conflict);
    });
  });

  describe('롤 다중 삭제 (deleteRoles)', () => {
    const codes = ['ROLE_A', 'ROLE_B'];

    it('컬렉션 경로로 DELETE 하고 코드 배열은 config.data 본문에 싣는다', async () => {
      await roleAdminService.deleteRoles(codes);

      // axios 의 DELETE 는 본문을 config.data 로만 실을 수 있다.
      expect(client.delete).toHaveBeenCalledWith(BASE, { data: codes });
      // 첫 코드를 경로 변수로 오인하면 나머지가 조용히 살아남는다.
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/ROLE_A`, { data: codes });
    });

    it('배열을 객체로 래핑하지 않는다 — 백엔드가 List<String> 으로 받는다', async () => {
      await roleAdminService.deleteRoles(codes);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: codes });
      expect(client.delete).not.toHaveBeenCalledWith(BASE, { data: { roleCodes: codes } });
    });

    it('다중 삭제 시 config(timeout·signal)가 본문과 공존한다', async () => {
      const { signal } = new AbortController();

      await roleAdminService.deleteRoles(codes, { timeout: 30000, signal });

      expect(client.delete).toHaveBeenCalledWith(BASE, { timeout: 30000, signal, data: codes });
    });

    it('config.data 로 생성 operation 본문을 덮어쓰려 하면 fail-closed 한다', async () => {
      await expect(roleAdminService.deleteRoles(codes, { data: ['ROLE_DECOY'] }))
        .rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
      expect(client.delete).not.toHaveBeenCalled();
    });
  });

  describe('경로 격리', () => {
    it('조회 2종의 경로는 서로 겹치지 않는다 — 목록과 상세는 별개 엔드포인트다', async () => {
      await roleAdminService.getRoleList();
      await roleAdminService.getRole('ROLE_ADMIN');

      expect(client.get.mock.calls.map((call) => String(call[0]))).toEqual([
        'admin/system/roles',
        'admin/system/roles/ROLE_ADMIN',
      ]);
    });

    it('삭제 2종은 경로와 본문의 조합으로 구분된다 — 둘이 섞이면 삭제 범위가 달라진다', async () => {
      await roleAdminService.deleteRole('ROLE_A');
      await roleAdminService.deleteRoles(['ROLE_A', 'ROLE_B']);

      expect(client.delete.mock.calls).toEqual([
        ['admin/system/roles/ROLE_A', undefined],
        ['admin/system/roles', { data: ['ROLE_A', 'ROLE_B'] }],
      ]);
    });

    it('모든 요청 경로는 admin/system/roles 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await roleAdminService.getRoleList({ page: 0 });
      await roleAdminService.getRole('ROLE_ADMIN');
      await roleAdminService.createRole({ roleNm: '신규 롤' });
      await roleAdminService.updateRole('ROLE_ADMIN', { roleNm: '수정' });
      await roleAdminService.deleteRole('ROLE_A');
      await roleAdminService.deleteRoles(['ROLE_A', 'ROLE_B']);

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
