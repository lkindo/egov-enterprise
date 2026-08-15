/**
 * SecurityAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/security/SecurityAdminService.ts` 는 권한(authorities)·
 * 롤(roles)·그룹(groups) 3종 관리자 API 의 유일한 진입점인데도 **커버리지 0%** 였다.
 * 이 파일은 로직이 거의 없어 "테스트할 게 없다"고 보이지만, 실제로는 아래 항목들이
 * **틀어져도 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히 깨진다.**
 *
 * 1) URL 조합 — `AdminService('/authorities', 'system')` 는 ApiService 에서
 *    `admin/system/authorities` 로 합성된다(선행 슬래시 제거 + `admin/{category}/` 접두).
 *    생성자 인자나 접두 규칙이 한 글자만 어긋나도 결과는 404 이고, 화면에는
 *    "조회 실패" 토스트만 뜬다 — 어느 경로가 틀렸는지 아무도 모른다.
 *
 * 2) 페이징 파라미터 변환 — ApiService.get 이 `page`(0-based) → `pageIndex`(1-based),
 *    `size`/`pageSize` → `recordCountPerPage` 로 변환해 백엔드 BaseSearchDto 에 맞춘다.
 *    이 +1 이 사라지거나 두 번 적용되면 목록이 **한 페이지씩 밀리거나 첫 페이지가 빈다**.
 *    타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 경로 변수 치환 — update/delete 는 payload 에서 식별자를 뽑아 URL 에 박는다.
 *    특히 `updateRole` 은 파라미터가 `roleCode` 인 delete 와 달리 **`role.roleId`** 를,
 *    `updateAuthor` 는 **`author.authrtCd`** 를 쓴다. 여기서 다른 필드(예: authrtNm,
 *    roleNm)를 집으면 **엉뚱한 자원을 수정하거나 삭제한다** — 되돌릴 수 없는 사고다.
 *
 * 4) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·signal 등)가 유실되면
 *    화면 이탈 시 요청 취소(AbortSignal)가 동작하지 않고 타임아웃도 기본값으로 되돌아간다.
 *    유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 5) 바인딩된 export — 파일 하단의 `getAuthorList` 는 `bind(instance)` 로 내보낸다.
 *    누군가 이를 단순 참조(`= service.getAuthorList`)로 바꾸면 `this` 가 undefined 가 되어
 *    호출 즉시 TypeError 다. import 형태는 동일해 리뷰에서 놓치기 쉽다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorManage, GroupManage, RoleManage } from '@/types/foundation/security';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  AuthorityAdminService,
  GroupAdminService,
  RoleAdminService,
  getAuthorList,
} from '../SecurityAdminService';

describe('SecurityAdminService — 관리자 보안 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('AuthorityAdminService (권한)', () => {
    const service = new AuthorityAdminService();

    it('권한 목록은 admin/system/authorities 로 나가며 컬렉션 경로에 군더더기 슬래시가 붙지 않는다', async () => {
      await service.getAuthorList({});

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', { params: {} });
    });

    it('page 1 은 pageIndex 2 로, size 는 recordCountPerPage 로 변환되고 원본 키도 함께 남는다', async () => {
      await service.getAuthorList({ page: 1, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { page: 1, size: 20, pageIndex: 2, recordCountPerPage: 20 },
      });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await service.getAuthorList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      await service.getAuthorList({ page: 5, pageIndex: 3 });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { page: 5, pageIndex: 3 },
      });
    });

    it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장되지만 pageIndex 는 만들지 않는다', async () => {
      await service.getAuthorList({ pageSize: 50 });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { pageSize: 50, recordCountPerPage: 50, size: 50 },
      });
    });

    it('검색 조건(searchCondition/searchKeyword)은 변형 없이 그대로 전달된다', async () => {
      await service.getAuthorList({ searchCondition: 'authrtNm', searchKeyword: '관리자' });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { searchCondition: 'authrtNm', searchKeyword: '관리자' },
      });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await service.getAuthorList({ page: 1 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        timeout: 3000,
        signal,
        params: { page: 1, pageIndex: 2 },
      });
    });

    it('목록 조회는 클라이언트 응답을 가공 없이 그대로 반환한다', async () => {
      const page = { list: [{ authrtCd: 'ROLE_ADMIN' }], total: 1, page: 1, size: 10, totalPage: 1 };
      client.get.mockResolvedValueOnce(page);

      await expect(service.getAuthorList({})).resolves.toBe(page);
    });

    it('단건 조회는 권한 코드를 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await service.getAuthor('ROLE_ADMIN', { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities/ROLE_ADMIN', { timeout: 1000 });
    });

    it('권한 생성은 컬렉션 경로에 payload 를 그대로 실어 POST 한다', async () => {
      const payload: Partial<AuthorManage> = { authrtCd: 'ROLE_NEW', authrtNm: '신규권한', authrtExpln: '설명' };

      await service.createAuthor(payload);

      expect(client.post).toHaveBeenCalledWith('admin/system/authorities', payload, undefined);
    });

    it('권한 수정은 이름이 아니라 authrtCd 를 경로 변수로 사용한다 — 다른 필드를 집으면 엉뚱한 자원을 고친다', async () => {
      const payload: Partial<AuthorManage> = { authrtCd: 'ROLE_ADMIN', authrtNm: '변경된이름' };

      await service.updateAuthor(payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith('admin/system/authorities/ROLE_ADMIN', payload, { timeout: 2000 });
    });

    it('권한 삭제는 지정한 코드 경로로만 나가고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await service.deleteAuthor('ROLE_TEMP');

      expect(client.delete).toHaveBeenCalledWith('admin/system/authorities/ROLE_TEMP', undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/authorities', undefined);
    });

    it('권한별 메뉴 조회는 /{권한코드}/menus 하위 경로로 나간다', async () => {
      await service.getMenuByAuthority('ROLE_USER');

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities/ROLE_USER/menus', undefined);
    });
  });

  describe('RoleAdminService (롤)', () => {
    const service = new RoleAdminService();

    it('롤 목록은 admin/system/roles 로 나가며 페이징 변환 규칙을 동일하게 적용받는다', async () => {
      await service.getRoleList({ page: 2, size: 15 });

      expect(client.get).toHaveBeenCalledWith('admin/system/roles', {
        params: { page: 2, size: 15, pageIndex: 3, recordCountPerPage: 15 },
      });
    });

    it('롤 단건 조회는 롤 코드를 경로 변수로 붙인다', async () => {
      await service.getRole('ROLE_MANAGER');

      expect(client.get).toHaveBeenCalledWith('admin/system/roles/ROLE_MANAGER', undefined);
    });

    it('롤 생성은 컬렉션 경로에 payload 를 그대로 실어 POST 한다', async () => {
      const payload: Partial<RoleManage> = { roleId: 'ROLE_NEW', roleNm: '신규롤', rolePatrn: '/**' };

      await service.createRole(payload);

      expect(client.post).toHaveBeenCalledWith('admin/system/roles', payload, undefined);
    });

    it('롤 수정은 roleNm 이 아니라 roleId 를 경로 변수로 사용한다', async () => {
      const payload: Partial<RoleManage> = { roleId: 'ROLE_MANAGER', roleNm: '변경된롤명' };

      await service.updateRole(payload);

      expect(client.put).toHaveBeenCalledWith('admin/system/roles/ROLE_MANAGER', payload, undefined);
    });

    it('롤 삭제는 전달받은 코드 경로로만 DELETE 한다', async () => {
      await service.deleteRole('ROLE_OBSOLETE');

      expect(client.delete).toHaveBeenCalledWith('admin/system/roles/ROLE_OBSOLETE', undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/roles', undefined);
    });
  });

  describe('GroupAdminService (그룹)', () => {
    const service = new GroupAdminService();

    it('그룹 목록은 admin/system/groups 로 나가며 config 가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await service.getGroupList({ page: 0 }, { signal });

      expect(client.get).toHaveBeenCalledWith('admin/system/groups', {
        signal,
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('그룹 단건 조회는 그룹 ID 를 경로 변수로 붙인다', async () => {
      await service.getGroup('GRP_0001');

      expect(client.get).toHaveBeenCalledWith('admin/system/groups/GRP_0001', undefined);
    });

    it('그룹 생성은 컬렉션 경로에 payload 를 그대로 실어 POST 한다', async () => {
      const payload: Partial<GroupManage> = { groupId: 'GRP_0002', groupNm: '신규그룹', groupDc: '설명' };

      await service.createGroup(payload);

      expect(client.post).toHaveBeenCalledWith('admin/system/groups', payload, undefined);
    });

    it('그룹 수정은 groupNm 이 아니라 groupId 를 경로 변수로 사용한다', async () => {
      const payload: Partial<GroupManage> = { groupId: 'GRP_0001', groupNm: '변경된그룹명' };

      await service.updateGroup(payload);

      expect(client.put).toHaveBeenCalledWith('admin/system/groups/GRP_0001', payload, undefined);
    });

    it('그룹 삭제는 전달받은 ID 경로로만 DELETE 한다', async () => {
      await service.deleteGroup('GRP_0009');

      expect(client.delete).toHaveBeenCalledWith('admin/system/groups/GRP_0009', undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/groups', undefined);
    });
  });

  describe('서비스 간 경로 격리 및 bind 된 export', () => {
    it('세 서비스는 서로 다른 리소스 경로를 가진다 — 하나라도 겹치면 다른 도메인을 조작하게 된다', async () => {
      await new AuthorityAdminService().getAuthorList({});
      await new RoleAdminService().getRoleList({});
      await new GroupAdminService().getGroupList({});

      const calledPaths = client.get.mock.calls.map((call) => call[0]);
      expect(calledPaths).toEqual([
        'admin/system/authorities',
        'admin/system/roles',
        'admin/system/groups',
      ]);
    });

    it('모듈이 내보내는 getAuthorList 는 인스턴스에 bind 되어 있어 단독 호출로도 동작한다', async () => {
      // bind 가 단순 참조로 바뀌면 this 가 undefined 가 되어 호출 즉시 TypeError 다.
      await expect(getAuthorList({ page: 1 })).resolves.toBeUndefined();

      expect(client.get).toHaveBeenCalledWith('admin/system/authorities', {
        params: { page: 1, pageIndex: 2 },
      });
    });
  });
});
