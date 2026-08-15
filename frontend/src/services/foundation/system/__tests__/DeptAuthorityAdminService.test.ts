/**
 * DeptAuthorityAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/DeptAuthorityAdminService.ts` 는 **부서 단위로 권한을 일괄
 * 배포하는 유일한 진입점**인데도 커버리지 0% 였다. 메서드는 두 개뿐이고 본문은 한 줄씩이라
 * "테스트할 게 없다"고 보이지만, 이 서비스의 실제 호출부(`SecurityDeptAuthorityClient`)가 부르는
 * 것은 **되돌릴 수 없는 파괴적 액션**이다 — 화면 문구 그대로 "구성원이 보유한 기존 개별 권한은
 * 영구적으로 파기"된다. 대상 부서가 한 글자만 어긋나면 엉뚱한 조직의 권한 체계가 통째로
 * 덮어써진다. 그리고 아래 항목은 전부 타입 검사·컴파일을 통과한 채 런타임에서만 조용히 깨진다.
 *
 * 1) URL 조합 — `AdminService('/dept-authorities')` 는 `ApiService` 생성자에서 선행 슬래시가
 *    제거되고 `admin/{category}/` 접두가 붙어 최종 `admin/system/dept-authorities` 가 된다
 *    (category 기본값 'system'. 이 디렉터리에는 category 가 'system' 이 아닌 형제도 있으므로
 *    접두를 추정하지 않고 소스에서 확인한 값을 고정한다). 백엔드
 *    `DeptAuthorityApiController` 의 `@RequestMapping("/api/v1/admin/system/dept-authorities")`
 *    (api-server/src/main/java/nuri/api/controller/system/DeptAuthorityApiController.java:25) +
 *    axios baseURL `/api/v1` 와 이 문자열이 정확히 맞물려야만 성립한다. 선행 슬래시가 되살아나면
 *    baseURL 의 경로 세그먼트가 통째로 날아가 절대 경로로 해석된다.
 *
 * 2) **두 메서드의 경로 축이 서로 다르다** — 조회는 `@GetMapping("/{deptId}")` 라 deptId 가
 *    **경로 변수**이고, 일괄 저장은 `@PostMapping("/batch")` 라 `/batch` 가 **리터럴 세그먼트**이며
 *    deptId 는 **요청 본문에만** 존재한다. 두 규칙이 뒤섞이면 ─ 저장이 `/{deptId}` 로 나가면 404 로
 *    조용히 실패하고, 조회가 컬렉션 루트로 새면 **다른 부서 구성원 명단까지 노출**된다.
 *
 * 3) 경로 변수 치환 — 조회 경로는 인자 `deptId` 만 따라야 한다. 다른 값(본문·상태값)을 따라가도록
 *    바뀌면 화면에서 고른 부서가 아닌 조직의 권한 현황을 보게 된다.
 *
 * 4) 요청 본문 무가공 — `DeptAuthorBatchRequest` 는 `{ deptId, authrtId, allMembers, userIds? }`
 *    이고 `userIds` 는 **선택 필드**다. 유일한 호출부는 `allMembers: true` 로 부르며 `userIds` 를
 *    아예 넘기지 않는다. 여기에 기본값 `[]` 를 채워 넣는 "정규화"가 끼어들면 서버가 받는 의미가
 *    "부서 전원"에서 "대상 0명"으로 뒤집힌다. 반대로 `userIds` 를 정렬·중복 제거하면 호출부가
 *    의도한 대상 집합이 달라진다.
 *
 * 5) 페이징 파라미터 변환 — 이 서비스는 params 인자를 따로 노출하지 않지만, 받은 config 를
 *    `ApiService.get` 에 **그대로** 넘기므로 호출부가 `config.params` 를 주면 `BaseSearchDto`
 *    정규화(`page` 0-based → `pageIndex` 1-based(+1), `size` → `recordCountPerPage`)가 그대로
 *    적용된다. 백엔드가 `@ModelAttribute BaseSearchDto` 로 받으므로 이 축은 실재한다. +1 이
 *    사라지거나 두 번 적용되면 목록이 한 페이지씩 밀린다 — 타입은 그대로라 tsc 로는 안 잡힌다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·Authorization 헤더)가
 *    유실되면 화면 이탈 시 요청 취소가 동작하지 않고, SSR 경로에서는 Bearer 토큰이 빠져 401 이
 *    된다. 유실돼도 브라우저 경로에서는 요청이 성공하므로 아무도 눈치채지 못한다.
 *
 * ── 관측했으나 계약으로 고정하지 않은 것 ─────────────────────────────────────
 * - **반환 타입 드리프트**: 프론트 선언은 `Promise<DeptAuthorProjection[]>` 인데 백엔드는
 *   `ApiResponse<PageResponse<DeptAuthorProjection>>` 를 준다. `client.get` 은 `ApiResponse.data`
 *   만 벗기므로 실제로 도착하는 값은 배열이 아니라 `{ list, total, ... }` 객체다. 결함으로 보아
 *   계약으로 고정하지 않는다 — 아래 응답 테스트는 "받은 값을 그대로 돌려준다"(무가공 통과)만
 *   고정하며, 그 값이 배열이라는 주장은 하지 않는다.
 * - `getDeptAuthorities` 는 현재 애플리케이션 내 호출부가 없다(실측: `SecurityDeptAuthorityClient`
 *   는 `updateDeptAuthorities` 만 사용). 그래도 공개 표면이므로 경로·config 축은 고정한다.
 * - 경로 변수는 `encodeURIComponent` 없이 문자열 보간된다. 현재 식별자 형식(`DEPT_001`)에서는
 *   문제가 드러나지 않아 계약으로 만들지 않는다.
 * - `ApiService.get` 은 `config.params` 객체를 사본 없이 직접 수정한다(호출부 객체 오염). 같은
 *   객체를 재사용하면 두 번째 호출에서 +1 변환이 건너뛰어진다 — 결함으로 보아 제외한다.
 *
 * 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { deptAuthorityAdminService } from '../DeptAuthorityAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두 — **소스 확인값**이다.
 * `AdminService('/dept-authorities')` + category 기본값 'system' → `admin/system/dept-authorities`
 * (선행 슬래시 없음 — ApiService 생성자가 제거한다).
 */
const BASE = 'admin/system/dept-authorities';

/**
 * 일괄 저장 요청 본문. 소스의 `DeptAuthorBatchRequest` 는 export 되지 않으므로 같은 형태를
 * 테스트에 선언한다(구조가 어긋나면 tsc 가 인자 전달 지점에서 잡는다).
 */
interface DeptAuthorBatchBody {
  deptId: string;
  authrtId: string;
  allMembers: boolean;
  userIds?: string[];
}

/** 조회 응답 1행. 소스의 `DeptAuthorProjection` 역시 export 되지 않아 동일 형태를 선언한다. */
interface DeptAuthorRow {
  deptCode: string;
  deptNm: string;
  userId: string;
  userNm: string;
  authrtId: string;
  scrtyDcsnTrgtId: string;
  regYn: string;
}

describe('DeptAuthorityAdminService — 부서별 권한 매핑 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('부서별 권한 목록 조회 (getDeptAuthorities)', () => {
    it('deptId 가 경로 변수로 붙어 admin/system/dept-authorities/{deptId} 로 나간다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, undefined);
      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다.
      expect(client.get).not.toHaveBeenCalledWith(`/${BASE}/DEPT_001`, undefined);
      // 경로 변수가 탈락해 컬렉션 루트로 축약되면 부서 구분 없이 전체가 조회 대상이 된다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('경로는 인자로 받은 deptId 만 따른다 — 다른 부서의 구성원 권한을 조회하지 않는다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_002');

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_002`, undefined);
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/DEPT_001`, undefined);
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체나 기본 params 로 바꿔치지 않는다', async () => {
      // 빈 객체({})로 바꾸면 `config?.params` 분기의 전제가 달라진다(아래 params 테스트의 근거).
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001');

      expect(client.get.mock.calls[0][1]).toBeUndefined();
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/DEPT_001`, { params: {} });
    });

    it('호출부의 timeout·AbortSignal 이 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, { timeout: 3000, signal });
    });

    it('SSR 호출부가 넘기는 Authorization 헤더가 보존된다', async () => {
      // 서버 컴포넌트는 쿠키에서 뽑은 Bearer 토큰을 config 로 넘긴다. 유실되면 401 이다.
      const headers = { Authorization: 'Bearer test-token' };

      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', { headers });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, { headers });
    });

    it('config.params 의 첫 페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이면 첫 페이지가 빈다', async () => {
      // 백엔드가 @ModelAttribute BaseSearchDto 로 받으므로 이 축은 실재한다.
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', { params: { page: 0 } });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, {
        params: { page: 0, pageIndex: 1 },
      });
    });

    it('page 3·size 20 은 pageIndex 4·recordCountPerPage 20 이 되고 원본 키도 함께 남는다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', {
        params: { page: 3, size: 20 },
      });

      // page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, {
        params: { page: 3, size: 20, pageIndex: 4, recordCountPerPage: 20 },
      });
    });

    it('호출부가 pageIndex 를 직접 지정하면 page 기반 변환이 이를 덮어쓰지 않는다', async () => {
      // page 9 였다면 변환 결과는 pageIndex 10 이겠지만, 명시값 1 이 그대로 유지돼야 한다.
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', {
        params: { page: 9, pageIndex: 1 },
      });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, {
        params: { page: 9, pageIndex: 1 },
      });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/DEPT_001`, {
        params: { page: 9, pageIndex: 10 },
      });
    });

    it('빈 params 객체에 기본 페이지 값을 주입하지 않는다 — 서버 기본값 판단을 가로채지 않는다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001', { params: {} });

      expect(client.get).toHaveBeenCalledWith(`${BASE}/DEPT_001`, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/DEPT_001`, {
        params: { pageIndex: 1, recordCountPerPage: 10 },
      });
    });

    it('조회 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      // ⚠ 실제 도착 형태(PageResponse 객체 여부)는 여기서 주장하지 않는다 — 무가공 통과만 고정한다.
      const rows: DeptAuthorRow[] = [
        {
          deptCode: 'DEPT_001',
          deptNm: '경영지원부',
          userId: 'USR_001',
          userNm: '홍길동',
          authrtId: 'ROLE_ADMIN',
          scrtyDcsnTrgtId: 'SEC_001',
          regYn: 'Y',
        },
      ];
      client.get.mockResolvedValueOnce(rows);

      await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001')).resolves.toBe(rows);
    });

    it('빈 결과도 그대로 통과시킨다 — null·undefined 로 바꾸거나 사본을 만들지 않는다', async () => {
      const empty: DeptAuthorRow[] = [];
      client.get.mockResolvedValueOnce(empty);

      // toBe(동일 참조)라서 사본을 만들거나 다른 값으로 치환하면 즉시 깨진다.
      await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001')).resolves.toBe(empty);
    });

    it('조회 실패(403 등)를 삼키지 않고 그대로 전파한다', async () => {
      // 권한 부족을 빈 목록으로 뭉개면 화면이 "권한 보유자 없음"으로 오인한다.
      const forbidden = new Error('접근 권한이 없습니다');
      client.get.mockRejectedValueOnce(forbidden);

      await expect(deptAuthorityAdminService.getDeptAuthorities('DEPT_001')).rejects.toBe(forbidden);
    });
  });

  describe('부서 권한 일괄 저장 (updateDeptAuthorities)', () => {
    /** 유일한 실호출부(SecurityDeptAuthorityClient)가 만드는 형태 — 부서 전원 대상. */
    const allMembersBody: DeptAuthorBatchBody = {
      deptId: 'DEPT_001',
      authrtId: 'ROLE_ADMIN',
      allMembers: true,
    };

    it('리터럴 경로 /batch 로 POST 한다 — deptId 는 본문에만 있고 경로로 새지 않는다', async () => {
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, undefined);
      // 본문의 deptId 를 경로 변수로 오인하면 @PostMapping("/batch") 와 어긋나 404 로 조용히 실패한다.
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/DEPT_001`, allMembersBody, undefined);
      expect(client.post).not.toHaveBeenCalledWith(`/${BASE}/batch`, allMembersBody, undefined);
    });

    it('요청 본문은 사본이 아니라 호출부 객체 그대로 실린다', async () => {
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody);

      // 동일 참조 확인 — 중간에서 필드를 재조립하면(스프레드 정규화 등) 즉시 깨진다.
      expect(client.post.mock.calls[0][1]).toBe(allMembersBody);
    });

    it('본문을 배열이나 다른 객체로 감싸지 않는다 — 백엔드는 DeptAuthorBatchRequest 단건을 받는다', async () => {
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, undefined);
      // 형제 서비스(UserAuthorityAdminService)는 [dto] 로 감싼다 — 그 규칙이 이식되면 400 이다.
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/batch`, [allMembersBody], undefined);
      expect(client.post).not.toHaveBeenCalledWith(
        `${BASE}/batch`,
        { request: allMembersBody },
        undefined
      );
    });

    it('allMembers:true 에 userIds 를 생략하면 키를 만들어내지 않는다 — 빈 배열 기본값 금지', async () => {
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody);

      expect(client.post).toHaveBeenCalledWith(
        `${BASE}/batch`,
        { deptId: 'DEPT_001', authrtId: 'ROLE_ADMIN', allMembers: true },
        undefined
      );
      // userIds: [] 를 채워 넣으면 "부서 전원"이 "대상 0명"으로 의미가 뒤집힌다.
      expect(client.post).not.toHaveBeenCalledWith(
        `${BASE}/batch`,
        { deptId: 'DEPT_001', authrtId: 'ROLE_ADMIN', allMembers: true, userIds: [] },
        undefined
      );
    });

    it('userIds 는 순서·중복까지 원본 그대로 전달된다 — 정렬·중복 제거를 하지 않는다', async () => {
      const partialBody: DeptAuthorBatchBody = {
        deptId: 'DEPT_002',
        authrtId: 'ROLE_USER',
        allMembers: false,
        userIds: ['USR_003', 'USR_001', 'USR_003'],
      };

      await deptAuthorityAdminService.updateDeptAuthorities(partialBody);

      expect(client.post).toHaveBeenCalledWith(
        `${BASE}/batch`,
        {
          deptId: 'DEPT_002',
          authrtId: 'ROLE_USER',
          allMembers: false,
          userIds: ['USR_003', 'USR_001', 'USR_003'],
        },
        undefined
      );
      // 정렬·중복 제거가 끼어들면 서버가 받는 대상 집합 자체가 달라진다.
      expect(client.post).not.toHaveBeenCalledWith(
        `${BASE}/batch`,
        {
          deptId: 'DEPT_002',
          authrtId: 'ROLE_USER',
          allMembers: false,
          userIds: ['USR_001', 'USR_003'],
        },
        undefined
      );
    });

    it('빈 userIds 배열을 키째 지우지 않는다 — 명시적 "대상 없음"과 미지정은 다른 신호다', async () => {
      const emptyTargetBody: DeptAuthorBatchBody = {
        deptId: 'DEPT_002',
        authrtId: 'ROLE_USER',
        allMembers: false,
        userIds: [],
      };

      await deptAuthorityAdminService.updateDeptAuthorities(emptyTargetBody);

      expect(client.post).toHaveBeenCalledWith(
        `${BASE}/batch`,
        { deptId: 'DEPT_002', authrtId: 'ROLE_USER', allMembers: false, userIds: [] },
        undefined
      );
      expect(client.post).not.toHaveBeenCalledWith(
        `${BASE}/batch`,
        { deptId: 'DEPT_002', authrtId: 'ROLE_USER', allMembers: false },
        undefined
      );
    });

    it('config 를 생략하면 세 번째 인자로 undefined 가 그대로 전달된다', async () => {
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody);

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, undefined);
    });

    it('저장 시 timeout 이 유실되지 않는다 — 이 서비스는 자체 timeout 을 강제하지 않는다', async () => {
      // 형제 서비스(DeptAdminService.updateDeptHierarchy)는 60초를 덮어쓰지만 여기는 그렇지 않다.
      // 강제 로직이 이식되면 호출부 지정값이 무시된다.
      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody, { timeout: 5000 });

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, { timeout: 5000 });
      expect(client.post).not.toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, {
        timeout: 60000,
      });
    });

    it('AbortSignal 이 보존된다 — 화면 이탈 시 저장 요청을 취소할 수 있어야 한다', async () => {
      const { signal } = new AbortController();

      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody, { signal });

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, { signal });
    });

    it('Authorization 헤더가 보존된다 — 유실되면 저장이 401 로 실패한다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await deptAuthorityAdminService.updateDeptAuthorities(allMembersBody, { headers });

      expect(client.post).toHaveBeenCalledWith(`${BASE}/batch`, allMembersBody, { headers });
    });

    it('성공 응답(data=null)을 임의 값으로 바꾸지 않고 그대로 통과시킨다', async () => {
      // 백엔드는 ApiResponse.success(null) 을 주고 client 가 data(null)만 벗겨 준다.
      client.post.mockResolvedValueOnce(null);

      await expect(deptAuthorityAdminService.updateDeptAuthorities(allMembersBody)).resolves.toBeNull();
    });

    it('저장 실패(400·403)를 삼키지 않고 그대로 전파한다 — 화면이 성공으로 오인하면 안 된다', async () => {
      // 실패를 삼키면 "일괄 적용되었습니다" 토스트가 뜬 채 권한은 그대로 남는다.
      const rejected = new Error('권한 일괄 저장에 실패했습니다');
      client.post.mockRejectedValueOnce(rejected);

      await expect(
        deptAuthorityAdminService.updateDeptAuthorities(allMembersBody)
      ).rejects.toBe(rejected);
    });
  });

  describe('요청 표면 격리', () => {
    const body: DeptAuthorBatchBody = {
      deptId: 'DEPT_001',
      authrtId: 'ROLE_ADMIN',
      allMembers: true,
    };

    it('두 메서드의 경로는 서로 겹치지 않으며 접두를 벗어나거나 선행 슬래시를 갖지 않는다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001');
      await deptAuthorityAdminService.updateDeptAuthorities(body);

      const paths = [client.get, client.post].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      // 조회는 경로 변수, 저장은 리터럴 /batch — 두 규칙이 뒤섞이지 않았음을 정확 일치로 고정한다.
      expect(paths).toEqual([
        'admin/system/dept-authorities/DEPT_001',
        'admin/system/dept-authorities/batch',
      ]);
    });

    it('각 메서드는 자기 HTTP 동사만 사용한다 — 저장이 PUT 이 되면 백엔드 @PostMapping 과 어긋난다', async () => {
      await deptAuthorityAdminService.getDeptAuthorities('DEPT_001');
      await deptAuthorityAdminService.updateDeptAuthorities(body);

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
      expect(client.delete).not.toHaveBeenCalled();
    });
  });
});
