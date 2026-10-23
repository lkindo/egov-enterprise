/**
 * BoardAdminService 계약 테스트 (Contract Test)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `src/services/foundation/system/BoardAdminService.ts` 는 게시판 마스터(board master)
 * 관리 화면의 유일한 API 진입점인데도 **테스트가 한 건도 없었다**. 이 파일은 얇은
 * 위임 계층처럼 보이지만, 실제로는 아래 항목들이 **틀어져도 컴파일·타입 검사를 모두
 * 통과한 채 런타임에서만 조용히 깨진다.**
 *
 * 1) URL 조합 — `AdminService('/board-masters')` 는 category 기본값 'system' 과 합쳐져
 *    ApiService 에서 `admin/system/board-masters` 로 합성된다(선행 슬래시 제거 +
 *    `admin/{category}/` 접두). 생성자 인자나 접두 규칙이 한 글자만 어긋나도 결과는
 *    404 이고, 화면에는 "조회 실패" 토스트만 뜬다 — 어느 경로가 틀렸는지 아무도 모른다.
 *
 * 2) 검색 파라미터 계약 — 목록 조회는 generated BaseSearchDto 키를 그대로 전달한다.
 *    임의의 `searchCnd`/`searchWrd` 별칭을 섞으면 현재 컨트롤러 바인딩과 어긋난다.
 *
 * 3) generated 응답 검증 — 목록·상세·primitive 응답을 Zod 경계에서 검증한다.
 *
 * 4) 경로 변수 치환 — update/delete 계열은 인자로 받은 bbsId 를 URL 에 박는다.
 *    여기서 다른 값을 집거나 인자 순서가 밀리면 **엉뚱한 게시판을 수정하거나 지운다**.
 *    특히 `deleteBoardMasterPhysically`(영구 물리삭제)는 `/physical` 접미 하나로 설정 수정 경로와 갈린다 —
 *    되돌릴 수 없는 사고가 이 한 조각에 달려 있다.
 *
 * 5) 일괄(batch) 경로 — `/batch/status`(상태 일괄 변경)만 화면이 부른다. [2026-10-23 ADR-0040 §5.2] 단건 논리 삭제와
 *    일괄 영구 삭제의 서비스 메서드는 걷었다(목록이 일괄 사용 상태 바꾸기로 흡수, 영구 삭제는 설정 탭의 한 건 절차).
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·signal 등)가 유실되면
 *    화면 이탈 시 요청 취소(AbortSignal)가 동작하지 않고 타임아웃도 기본값으로 되돌아간다.
 *    유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**와
 * generated/adapter 런타임 경계를 함께 고정한다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => {
  const legacy = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
  return {
    ...legacy,
    getRaw: vi.fn(async (url: string, config?: unknown) => envelope(await legacy.get(url, config))),
    requestRaw: vi.fn(async (request: Record<string, unknown>) => {
      const { url, method, data, ...config } = request;
      const forwardedConfig = Object.keys(config).length > 0 ? config : undefined;
      let response: unknown;
      if (method === 'post') response = await legacy.post(url, data, forwardedConfig);
      else if (method === 'put') response = await legacy.put(url, data, forwardedConfig);
      else if (method === 'patch') response = await legacy.patch(url, data, forwardedConfig);
      else if (method === 'delete') response = await legacy.delete(url, forwardedConfig);
      else throw new Error(`unexpected method: ${String(method)}`);
      return envelope(typeof url === 'string' && url.includes('/batch/') ? undefined : response);
    }),
  };
});

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  boardAdminService,
  type BoardMaster,
  type BoardMasterSummary,
  type BoardMasterUpdateRequest,
} from '../BoardAdminService';

const board: BoardMaster = {
  bbsId: 'BBSMSTR_000000000001',
  bbsTtl: '공지사항',
  bbsTypeCd: 'BBST01',
  bbsAtrbCd: 'BBSA01',
  fileAtchPsbltyYn: 'Y',
  atchPsbltyFileQty: 5,
  atchPsbltyFileSz: 5_242_880,
  useYn: 'Y',
};

// BoardMasterService#toDto(BoardMasterSearchResult)가 실제로 채우는 목록 projection.
// generated 전체 DTO의 required atchPsbltyFileSz는 목록 JSON에 없으므로 false-green fixture로 넣지 않는다.
const boardSummary: BoardMasterSummary = {
  bbsId: board.bbsId!,
  bbsTtl: board.bbsTtl,
  bbsTypeCd: board.bbsTypeCd,
  bbsAtrbCd: board.bbsAtrbCd,
  useYn: board.useYn,
  designations: [],
};

// [2026-10-23 ADR-0040 결정 10] 설정 수정은 생성 DTO 가 아니라 버전이 필수인 수정 요청이다.
const updateRequest: BoardMasterUpdateRequest = {
  bbsTtl: '수정된제목',
  atchPsbltyFileSz: 5_242_880,
  useYn: 'Y',
  version: 3,
};

// 상세 응답(BoardMasterDetailResponse) — 수정 요청에 돌려보낼 버전과 지정 용도를 늘 싣는다(ADR-0040 결정 10·§5.2).
// [2026-10-23 ADR-0040 결정 3·5·6·7] 게시·고정·비밀글·추천 설정은 NOT NULL DEFAULT 컬럼이라 상세 응답에 늘 있다.
const boardDetail = {
  ...board, bbsId: board.bbsId!, version: 3, designations: [],
  rsvtPstgPsbltyYn: 'N', upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y',
};

const boardPage = {
  list: [boardSummary],
  total: 1,
  page: 1,
  size: 10,
  totalPage: 1,
};

describe('BoardAdminService — 게시판 마스터 관리 API 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockImplementation((url: string) => {
      if (url.endsWith('/deletable')) return Promise.resolve(false);
      if (url === 'admin/system/board-masters') return Promise.resolve(boardPage);
      return Promise.resolve(boardDetail);
    });
    client.post.mockResolvedValue('BBSMSTR_CREATED');
  });

  describe('목록 조회 (getBoardMasterList)', () => {
    it('목록은 generated query를 admin/system/board-masters로 그대로 전달한다', async () => {
      await boardAdminService.getBoardMasterList();

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters', {
        params: {},
      });
    });

    it('searchKeyword/page/size와 config를 변형 없이 보존한다', async () => {
      const { signal } = new AbortController();
      const params = { searchKeyword: '공지사항', page: 2, size: 20 };
      await boardAdminService.getBoardMasterList(params, { timeout: 5000, signal });

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters', {
        timeout: 5000,
        signal,
        params,
      });
    });

    it('generated page 컨테이너와 실제 목록 projection을 검증·정규화한다', async () => {
      await expect(boardAdminService.getBoardMasterList()).resolves.toEqual(boardPage);
      expect(boardPage.list[0]).not.toHaveProperty('atchPsbltyFileSz');

      client.get.mockResolvedValueOnce({ list: [{ bbsId: 'BROKEN', bbsTtl: '누락' }] });
      await expect(boardAdminService.getBoardMasterList()).rejects.toThrow();
    });
  });

  describe('단건 조회 (getBoardMaster / isBoardMasterDeletable)', () => {
    it('단건 조회는 bbsId 를 경로 변수로 붙이고 config 가 없으면 undefined 를 그대로 넘긴다', async () => {
      await boardAdminService.getBoardMaster('BBSMSTR_000000000001');

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000001', undefined);
    });

    it('단건 조회는 호출부 config 를 params 변환 없이 원형 그대로 전달한다', async () => {
      const { signal } = new AbortController();

      await boardAdminService.getBoardMaster('BBSMSTR_000000000002', { timeout: 1000, signal });

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000002', {
        timeout: 1000,
        signal,
      });
    });

    it('삭제 가능 여부 조회는 /{bbsId}/deletable 하위 경로로 나간다', async () => {
      await boardAdminService.isBoardMasterDeletable('BBSMSTR_000000000003');

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000003/deletable', undefined);
    });

    it('삭제 가능 여부는 불리언 변환·기본값 없이 응답을 그대로 반환한다 — false 를 삼키면 삭제가 열린다', async () => {
      client.get.mockResolvedValueOnce(false);

      await expect(boardAdminService.isBoardMasterDeletable('BBSMSTR_000000000003')).resolves.toBe(false);

      client.get.mockResolvedValueOnce('false');
      await expect(boardAdminService.isBoardMasterDeletable('BROKEN')).rejects.toThrow();
    });
  });

  describe('등록·수정 (createBoardMaster / updateBoardMaster)', () => {
    it('게시판 등록은 generated 요청을 검증하고 생성 식별자를 반환한다', async () => {
      const payload: BoardMaster = { ...board, bbsId: undefined, bbsTtl: '신규게시판' };

      await expect(boardAdminService.createBoardMaster(payload)).resolves.toBe('BBSMSTR_CREATED');
      expect(client.post).toHaveBeenCalledWith('admin/system/board-masters', payload, undefined);
    });

    it('게시판 등록은 호출부 config 를 그대로 전달한다', async () => {
      const payload: BoardMaster = { ...board, bbsTtl: '신규게시판' };

      await boardAdminService.createBoardMaster(payload, { timeout: 20000 });
      expect(client.post).toHaveBeenCalledWith('admin/system/board-masters', payload, { timeout: 20000 });
    });

    it('등록 응답에 generated string 식별자가 없으면 성공으로 오인하지 않는다', async () => {
      client.post.mockResolvedValueOnce(undefined);

      await expect(boardAdminService.createBoardMaster(board)).rejects.toThrow(
        '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
      );
    });

    it('필수 generated 요청 필드가 빠지면 네트워크 호출 전에 거부한다', async () => {
      await expect(boardAdminService.createBoardMaster({ bbsTtl: '누락' } as BoardMaster)).rejects.toThrow();
      // 버전 없는 수정은 네트워크 전에 거부한다(서버도 400 이다).
      await expect(boardAdminService.updateBoardMaster('BROKEN', { bbsTtl: '버전 없음', atchPsbltyFileSz: 0, useYn: 'Y' } as never)).rejects.toThrow();

      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
    });

    it('게시판 수정은 bbsId를 경로 변수로 쓰고 generated 본문·config를 보존한다', async () => {
      const payload: BoardMasterUpdateRequest = updateRequest;

      await boardAdminService.updateBoardMaster('BBSMSTR_000000000004', payload, { timeout: 2000 });
      expect(client.put).toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_000000000004',
        payload,
        { timeout: 2000 },
      );
    });

    it('수정 대상과 영구 삭제 대상이 다르면 각자의 경로로만 나간다', async () => {
      const payload: BoardMasterUpdateRequest = { ...updateRequest, bbsTtl: '수정' };
      await boardAdminService.updateBoardMaster('BBSMSTR_UPDATE_ONLY', payload);
      await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_DELETE_ONLY');

      expect(client.put).toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_UPDATE_ONLY',
        payload,
        undefined,
      );
      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_DELETE_ONLY/physical', undefined);
      expect(client.delete).not.toHaveBeenCalledWith(
        expect.stringContaining('BBSMSTR_UPDATE_ONLY'),
        expect.anything(),
      );
    });

    it('변경 이력은 게시판 아래 change-history 로 쪽·크기를 실어 읽는다', async () => {
      client.get.mockResolvedValueOnce({ list: [], total: 0, page: 2, size: 20, totalPage: 1 });
      await boardAdminService.getBoardChangeHistory('BBSMSTR_000000000007', { page: 2, size: 20 });

      expect(client.get).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000007/change-history', {
        params: { page: 2, size: 20 },
      });
    });
  });

  describe('영구 삭제 (deleteBoardMasterPhysically)', () => {
    it('영구 물리삭제는 /physical 접미가 붙은 경로로만 나간다 — 접미가 빠지면 단건 비활성화 경로와 구분되지 않는다', async () => {
      await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_000000000006');

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006/physical', undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006', undefined);
      // axios delete 는 (url, config) 2-인자 시그니처다 — 본문 자리에 config 가 밀려 들어가지 않는다.
      expect(client.delete.mock.calls[0]).toHaveLength(2);
    });

    it('영구 물리삭제도 호출부 config 를 그대로 전달한다', async () => {
      await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_000000000006', { timeout: 60000 });

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006/physical', {
        timeout: 60000,
      });
    });
  });

  describe('일괄 처리 (batchUpdateBoardMasterStatus)', () => {
    it('상태 일괄 변경은 /batch/status 로 bbsIds 와 useYn 을 함께 POST 한다', async () => {
      await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_A', 'BBSMSTR_B'], 'N');

      expect(client.post).toHaveBeenCalledWith(
        'admin/system/board-masters/batch/status',
        { bbsIds: ['BBSMSTR_A', 'BBSMSTR_B'], useYn: 'N' },
        undefined,
      );
    });

    it('서버와 같은 1..100개 generated 배열 경계를 네트워크 전에 집행한다', async () => {
      const tooMany = Array.from({ length: 101 }, (_, index) => `BBSMSTR_${index}`);

      await expect(boardAdminService.batchUpdateBoardMasterStatus([], 'N')).rejects.toThrow();
      await expect(boardAdminService.batchUpdateBoardMasterStatus(tooMany, 'N')).rejects.toThrow();
      expect(client.post).not.toHaveBeenCalled();
    });

    it('사용 상태 일괄 변경은 영구 삭제 경로(/batch/delete)로 나가지 않는다', async () => {
      await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_A'], 'N');

      const calledPaths = client.post.mock.calls.map((call) => call[0]);
      expect(calledPaths).toEqual(['admin/system/board-masters/batch/status']);
      expect(boardAdminService).not.toHaveProperty('batchDeleteBoardMastersPhysically');
      expect(boardAdminService).not.toHaveProperty('deleteBoardMaster');
    });
  });

  // [2026-10-23 ADR-0040 결정 3·10] 운영 화면의 게시 기간 변경 — 단건은 PATCH …/posts/{pstSn}/period, 일괄은 POST …/posts/batch/period.
  describe('게시 기간 운영 처리 (updatePostPeriod / updatePostPeriodsInBatch)', () => {
    it('단건 일정 변경은 게시판·글 번호를 경로에 싣고 바꾼 날짜와 읽은 버전만 PATCH 한다', async () => {
      await boardAdminService.updatePostPeriod('BBSMSTR_000000000008', 7, { pstEndYmd: '20261231', version: 2 });

      expect(client.patch).toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_000000000008/posts/7/period',
        { pstEndYmd: '20261231', version: 2 },
        undefined,
      );
    });

    it('단건 일정 변경은 버전 없이 보내지 않는다(서버도 400 이다)', async () => {
      await expect(boardAdminService.updatePostPeriod('BBSMSTR_000000000008', 7, { pstEndYmd: '20261231' } as never)).rejects.toThrow();
      await expect(boardAdminService.updatePostPeriod('BBSMSTR_000000000008', 7, { pstEndYmd: '2026-12-31', version: 1 })).rejects.toThrow();
      expect(client.patch).not.toHaveBeenCalled();
    });

    it('종료일 일괄 처리는 /posts/batch/period 로 동작·대상·날짜를 POST 한다', async () => {
      await boardAdminService.updatePostPeriodsInBatch('BBSMSTR_000000000008', { action: 'END_DATE', pstSns: [7, 9], pstEndYmd: '20261231' });
      await boardAdminService.updatePostPeriodsInBatch('BBSMSTR_000000000008', { action: 'CLEAR_END', pstSns: [7] });

      expect(client.post).toHaveBeenNthCalledWith(1, 'admin/system/board-masters/BBSMSTR_000000000008/posts/batch/period',
        { action: 'END_DATE', pstSns: [7, 9], pstEndYmd: '20261231' }, undefined);
      expect(client.post).toHaveBeenNthCalledWith(2, 'admin/system/board-masters/BBSMSTR_000000000008/posts/batch/period',
        { action: 'CLEAR_END', pstSns: [7] }, undefined);
    });

    it('서버와 같은 1..100건 경계와 동작 어휘를 네트워크 전에 집행한다', async () => {
      const tooMany = Array.from({ length: 101 }, (_, index) => index + 1);

      await expect(boardAdminService.updatePostPeriodsInBatch('BBSMSTR_A', { action: 'CLEAR_END', pstSns: [] })).rejects.toThrow();
      await expect(boardAdminService.updatePostPeriodsInBatch('BBSMSTR_A', { action: 'CLEAR_END', pstSns: tooMany })).rejects.toThrow();
      await expect(boardAdminService.updatePostPeriodsInBatch('BBSMSTR_A', { action: 'PIN', pstSns: [1] } as never)).rejects.toThrow();
      expect(client.post).not.toHaveBeenCalled();
    });
  });

  // [2026-10-23 ADR-0040 결정 5] 운영 화면의 상단 고정 — 단건은 PATCH …/posts/{pstSn}/pin, 일괄은 POST …/posts/batch/pin. 일정 경로와
  //   권한이 달라(BOARD_PIN) 경로도 나눈다. 고정은 게시글 버전을 올리지 않으므로 본문에 버전이 없다.
  describe('상단 고정 운영 처리 (updatePostPin / updatePostPinsInBatch)', () => {
    it('단건 고정·해제는 게시판·글 번호를 경로에 싣고 고정 여부와 고른 종료일만 PATCH 한다', async () => {
      await boardAdminService.updatePostPin('BBSMSTR_000000000008', 7, { upendFixYn: 'Y', upendFixEndYmd: '20261231' });
      await boardAdminService.updatePostPin('BBSMSTR_000000000008', 7, { upendFixYn: 'N' });

      expect(client.patch).toHaveBeenNthCalledWith(1, 'admin/system/board-masters/BBSMSTR_000000000008/posts/7/pin',
        { upendFixYn: 'Y', upendFixEndYmd: '20261231' }, undefined);
      expect(client.patch).toHaveBeenNthCalledWith(2, 'admin/system/board-masters/BBSMSTR_000000000008/posts/7/pin',
        { upendFixYn: 'N' }, undefined);
    });

    it('단건 고정은 어휘 밖 값·하이픈 날짜를 보내지 않는다', async () => {
      await expect(boardAdminService.updatePostPin('BBSMSTR_A', 7, { upendFixYn: 'X' } as never)).rejects.toThrow();
      await expect(boardAdminService.updatePostPin('BBSMSTR_A', 7, { upendFixYn: 'Y', upendFixEndYmd: '2026-12-31' })).rejects.toThrow();
      expect(client.patch).not.toHaveBeenCalled();
    });

    it('일괄 고정·해제는 /posts/batch/pin 으로 대상·고정 여부·날짜를 POST 하고 일정 일괄 경로로 나가지 않는다', async () => {
      await boardAdminService.updatePostPinsInBatch('BBSMSTR_000000000008', { pstSns: [7, 9], upendFixYn: 'Y' });
      await boardAdminService.updatePostPinsInBatch('BBSMSTR_000000000008', { pstSns: [7], upendFixYn: 'N' });

      expect(client.post.mock.calls.map((call) => call[0])).toEqual([
        'admin/system/board-masters/BBSMSTR_000000000008/posts/batch/pin',
        'admin/system/board-masters/BBSMSTR_000000000008/posts/batch/pin',
      ]);
      expect(client.post).toHaveBeenNthCalledWith(1, expect.any(String), { pstSns: [7, 9], upendFixYn: 'Y' }, undefined);
      expect(client.post).toHaveBeenNthCalledWith(2, expect.any(String), { pstSns: [7], upendFixYn: 'N' }, undefined);
    });

    it('서버와 같은 1..100건 경계를 네트워크 전에 집행한다', async () => {
      const tooMany = Array.from({ length: 101 }, (_, index) => index + 1);

      await expect(boardAdminService.updatePostPinsInBatch('BBSMSTR_A', { pstSns: [], upendFixYn: 'N' })).rejects.toThrow();
      await expect(boardAdminService.updatePostPinsInBatch('BBSMSTR_A', { pstSns: tooMany, upendFixYn: 'Y' })).rejects.toThrow();
      expect(client.post).not.toHaveBeenCalled();
    });
  });

  describe('경로 격리', () => {
    it('마스터 관리 메서드는 전부 admin/system/board-masters 아래로만 나간다', async () => {
      await boardAdminService.getBoardMasterList();
      await boardAdminService.getBoardMaster('BBSMSTR_000000000001');
      await boardAdminService.isBoardMasterDeletable('BBSMSTR_000000000001');

      const calledPaths = client.get.mock.calls.map((call) => call[0]);
      expect(calledPaths).toEqual([
        'admin/system/board-masters',
        'admin/system/board-masters/BBSMSTR_000000000001',
        'admin/system/board-masters/BBSMSTR_000000000001/deletable',
      ]);
    });
  });
});
