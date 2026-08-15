/**
 * GroupAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/GroupAdminService.ts` 는 보안 그룹 관리 화면
 * (`app/admin/security/group/SecurityGroupClient.tsx`)의 유일한 API 진입점이다. 화면은 목록·등록·
 * 수정·삭제 4종을 이 클래스로만 호출한다. 그런데 이 서비스를 직접 겨눈 테스트는 없었다 —
 * 존재하는 것은 `SecurityGroupClient.test.tsx` 가 이 모듈을 **통째로 vi.mock 으로 대체**한
 * 화면 테스트뿐이라, 실제로 어떤 URL·본문·config 가 나가는지는 아무도 관측하지 않았다.
 *
 * 메서드 본문이 한 줄씩이라 "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도 컴파일·타입
 * 검사를 모두 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 조합 — `AdminService('/groups')` 는 category 기본값 'system' 과 합성되어
 *    `admin/system/groups` 가 되고, 그 과정에서 선행 슬래시가 제거된다(`ApiService` 생성자).
 *    백엔드 `GroupApiController` 의 `@RequestMapping("/api/v1/admin/system/groups")` 와 맞물리는
 *    지점이며, 접두가 한 글자만 어긋나도 전 메서드가 동시에 404 가 된다. 선행 슬래시가 되살아나면
 *    axios `baseURL`('/api/v1') 의 경로 세그먼트가 통째로 날아가 절대 경로로 해석된다.
 *
 * 2) **단건 삭제가 경로 변수를 잃으면 "전체 목록 삭제 요청"이 된다** — 이 서비스 고유의 최대 위험.
 *    백엔드는 컬렉션 경로에 `@DeleteMapping`(다중 삭제)을 **실제로 열어 두었다**. 형제 서비스들은
 *    컬렉션 DELETE 가 없어 실수해도 404 로 끝나지만, 여기서는 `deleteGroup` 의 `/${groupId}` 가
 *    사라지는 순간 다중 삭제 엔드포인트로 요청이 착지한다. 되돌릴 수 없는 사고다.
 *
 * 3) 다중 삭제의 본문 전달 경로 — axios 의 `delete(url, config)` 는 본문 인자를 받지 않으므로
 *    id 배열은 `config.data` 로만 실린다(`{ ...config, data: groupIds }`). spread 순서가 뒤집혀
 *    호출부 config 의 `data` 가 이기면 **인자로 준 것과 다른 그룹들이 지워진다**. 배열을
 *    `{ groupIds }` 로 감싸도 백엔드 `@RequestBody List<String>` 바인딩이 400 으로 깨진다.
 *
 * 4) 경로 변수 치환 — `updateGroup`/`deleteGroup` 은 **인자** `groupId` 가 경로를 결정한다.
 *    주의할 것은 `src/services/foundation/security/SecurityAdminService.ts` 에 **같은 이름의
 *    GroupAdminService 가 하나 더 있고**, 그쪽 `updateGroup` 은 인자 없이 **본문의 group.groupId**
 *    로 경로를 만든다는 점이다. 두 구현이 같은 엔드포인트를 두고 공존하므로 "형제 코드에 맞춘다"는
 *    이유로 본문 기반 치환이 이식되면 화면에서 고른 그룹이 아닌 엉뚱한 그룹이 수정된다.
 *
 * 5) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 규약에 맞춘다. 백엔드
 *    `getGroups` 가 읽는 페이지 축은 `pageIndex` 하나뿐이므로, 이 +1 이 사라지거나 두 번 적용되면
 *    목록이 한 페이지씩 밀린다. 타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·Authorization 헤더)가
 *    유실되면 화면 이탈 시 요청 취소가 안 되고, SSR 경로의 Bearer 토큰이 빠져 401 이 된다.
 *    유실돼도 브라우저 경로에서는 요청이 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';
import type { GroupManage } from '@/types/foundation/security';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { groupAdminService } from '../GroupAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두.
 * `AdminService('/groups')` + category 기본값 'system' → `admin/system/groups`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/groups';

describe('GroupAdminService — 보안 그룹 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('그룹 목록 조회 (getGroupList)', () => {
    it('목록은 admin/system/groups 로 나가며 컬렉션 경로에 후행 슬래시가 붙지 않는다', async () => {
      await groupAdminService.getGroupList();

      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로다.
      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: undefined });
    });

    it('params 를 생략하면 params: undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      // 빈 객체({})로 바꾸면 axios 가 `?` 만 붙은 URL 을 만들 수 있고, 무엇보다
      // 아래 페이징 정규화 분기(config?.params 가 truthy 일 때만 동작)의 전제가 달라진다.
      await groupAdminService.getGroupList(undefined);

      expect(client.get).toHaveBeenCalledWith(BASE, { params: undefined });
    });

    it('첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      await groupAdminService.getGroupList({ page: 0 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 2·size 20 은 pageIndex 3·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await groupAdminService.getGroupList({ page: 2, size: 20 });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      // (백엔드 getGroups 는 pageUnit 을 10 으로 고정하므로 recordCountPerPage 를 현재는 읽지
      //  않지만, 정규화 축 자체가 살아 있는지는 여기서 고정한다.)
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 20, pageIndex: 3, recordCountPerPage: 20 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await groupAdminService.getGroupList({ page: 9, pageIndex: 1 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('pageSize 만 오면 recordCountPerPage 와 size 를 함께 채운다 (Common DTO 호환 축)', async () => {
      await groupAdminService.getGroupList({ pageSize: 25 });

      // page 축은 건드리지 않으므로 pageIndex 는 생기지 않는다 — 객체 전체 비교로 그것까지 고정한다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pageSize: 25, recordCountPerPage: 25, size: 25 },
      });
    });

    it('searchKeyword 는 가공 없이 그대로 실린다 — 백엔드 @RequestParam("searchKeyword") 와 1:1 이다', async () => {
      await groupAdminService.getGroupList({ searchKeyword: '보안' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '보안' } });
    });

    it('searchKeyword 를 keyword 로 승격하지 않는다 — 그룹 목록은 searchKeyword 단일 축이다', async () => {
      // 형제 서비스(SurveyAdminService)는 승격하지만 이 서비스는 하지 않는다.
      // 승격 로직이 잘못 이식되면 두 키가 동시에 나가 서버 바인딩이 흔들린다.
      await groupAdminService.getGroupList({ searchKeyword: '보안' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '보안' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchKeyword: '보안', keyword: '보안' },
      });
    });

    it('빈 검색어도 지우지 않고 그대로 보낸다 — 화면이 검색어를 비웠다는 사실이 서버에 전달된다', async () => {
      // SecurityGroupClient 는 디바운스된 searchKeyword 를 항상 실어 보낸다(비었으면 빈 문자열).
      await groupAdminService.getGroupList({ searchKeyword: '' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '' } });
    });

    it('명시적으로 넘긴 params 인자가 config.params 를 이긴다', async () => {
      // `{ ...config, params }` 라 spread 뒤에 오는 params 인자가 항상 최종값이다.
      // 순서가 뒤집히면 호출부가 의도한 검색 조건 대신 config 에 남아 있던 값으로 조회된다.
      await groupAdminService.getGroupList({ searchKeyword: '보안' }, { params: { searchKeyword: '낡은값' } });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchKeyword: '보안' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { searchKeyword: '낡은값' } });
    });

    it('목록 조회 시 호출부의 timeout·signal 이 params 와 함께 보존된다', async () => {
      const { signal } = new AbortController();

      await groupAdminService.getGroupList({ page: 0 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('SSR 호출부가 넘기는 Authorization 헤더가 유실되지 않는다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await groupAdminService.getGroupList({ searchKeyword: '' }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, { headers, params: { searchKeyword: '' } });
    });

    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      // 화면이 data.list / data.page / data.total 을 직접 읽으므로 중간 변형이 끼면 표가 빈다.
      const page: PageResponse<GroupManage> = {
        list: [
          { groupId: 'GRP_0001', groupNm: '시스템관리자', groupDc: '전체 권한' },
          { groupId: 'GRP_0002', groupNm: '일반사용자', groupDc: '읽기 전용' },
        ],
        total: 2,
        page: 1,
        size: 10,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(groupAdminService.getGroupList()).resolves.toBe(page);
    });
  });

  describe('그룹 상세 조회 (getGroup)', () => {
    it('groupId 가 경로 변수로 붙고 config 는 그대로 전달된다', async () => {
      await groupAdminService.getGroup('GRP_0001', { timeout: 1000 });

      // 단건 조회는 params 가 없으므로 페이징 정규화가 개입하지 않는다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/GRP_0001`, { timeout: 1000 });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/GRP_0002`, { timeout: 1000 });
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 목록과 달리 { params } 로 감싸지 않는다', async () => {
      await groupAdminService.getGroup('GRP_0001');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/GRP_0001`, undefined);
    });

    it('상세 응답은 무가공으로 반환된다', async () => {
      const group: GroupManage = {
        groupId: 'GRP_0002',
        groupNm: '일반사용자',
        groupDc: '읽기 전용',
        groupCrtDt: '2026-08-15',
      };
      client.get.mockResolvedValueOnce(group);

      await expect(groupAdminService.getGroup('GRP_0002')).resolves.toBe(group);
    });
  });

  describe('그룹 등록 (createGroup)', () => {
    it('컬렉션 경로에 요청 본문을 무가공으로 POST 한다', async () => {
      const payload: Partial<GroupManage> = { groupNm: '신규그룹', groupDc: '신설 조직용' };

      await groupAdminService.createGroup(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/`, payload, undefined);
    });

    it('본문에 groupId 가 실려 있어도 경로에는 붙지 않는다 — 등록은 항상 컬렉션 경로다', async () => {
      // 화면 폼은 groupId 입력칸을 포함하므로 본문에 groupId 가 항상 존재한다.
      // 이것을 경로 변수로 오인하면 등록 요청이 "단건 수정/조회" 경로로 나간다.
      const payload: Partial<GroupManage> = { groupId: 'GRP_NEW', groupNm: '신규그룹', groupDc: '설명' };

      await groupAdminService.createGroup(payload);

      expect(client.post).toHaveBeenCalledWith(BASE, payload, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/GRP_NEW`, payload, undefined);
    });

    it('등록 시 config(timeout)가 유실되지 않는다', async () => {
      const payload: Partial<GroupManage> = { groupNm: '신규그룹' };

      await groupAdminService.createGroup(payload, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(BASE, payload, { timeout: 5000 });
    });
  });

  describe('그룹 수정 (updateGroup)', () => {
    it('인자로 받은 groupId 가 경로를 결정한다 — 본문의 groupId 가 아니다', async () => {
      // 본문에 다른 groupId(GRP_0009)를 심어 두고, 경로는 인자(GRP_0001)만 따르는지 확인한다.
      // 형제 구현(security/SecurityAdminService.ts)의 본문 기반 치환이 이식되면 이 단언이 깨진다.
      const payload: Partial<GroupManage> = { groupId: 'GRP_0009', groupNm: '이름만 수정' };

      await groupAdminService.updateGroup('GRP_0001', payload, { timeout: 2000 });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/GRP_0001`, payload, { timeout: 2000 });
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/GRP_0009`, payload, { timeout: 2000 });
    });

    it('수정 본문은 가공·재포장 없이 그대로 실린다', async () => {
      // 백엔드가 @Valid @RequestBody GroupManageDto 로 받는다 — 래핑하면 바인딩이 깨진다.
      const payload: Partial<GroupManage> = { groupNm: '변경된그룹명', groupDc: '변경된 설명' };

      await groupAdminService.updateGroup('GRP_0001', payload);

      expect(client.put).toHaveBeenCalledWith(`${BASE}/GRP_0001`, payload, undefined);
      expect(client.put).not.toHaveBeenCalledWith(`${BASE}/GRP_0001`, { data: payload }, undefined);
    });

    it('수정 시 AbortSignal 이 보존된다', async () => {
      const { signal } = new AbortController();

      await groupAdminService.updateGroup('GRP_0001', { groupNm: '변경' }, { signal });

      expect(client.put).toHaveBeenCalledWith(`${BASE}/GRP_0001`, { groupNm: '변경' }, { signal });
    });
  });

  describe('그룹 단건 삭제 (deleteGroup)', () => {
    it('지정한 groupId 경로로만 DELETE 한다 — 컬렉션 경로로 떨어지면 다중 삭제가 실행된다', async () => {
      // 백엔드는 컬렉션 DELETE 를 다중 삭제 엔드포인트로 열어 두었다. 경로 변수가 사라지면
      // 404 로 끝나는 것이 아니라 **실제로 실행되는 요청**이 되어 되돌릴 수 없다.
      await groupAdminService.deleteGroup('GRP_0009');

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/GRP_0009`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('삭제 시 config(signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await groupAdminService.deleteGroup('GRP_0009', { signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/GRP_0009`, { signal });
    });

    it('클라이언트는 삭제 가능 여부를 자체 판단하지 않는다 — 서버 오류를 그대로 전파한다', async () => {
      // 소속 사용자가 남아 있으면 서버가 거부한다. 이를 삼키면 화면이 성공 토스트를 띄운다.
      const conflict = new Error('그룹에 소속된 사용자가 존재합니다');
      client.delete.mockRejectedValueOnce(conflict);

      await expect(groupAdminService.deleteGroup('GRP_0001')).rejects.toBe(conflict);
    });
  });

  describe('그룹 다중 삭제 (deleteGroups)', () => {
    it('컬렉션 경로로 DELETE 하고 id 배열은 config.data 에 싣는다', async () => {
      // axios 의 delete(url, config) 는 본문 인자를 받지 않는다 — config.data 가 유일한 통로다.
      // 이것이 두 번째 위치 인자로 옮겨지면 본문이 통째로 사라져 백엔드가 400 을 낸다.
      await groupAdminService.deleteGroups(['GRP_0001', 'GRP_0002']);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: ['GRP_0001', 'GRP_0002'] });
      expect(client.delete).not.toHaveBeenCalledWith(BASE, ['GRP_0001', 'GRP_0002']);
    });

    it('첫 번째 id 를 경로 변수로 오인하지 않는다 — 다중 삭제가 단건 삭제로 축소된다', async () => {
      await groupAdminService.deleteGroups(['GRP_0001', 'GRP_0002']);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: ['GRP_0001', 'GRP_0002'] });
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/GRP_0001`, {
        data: ['GRP_0001', 'GRP_0002'],
      });
    });

    it('배열을 객체로 감싸지 않는다 — 백엔드가 @RequestBody List<String> 으로 받는다', async () => {
      await groupAdminService.deleteGroups(['GRP_0001']);

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: ['GRP_0001'] });
      expect(client.delete).not.toHaveBeenCalledWith(BASE, { data: { groupIds: ['GRP_0001'] } });
    });

    it('인자로 받은 id 배열이 config.data 를 이긴다 — 순서가 뒤집히면 다른 그룹들이 지워진다', async () => {
      // `{ ...config, data: groupIds }` 라 spread 뒤에 오는 groupIds 가 항상 최종 본문이다.
      await groupAdminService.deleteGroups(['GRP_0001'], { data: ['GRP_9999'] });

      expect(client.delete).toHaveBeenCalledWith(BASE, { data: ['GRP_0001'] });
      expect(client.delete).not.toHaveBeenCalledWith(BASE, { data: ['GRP_9999'] });
    });

    it('다중 삭제에서도 timeout·헤더가 본문과 함께 보존된다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await groupAdminService.deleteGroups(['GRP_0001'], { timeout: 30000, headers });

      expect(client.delete).toHaveBeenCalledWith(BASE, {
        timeout: 30000,
        headers,
        data: ['GRP_0001'],
      });
    });
  });

  describe('경로 격리', () => {
    it('단건 삭제와 다중 삭제는 서로 다른 경로를 쓴다 — 하나로 합쳐지면 삭제 범위가 뒤바뀐다', async () => {
      await groupAdminService.deleteGroup('GRP_0001');
      await groupAdminService.deleteGroups(['GRP_0002', 'GRP_0003']);

      expect(client.delete.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/groups/GRP_0001',
        'admin/system/groups',
      ]);
    });

    it('조회 2종의 경로는 서로 겹치지 않는다', async () => {
      await groupAdminService.getGroupList({ searchKeyword: '보안' });
      await groupAdminService.getGroup('GRP_0001');

      expect(client.get.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/groups',
        'admin/system/groups/GRP_0001',
      ]);
    });

    it('모든 요청 경로는 admin/system/groups 접두를 벗어나지 않고 선행 슬래시도 갖지 않는다', async () => {
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      await groupAdminService.getGroupList({ page: 0 });
      await groupAdminService.getGroup('GRP_0001');
      await groupAdminService.createGroup({ groupNm: '신규그룹' });
      await groupAdminService.updateGroup('GRP_0001', { groupNm: '수정' });
      await groupAdminService.deleteGroup('GRP_0002');
      await groupAdminService.deleteGroups(['GRP_0003']);

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
