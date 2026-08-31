/**
 * UserAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/UserAdminService.ts` 는 관리자 사용자 관리 화면
 * (`/admin/user/manage`)의 **유일한 API 진입점**인데도 전용 테스트가 없었다.
 * 이 파일은 위임(delegation)만 하는 얇은 래퍼라 "테스트할 게 없다"고 보이지만,
 * 실제로는 아래 항목들이 **틀어져도 tsc·컴파일을 모두 통과한 채 런타임에서만 조용히 깨진다.**
 *
 * 1) URL 조합 — `AdminService('/users')` 는 category 기본값 'system' 과 합성되어
 *    ApiService 에서 `admin/system/users` 가 된다(선행 슬래시 제거 + `admin/{category}/` 접두).
 *    접두 한 글자, 슬래시 한 개만 어긋나도 결과는 404 이고 화면에는 "조회 실패"만 뜬다.
 *
 * 2) 페이징 파라미터 변환 — ApiService.get 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size`/`pageSize` → `recordCountPerPage` 로 변환해 백엔드 BaseSearchDto 에 맞춘다.
 *    이 +1 이 사라지거나 두 번 적용되면 목록이 **한 페이지씩 밀리거나 첫 페이지가 빈다**.
 *    타입은 변하지 않으므로 정적 검사로는 절대 잡히지 않는다.
 *
 * 3) 경로 변수 치환 — `updateUser`/`deleteUser`/`updatePassword` 는 userId 를 URL 에 박는다.
 *    여기서 다른 값이 들어가면 **엉뚱한 계정을 수정하거나 삭제한다** — 되돌릴 수 없는 사고다.
 *    특히 `deleteUsers`(다중 삭제)는 경로가 아니라 **컬렉션 경로 + 본문(data)** 이라,
 *    단건 삭제와 경로가 뒤바뀌면 의도와 정반대의 대상이 지워진다.
 *
 * 4) HTTP 메서드 — 일괄 변경 3종과 비밀번호 변경은 PATCH 다. PUT 으로 바뀌면 부분 수정이
 *    전체 치환이 되어 서버 측에서 누락 필드가 초기화될 수 있다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal 등)가 유실되면
 *    화면 이탈 시 요청 취소가 동작하지 않고 타임아웃도 기본값으로 되돌아간다.
 *    유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를
 * 고정한다. 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse, SearchParams } from '@/types/foundation/system';
import type { UserManage } from '@/types/foundation/user';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { userAdminService } from '../UserAdminService';

/** 이 서비스가 조합해야 하는 실제 최종 경로 — AdminService('/users') + category 기본값 'system' */
const BASE = 'admin/system/users';
const success = <T,>(data: T) => ({ success: true as const, code: 'S000', message: 'success', data });
const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };
const safeUser = {
  userId: 'USR001',
  userNm: '홍길동',
  emlAddr: 'hong@example.com',
  userSttsCd: 'A',
};

describe('UserAdminService — 관리자 사용자 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation(async (url: string, config?: unknown) => {
      const data = await client.get(url, config);
      return success(data ?? (url === BASE ? emptyPage : safeUser));
    });
    client.requestRaw.mockImplementation(async ({ url, method, data, ...config }) => {
      if (method === 'delete') {
        const deleteConfig = { ...config, ...(data === undefined ? {} : { data }) };
        await client.delete(url, Object.keys(deleteConfig).length > 0 ? deleteConfig : undefined);
        return success(null);
      }
      const requestConfig = Object.keys(config).length > 0 ? config : undefined;
      let response;
      if (method === 'post') response = await client.post(url, data, requestConfig);
      else if (method === 'put') response = await client.put(url, data, requestConfig);
      else if (method === 'patch') response = await client.patch(url, data, requestConfig);
      return success(method === 'post' ? (response ?? 'USR_NEW') : null);
    });
  });

  describe('목록 조회 (getUserList)', () => {
    it('목록은 admin/system/users 로 나가며 컬렉션 경로에 군더더기 슬래시가 붙지 않는다', async () => {
      await userAdminService.getUserList({});

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
    });

    it('OpenAPI Pageable의 page·size 이름과 0-based 의미를 그대로 보존한다', async () => {
      await userAdminService.getUserList({ page: 1, size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 1, size: 20 },
      });
    });

    it('첫 페이지(page 0)는 0-based 값을 그대로 보낸다', async () => {
      await userAdminService.getUserList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 0 } });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      await userAdminService.getUserList({ page: 5, pageIndex: 3 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 5 } });
    });

    it('size 만 준 경우 OpenAPI size로만 전달한다', async () => {
      await userAdminService.getUserList({ size: 10 });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { size: 10 } });
    });

    it('기존 pageSize alias는 OpenAPI size로 변환한다', async () => {
      const params: SearchParams = { pageSize: 50 };

      await userAdminService.getUserList(params);

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { size: 50 },
      });
    });

    it('OpenAPI에 정확히 존재하는 searchKeyword만 전달한다', async () => {
      await userAdminService.getUserList({ searchKeyword: '홍길동' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '홍길동' },
      });
    });

    it('OpenAPI에 없는 searchCondition·sbscrbSttus는 묵시하지 않고 fail-closed 된다', async () => {
      await expect(userAdminService.getUserList({
        searchCondition: 'userNm',
        searchKeyword: '홍길동',
        sbscrbSttus: 'A',
      })).rejects.toThrow('생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await userAdminService.getUserList({ page: 1 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 1 },
      });
    });

    it('params 를 생략해도 config 는 유실되지 않는다 — 취소 신호가 사라지면 이탈 후에도 요청이 산다', async () => {
      const { signal } = new AbortController();

      await userAdminService.getUserList(undefined, { signal });

      expect(client.get).toHaveBeenCalledWith(BASE, { signal, params: {} });
    });

    it('목록 조회는 클라이언트 응답을 가공 없이 그대로 반환한다', async () => {
      const page: PageResponse<UserManage> = {
        list: [{ userId: 'USR001', userNm: '홍길동', emlAddr: 'hong@example.com', userSttsCd: 'A' }],
        total: 1,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(userAdminService.getUserList({})).resolves.toStrictEqual(page);
    });
  });

  describe('단건 조회 (getUser)', () => {
    it('사용자 ID 를 경로 변수로 붙이고 config 를 그대로 넘긴다', async () => {
      await userAdminService.getUser('USR001', { timeout: 1000 });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/USR001`, { timeout: 1000 });
    });

    it('config 를 주지 않으면 undefined 가 그대로 전달된다(임의의 기본값을 만들지 않는다)', async () => {
      await userAdminService.getUser('USR002');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/USR002`, undefined);
    });
  });

  describe('등록 (createUser)', () => {
    it('컬렉션 경로에 payload 를 그대로 실어 POST 한다', async () => {
      const payload: Partial<UserManage> = {
        userId: 'newbie',
        userNm: '신규사용자',
        pswd: 'Password1!',
        emlAddr: 'newbie@example.com',
        userSttsCd: 'A',
        ognzId: 'ORG_0001',
      };

      await userAdminService.createUser(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
    });

    it('등록 시에도 호출부 config 가 보존된다', async () => {
      const { signal } = new AbortController();

      const payload = { userId: 'newbie', userNm: '신규사용자', pswd: 'Password1!' };
      await userAdminService.createUser(payload, { signal });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { signal });
    });
  });

  describe('수정 (updateUser)', () => {
    it('전달받은 userId 로만 PUT 하고 다른 계정 경로로는 나가지 않는다', async () => {
      const payload = { userNm: '변경된이름' };

      await userAdminService.updateUser('USR010', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/USR010`, payload, { timeout: 2000 });
      // 경로 변수 치환이 어긋나면 엉뚱한 계정을 고친다 — 인접 ID 와 컬렉션 경로 모두 금지다.
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/USR011`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(BASE, payload, { timeout: 2000 });
    });

    it('수정 본문은 가공·필드 누락 없이 그대로 전달된다', async () => {
      const payload = {
        userNm: '홍길동',
        emlAddr: 'hong@example.com',
        mblTelno: '01000000000',
        ognzId: 'ORG_0002',
      };

      await userAdminService.updateUser('USR010', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/USR010`, payload, undefined);
      expect(client.put.mock.calls[0]?.[1]).not.toHaveProperty('userId');
      expect(client.put.mock.calls[0]?.[1]).not.toHaveProperty('pswd');
    });
  });

  describe('삭제 (deleteUser / deleteUsers)', () => {
    it('단건 삭제는 지정한 ID 경로로만 나가고 컬렉션 전체를 대상으로 하지 않는다', async () => {
      await userAdminService.deleteUser('USR020');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/USR020`, undefined);
      // 경로가 컬렉션으로 퇴화하면 전체 삭제 API 를 때리게 된다.
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('단건 삭제도 config(취소 신호·타임아웃)를 그대로 전달한다', async () => {
      await userAdminService.deleteUser('USR021', { timeout: 5000 });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/USR021`, { timeout: 5000 });
    });

    it('다중 삭제는 컬렉션 경로로 나가고 ID 배열을 본문(data)에 싣는다', async () => {
      const userIds = ['USR001', 'USR002', 'USR003'];

      await userAdminService.deleteUsers(userIds);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: userIds });
      // 배열이 경로로 흘러들어가면 "USR001,USR002,USR003" 같은 존재하지 않는 ID 를 지우려 한다.
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/USR001`, { data: userIds });
    });

    it('다중 삭제 시 config 와 본문이 함께 전달된다 — 본문이 config 를 덮어쓰지 않는다', async () => {
      const userIds = ['USR001'];

      await userAdminService.deleteUsers(userIds, { timeout: 7000 });

      expect(client.delete).toHaveBeenCalledWith(BASE, { timeout: 7000, data: userIds });
    });
  });

  describe('비밀번호 변경 (updatePassword)', () => {
    it('/{userId}/password 하위 경로로 PATCH 하며 본문과 config 를 그대로 전달한다', async () => {
      const body = { newPassword: 'N3w!Passw0rd' };

      await userAdminService.updatePassword('USR001', body, { timeout: 4000 });

      expect(client.patch).toHaveBeenCalledWith(`${BASE}/USR001/password`, body, { timeout: 4000 });
    });

    it('PUT 이 아니라 PATCH 로 나간다 — 메서드가 바뀌면 부분 수정이 전체 치환이 된다', async () => {
      await userAdminService.updatePassword('USR001', { newPassword: 'N3w!Passw0rd' });

      expect(client.patch).toHaveBeenCalledTimes(1);
      expect(client.put).not.toHaveBeenCalled();
    });
  });

  describe('일괄 변경 (updateUsersStatus / moveUsersToDept / updateUsersRole)', () => {
    it('상태 일괄 변경은 /status 로 PATCH 하며 본문 키는 userIds·status 다', async () => {
      const userIds = ['USR001', 'USR002'];

      await userAdminService.updateUsersStatus(userIds, 'P');

      expect(client.patch).toHaveBeenCalledWith(`${BASE}/status`, { userIds, status: 'P' }, undefined);
    });

    it('부서 일괄 이동은 /dept 로 PATCH 하며 본문 키는 userIds·ognzId 다', async () => {
      const userIds = ['USR001'];

      await userAdminService.moveUsersToDept(userIds, 'ORG_0007');

      expect(client.patch).toHaveBeenCalledWith(`${BASE}/dept`, { userIds, ognzId: 'ORG_0007' }, undefined);
    });

    it('권한 일괄 변경은 /role 로 PATCH 하며 본문 키는 userIds·role 다', async () => {
      const userIds = ['USR001', 'USR002', 'USR003'];

      await userAdminService.updateUsersRole(userIds, 'ROLE_ADMIN', { timeout: 9000 });

      expect(client.patch).toHaveBeenCalledWith(
        `${BASE}/role`,
        { userIds, role: 'ADMIN' },
        { timeout: 9000 },
      );
    });

    it('일괄 변경 3종은 서로 다른 하위 경로를 쓴다 — 하나라도 겹치면 다른 속성이 덮어써진다', async () => {
      await userAdminService.updateUsersStatus(['USR001'], 'P');
      await userAdminService.moveUsersToDept(['USR001'], 'ORG_0007');
      await userAdminService.updateUsersRole(['USR001'], 'ROLE_ADMIN');

      const calledPaths = client.patch.mock.calls.map((call) => String(call[0]));
      expect(calledPaths).toEqual([`${BASE}/status`, `${BASE}/dept`, `${BASE}/role`]);
    });
  });

  describe('경로 접두 격리', () => {
    it('모든 메서드가 admin/system/users 접두를 벗어나지 않는다 — 접두가 어긋나면 전 화면이 404 다', async () => {
      await userAdminService.getUserList({});
      await userAdminService.getUser('USR001');
      await userAdminService.createUser({ userId: 'USR001', userNm: '사용자', pswd: 'Password1!' });
      await userAdminService.updateUser('USR001', { userNm: '사용자' });
      await userAdminService.deleteUser('USR001');
      await userAdminService.deleteUsers(['USR001']);
      await userAdminService.updatePassword('USR001', { newPassword: 'Password2!' });
      await userAdminService.updateUsersStatus(['USR001'], 'P');
      await userAdminService.moveUsersToDept(['USR001'], 'ORG_0001');
      await userAdminService.updateUsersRole(['USR001'], 'ROLE_ADMIN');

      const calledPaths = [
        ...client.get.mock.calls,
        ...client.post.mock.calls,
        ...client.put.mock.calls,
        ...client.patch.mock.calls,
        ...client.delete.mock.calls,
      ].map((call) => String(call[0]));

      // 위에서 호출한 메서드 수(10)와 실제 HTTP 호출 수가 같아야 한다(중복 발사·누락 방지).
      expect(calledPaths).toHaveLength(10);
      expect(calledPaths.every((path) => path === BASE || path.startsWith(`${BASE}/`))).toBe(true);
      // 선행 슬래시가 붙으면 axios baseURL 이 무시되어 도메인 루트로 나간다.
      expect(calledPaths.some((path) => path.startsWith('/'))).toBe(false);
    });
  });
});
