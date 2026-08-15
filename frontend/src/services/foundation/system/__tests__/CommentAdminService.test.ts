/**
 * CommentAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/CommentAdminService.ts` 는 관리자 댓글 관리의 유일한 API
 * 진입점이며, 실사용처는 `admin/system/monitoring` 의 MonitoringHubClient(COMMENTS 탭) 한 곳이다.
 * 메서드가 목록·삭제 두 개뿐이라 "테스트할 게 없다"고 보이지만, 아래 항목들은 **틀어져도
 * 컴파일·타입 검사를 모두 통과한 채 런타임에서만 조용히 깨진다**.
 *
 * 1) URL 접두 — 이 서비스는 형제들과 달리 `AdminService` 가 아니라 **`ApiService` 를 직접 상속**해
 *    `super('admin/comments')` 로 경로를 확정한다. `AdminService` 의 자동 합성 규칙
 *    (`admin/{category=system}/{path}`)을 쓰면 `admin/system/comments` 가 되는데, 백엔드
 *    `@RequestMapping("/api/v1/admin/comments")` 와 어긋나 **목록·삭제 전건이 404** 가 된다
 *    (소스 주석에 기록된 실제 사고 이력). 접두가 한 세그먼트만 늘어나도 두 메서드가 동시에 죽는다.
 *    선행 슬래시가 되살아나면 axios `baseURL`('/api/v1') 의 경로 세그먼트가 통째로 날아간다.
 *
 * 2) 페이징 파라미터 변환 — `ApiService.get` 이 `page`(0-based) → `pageIndex`(1-based, +1),
 *    `size` → `recordCountPerPage` 로 변환해 백엔드 `BaseSearchDto` 규약에 맞춘다.
 *    호출부가 `{ page: page - 1, size: 50 }` 로 0-based 를 넘기므로(MonitoringHubClient),
 *    이 +1 이 사라지거나 두 번 적용되면 댓글 목록이 한 페이지씩 밀리거나 첫 페이지가 통째로 빈다.
 *    타입은 그대로라 tsc 로는 절대 잡히지 않는다.
 *
 * 3) 경로 변수 치환 — `deleteComment` 는 인자 `ansSn` 이 경로를 결정한다. 다른 값을 따라가도록
 *    바뀌면 **관리자가 고른 댓글이 아닌 엉뚱한 댓글이 삭제된다**(되돌릴 수 없는 사고).
 *    특히 세그먼트가 통째로 비면 `admin/comments` 컬렉션 DELETE 가 되어 파급이 더 커진다.
 *
 * 4) 필터 축 이름 — `pstSn`/`bbsId`/`searchWrd` 는 백엔드 파라미터명과 1:1 이다. 형제 서비스처럼
 *    `searchKeyword → keyword` 승격 로직이 잘못 이식되면 두 키가 동시에 나가 바인딩이 흔들린다.
 *
 * 5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·AbortSignal·Authorization 헤더)가
 *    유실되면 탭 이탈 시 요청 취소가 안 되고, SSR 경로에서는 Bearer 토큰이 빠져 401 이 된다.
 *    유실돼도 브라우저 경로에서는 요청이 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·config 로 나가는지**를 고정한다.
 * 프로덕션 코드는 수정하지 않는다(관측만 한다).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { commentAdminService } from '../CommentAdminService';

/**
 * 이 서비스의 모든 요청이 공유하는 접두 — **소스 확인값**.
 * `class CommentAdminService extends ApiService` + `super('admin/comments')` 이므로
 * AdminService 의 `admin/{category}/{path}` 자동 합성을 타지 않는다 → 'system' 세그먼트가 없다.
 * (선행 슬래시도 없다 — ApiService 생성자가 제거하며, 애초에 넘기지도 않는다.)
 */
const BASE = 'admin/comments';

/** 응답 픽스처용 타입. 소스의 CommentDetail 은 export 되지 않아 동일 구조로 로컬 선언한다. */
interface CommentRow {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
}

/** 목록 응답 픽스처 한 건. */
const ROW: CommentRow = {
  ansSn: 1001,
  pstSn: 55,
  bbsId: 'BBSMSTR_000000000001',
  wrterId: 'USR0001',
  wrterNm: '홍길동',
  ansCn: '확인했습니다.',
  crtDt: '2026-08-14T10:00:00',
};

describe('CommentAdminService — 댓글 관리자 API 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('URL 조합 — ApiService 직접 상속(접두 자동 합성 없음)', () => {
    it('목록은 admin/comments 로 나간다 — admin/system/comments 가 되면 전건 404 다', async () => {
      await commentAdminService.getComments({});

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      // AdminService 를 상속했을 때 만들어지는 경로. 실제로 404 를 냈던 형태다.
      expect(client.get).not.toHaveBeenCalledWith('admin/system/comments', { params: {} });
    });

    it('컬렉션 경로에 선행·후행 슬래시가 붙지 않는다', async () => {
      await commentAdminService.getComments({});

      // 선행 슬래시가 붙으면 axios baseURL('/api/v1')의 경로 세그먼트가 통째로 날아간다(절대 경로 해석).
      expect(client.get).not.toHaveBeenCalledWith(`/${BASE}`, { params: {} });
      // path 인자로 빈 문자열('')을 넘기므로 basePath 그대로가 최종 경로여야 한다.
      expect(client.get).not.toHaveBeenCalledWith(`${BASE}/`, { params: {} });
    });

    it('삭제는 admin/comments/{ansSn} 로 나가며 system 세그먼트가 끼어들지 않는다', async () => {
      await commentAdminService.deleteComment(1001);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/1001`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/comments/1001', undefined);
    });
  });

  describe('페이징 파라미터 변환 (getComments)', () => {
    it('화면 1페이지(page 0)는 pageIndex 1 로 변환된다 — 오프바이원이 생기면 첫 페이지가 빈다', async () => {
      // MonitoringHubClient: getComments({ page: page - 1, size: PAGE_SIZE }) — PAGE_SIZE = 50.
      await commentAdminService.getComments({ page: 0, size: 50 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 0, size: 50, pageIndex: 1, recordCountPerPage: 50 },
      });
    });

    it('화면 3페이지(page 2)는 pageIndex 3 이 되고 원본 page·size 키도 함께 남는다', async () => {
      await commentAdminService.getComments({ page: 2, size: 50 });

      // page 2 → pageIndex 3 (+1). page/size 를 지우지 않는 이유는 Spring Data Pageable 병행 지원 때문이다.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 50, pageIndex: 3, recordCountPerPage: 50 },
      });
      // +1 이 사라진 형태(pageIndex 2)로 나가면 목록이 한 페이지씩 밀린다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 2, size: 50, pageIndex: 2, recordCountPerPage: 50 },
      });
      // 원본 키를 지운 형태로 나가면 Pageable 바인딩이 끊긴다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { pageIndex: 3, recordCountPerPage: 50 },
      });
    });

    it('size 만 주면 recordCountPerPage 만 파생되고 pageIndex 는 생기지 않는다', async () => {
      await commentAdminService.getComments({ size: 20 });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { size: 20, recordCountPerPage: 20 },
      });
      // page 가 없는데 pageIndex 를 임의로 채우면 서버가 1페이지로 고정 해석한다.
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { size: 20, recordCountPerPage: 20, pageIndex: 1 },
      });
    });

    it('page 만 주면 pageIndex 만 파생되고 recordCountPerPage 는 생기지 않는다', async () => {
      await commentAdminService.getComments({ page: 4 });

      // page 4 → pageIndex 5 (+1).
      expect(client.get).toHaveBeenCalledWith(BASE, { params: { page: 4, pageIndex: 5 } });
      // 기본 페이지 크기를 클라이언트가 임의로 끼워 넣지 않는다(서버 기본값을 존중).
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { page: 4, pageIndex: 5, recordCountPerPage: 10 },
      });
    });
  });

  describe('필터 파라미터 (getComments)', () => {
    it('pstSn·bbsId 는 개명 없이 그대로 실린다 — 백엔드 @RequestParam 과 1:1 이다', async () => {
      await commentAdminService.getComments({ pstSn: 55, bbsId: 'BBSMSTR_000000000001' });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: { pstSn: 55, bbsId: 'BBSMSTR_000000000001' },
      });
    });

    it('searchWrd 는 keyword·searchKeyword 로 승격되지 않는다 — 축이 늘면 서버 바인딩이 흔들린다', async () => {
      // 형제 서비스(SurveyAdminService)는 searchKeyword → keyword 승격을 하지만 이 서비스는 하지 않는다.
      // ⚠ 서버는 현재 이 값을 무시한다(소스 주석 참조). 여기서 고정하는 것은 "클라이언트가 어떤 키로
      //    보내는가" 뿐이며, 임의 개명이 끼어드는 것을 막는 것이 목적이다.
      await commentAdminService.getComments({ searchWrd: '스팸' });

      expect(client.get).toHaveBeenCalledWith(BASE, { params: { searchWrd: '스팸' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: { keyword: '스팸' } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, {
        params: { searchWrd: '스팸', searchKeyword: '스팸' },
      });
    });

    it('빈 객체를 넘겨도 params 키는 유지된다 — undefined 로 바꿔치지 않는다', async () => {
      // getComments 는 항상 `{ ...config, params }` 를 만들므로 params 키가 사라질 수 없다.
      // undefined 로 바뀌면 ApiService.get 의 정규화 분기(config?.params 가 truthy 일 때만 동작)가
      // 통째로 건너뛰어지며, 이후 페이징 축이 조용히 죽는다.
      await commentAdminService.getComments({});

      expect(client.get).toHaveBeenCalledWith(BASE, { params: {} });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { params: undefined });
    });

    it('필터·페이징을 함께 주면 두 축이 서로를 지우지 않고 공존한다', async () => {
      await commentAdminService.getComments({
        pstSn: 55,
        bbsId: 'BBSMSTR_000000000001',
        page: 1,
        size: 20,
        searchWrd: '스팸',
      });

      // page 1 → pageIndex 2 (+1), size 20 → recordCountPerPage 20.
      expect(client.get).toHaveBeenCalledWith(BASE, {
        params: {
          pstSn: 55,
          bbsId: 'BBSMSTR_000000000001',
          page: 1,
          size: 20,
          searchWrd: '스팸',
          pageIndex: 2,
          recordCountPerPage: 20,
        },
      });
    });
  });

  describe('config 전달 (getComments)', () => {
    it('timeout·signal 이 params 와 함께 보존된다 — 유실되면 탭 이탈 시 요청이 취소되지 않는다', async () => {
      const { signal } = new AbortController();

      await commentAdminService.getComments({ page: 0, size: 50 }, { timeout: 3000, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, {
        timeout: 3000,
        signal,
        params: { page: 0, size: 50, pageIndex: 1, recordCountPerPage: 50 },
      });
    });

    it('Authorization 헤더가 유실되지 않는다 — 빠지면 401 이다', async () => {
      const headers = { Authorization: 'Bearer test-token' };

      await commentAdminService.getComments({ pstSn: 55 }, { headers });

      expect(client.get).toHaveBeenCalledWith(BASE, { headers, params: { pstSn: 55 } });
    });

    it('config.params 는 첫 인자 params 에 덮인다 — 필터 인자가 항상 이긴다', async () => {
      // `{ ...config, params }` 라 spread 뒤에 오는 params 인자가 항상 승리한다.
      // 순서가 뒤집히면 호출부가 넘긴 필터가 config 의 잔여 params 에 밀려 다른 게시글 댓글이 나온다.
      const { signal } = new AbortController();

      await commentAdminService.getComments({ pstSn: 7 }, { params: { pstSn: 999 }, signal });

      expect(client.get).toHaveBeenCalledWith(BASE, { signal, params: { pstSn: 7 } });
      expect(client.get).not.toHaveBeenCalledWith(BASE, { signal, params: { pstSn: 999 } });
    });
  });

  describe('응답 전달 (getComments)', () => {
    it('목록 응답은 재포장 없이 클라이언트 결과를 그대로 반환한다', async () => {
      const page: PageResponse<CommentRow> = {
        list: [ROW, { ...ROW, ansSn: 1002, wrterNm: '김철수', ansCn: '동의합니다.' }],
        total: 2,
        page: 1,
        size: 50,
        totalPage: 1,
      };
      client.get.mockResolvedValueOnce(page);

      await expect(commentAdminService.getComments({ page: 0, size: 50 })).resolves.toBe(page);
    });

    it('빈 페이지도 기본값으로 바꿔치지 않고 그대로 반환한다', async () => {
      // total 0 을 클라이언트가 임의 폴백(예: 더미 목록·총건수 재계산)으로 덮으면 화면이 거짓을 말한다.
      const empty: PageResponse<CommentRow> = { list: [], total: 0, page: 1, size: 50, totalPage: 0 };
      client.get.mockResolvedValueOnce(empty);

      await expect(commentAdminService.getComments({ page: 0, size: 50 })).resolves.toBe(empty);
    });

    it('목록 조회 실패는 삼키지 않고 그대로 전파한다 — 빈 목록으로 위장하지 않는다', async () => {
      const failure = new Error('Request failed with status code 500');
      client.get.mockRejectedValueOnce(failure);

      await expect(commentAdminService.getComments({ page: 0, size: 50 })).rejects.toBe(failure);
    });
  });

  describe('댓글 삭제 (deleteComment)', () => {
    it('인자로 받은 ansSn 이 경로를 결정한다 — 다른 댓글을 지우면 되돌릴 수 없다', async () => {
      await commentAdminService.deleteComment(1001);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/1001`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/1002`, undefined);
    });

    it('ansSn 0 도 경로 세그먼트로 남는다 — falsy 로 취급해 세그먼트가 사라지면 컬렉션 DELETE 다', async () => {
      await commentAdminService.deleteComment(0);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/0`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(BASE, undefined);
    });

    it('config 를 생략하면 undefined 가 그대로 전달된다 — 빈 객체로 바꿔치지 않는다', async () => {
      await commentAdminService.deleteComment(1001);

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/1001`, undefined);
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/1001`, {});
    });

    it('삭제 시 config(timeout·signal)가 유실되지 않는다', async () => {
      const { signal } = new AbortController();

      await commentAdminService.deleteComment(1001, { timeout: 5000, signal });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/1001`, { timeout: 5000, signal });
    });

    it('삭제 요청은 params 를 붙이지 않는다 — 페이징 정규화가 개입하지 않는다', async () => {
      await commentAdminService.deleteComment(1001, { timeout: 5000 });

      expect(client.delete).toHaveBeenCalledWith(`${BASE}/1001`, { timeout: 5000 });
      expect(client.delete).not.toHaveBeenCalledWith(`${BASE}/1001`, {
        timeout: 5000,
        params: {},
      });
    });

    it('서버 오류(권한 없음 등)를 삼키지 않고 그대로 전파하며 재시도하지 않는다', async () => {
      // 삼키면 화면이 성공 토스트를 띄우고, 재시도가 끼어들면 이미 지워진 자원에 중복 요청이 나간다.
      const denied = new Error('삭제 권한이 없습니다');
      client.delete.mockRejectedValueOnce(denied);

      await expect(commentAdminService.deleteComment(1001)).rejects.toBe(denied);
      expect(client.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('경로·동사 격리', () => {
    it('두 메서드의 경로는 서로 겹치지 않으며 admin/comments 접두를 벗어나지 않는다', async () => {
      await commentAdminService.getComments({ page: 0, size: 50 });
      await commentAdminService.deleteComment(1001);

      const paths = [client.get, client.delete].flatMap((fn) =>
        fn.mock.calls.map((call) => String(call[0]))
      );

      expect(paths).toEqual(['admin/comments', 'admin/comments/1001']);
      paths.forEach((path) => {
        expect(path.startsWith(BASE)).toBe(true);
        expect(path.startsWith('/')).toBe(false);
      });
    });

    it('이 서비스는 GET·DELETE 두 동사만 사용한다 — 조회가 쓰기 동사로 새지 않는다', async () => {
      await commentAdminService.getComments({ page: 0, size: 50 });
      await commentAdminService.deleteComment(1001);

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.delete).toHaveBeenCalledTimes(1);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
      expect(client.patch).not.toHaveBeenCalled();
    });
  });
});
