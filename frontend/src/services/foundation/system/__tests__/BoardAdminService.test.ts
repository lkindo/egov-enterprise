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
 *    특히 `deleteBoardMasterPhysically`(영구 물리삭제)와 `deleteBoardMaster`(논리삭제)는
 *    `/physical` 접미 하나로만 갈린다 — 되돌릴 수 없는 사고가 이 한 조각에 달려 있다.
 *
 * 5) 일괄(batch) 경로 — `/batch/status`(상태 일괄 변경)와 `/batch/delete`(영구 일괄 삭제)가
 *    서로 뒤바뀌면 "비활성화" 버튼이 **영구 삭제**를 실행한다. 두 메서드 모두 POST 이고
 *    본문 형태도 비슷해 타입으로는 구분되지 않는다.
 *
 * 6) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·signal 등)가 유실되면
 *    화면 이탈 시 요청 취소(AbortSignal)가 동작하지 않고 타임아웃도 기본값으로 되돌아간다.
 *    유실돼도 요청 자체는 성공하므로 아무도 눈치채지 못한다.
 *
 * 7) 게시글 등록(createBoardArticle) — 이 메서드만 유일하게 basePath 를 타지 않고
 *    `this.client` 로 직접 `/bbs/{bbsId}` 를 때리며, 본문을 multipart/form-data 의
 *    'board' 파트(JSON Blob)로 감싼다. 관리자 접두가 붙거나 Blob 의 MIME 이 바뀌면
 *    백엔드 `@RequestPart` 바인딩이 즉시 깨진다.
 *
 * 따라서 본 테스트는 "호출됐다"가 아니라 **어떤 URL·파라미터·본문·config 로 나가는지**와
 * generated/adapter 런타임 경계를 함께 고정한다.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

// client 모듈 전체를 대체한다 — axios 인스턴스/인터셉터를 로드하지 않기 위해 hoisted 로 선언한다.
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import {
  boardAdminService,
  type BoardMaster,
  type BoardMasterSummary,
} from '../BoardAdminService';

const board: BoardMaster = {
  bbsId: 'BBSMSTR_000000000001',
  bbsTtl: '공지사항',
  bbsTypeCd: 'BBST01',
  bbsAtrbCd: 'BBSA01',
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
      return Promise.resolve(board);
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

    it('searchKeyword/pageIndex/pageUnit와 config를 변형 없이 보존한다', async () => {
      const { signal } = new AbortController();
      const params = { searchCondition: '1', searchKeyword: '공지사항', pageIndex: 2, pageUnit: 20 };
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

      await expect(boardAdminService.createBoardMaster(board)).rejects.toThrow('게시판 식별자가 응답에 없습니다.');
    });

    it('필수 generated 요청 필드가 빠지면 네트워크 호출 전에 거부한다', async () => {
      await expect(boardAdminService.createBoardMaster({ bbsTtl: '누락' } as BoardMaster)).rejects.toThrow();
      await expect(boardAdminService.updateBoardMaster('BROKEN', { ...board, bbsTypeCd: undefined } as never)).rejects.toThrow();

      expect(client.post).not.toHaveBeenCalled();
      expect(client.put).not.toHaveBeenCalled();
    });

    it('게시판 수정은 bbsId를 경로 변수로 쓰고 generated 본문·config를 보존한다', async () => {
      const payload: BoardMaster = { ...board, bbsTtl: '수정된제목' };

      await boardAdminService.updateBoardMaster('BBSMSTR_000000000004', payload, { timeout: 2000 });
      expect(client.put).toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_000000000004',
        payload,
        { timeout: 2000 },
      );
    });

    it('수정 대상과 삭제 대상이 다르면 각자의 경로로만 나간다', async () => {
      const payload: BoardMaster = { ...board, bbsTtl: '수정' };
      await boardAdminService.updateBoardMaster('BBSMSTR_UPDATE_ONLY', payload);
      await boardAdminService.deleteBoardMaster('BBSMSTR_DELETE_ONLY');

      expect(client.put).toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_UPDATE_ONLY',
        payload,
        undefined,
      );
      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_DELETE_ONLY', undefined);
      expect(client.delete).not.toHaveBeenCalledWith(
        'admin/system/board-masters/BBSMSTR_UPDATE_ONLY',
        expect.anything(),
      );
    });
  });

  describe('삭제 (deleteBoardMaster / deleteBoardMasterPhysically)', () => {
    it('논리 삭제는 서버 인증 주체를 사용하므로 userId를 전송하지 않는다', async () => {
      await boardAdminService.deleteBoardMaster('BBSMSTR_000000000005');

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000005', undefined);
      // axios delete 는 (url, config) 2-인자 시그니처다 — 본문 자리에 config 가 밀려 들어가지 않는다.
      expect(client.delete.mock.calls[0]).toHaveLength(2);
    });

    it('논리 삭제 시 호출부 config가 그대로 유지된다', async () => {
      const { signal } = new AbortController();

      await boardAdminService.deleteBoardMaster('BBSMSTR_000000000005', { timeout: 3000, signal });

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000005', {
        timeout: 3000,
        signal,
      });
    });

    it('영구 물리삭제는 /physical 접미가 붙은 경로로만 나간다 — 접미가 빠지면 논리삭제와 구분되지 않는다', async () => {
      await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_000000000006');

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006/physical', undefined);
      expect(client.delete).not.toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006', undefined);
    });

    it('영구 물리삭제도 호출부 config 를 그대로 전달한다', async () => {
      await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_000000000006', { timeout: 60000 });

      expect(client.delete).toHaveBeenCalledWith('admin/system/board-masters/BBSMSTR_000000000006/physical', {
        timeout: 60000,
      });
    });
  });

  describe('일괄 처리 (batchUpdateBoardMasterStatus / batchDeleteBoardMastersPhysically)', () => {
    it('상태 일괄 변경은 /batch/status 로 bbsIds 와 useYn 을 함께 POST 한다', async () => {
      await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_A', 'BBSMSTR_B'], 'N');

      expect(client.post).toHaveBeenCalledWith(
        'admin/system/board-masters/batch/status',
        { bbsIds: ['BBSMSTR_A', 'BBSMSTR_B'], useYn: 'N' },
        undefined,
      );
    });

    it('영구 일괄 삭제는 /batch/delete 로 bbsIds 만 POST 하며 useYn 을 섞지 않는다', async () => {
      await boardAdminService.batchDeleteBoardMastersPhysically(['BBSMSTR_C'], { timeout: 60000 });

      expect(client.post).toHaveBeenCalledWith(
        'admin/system/board-masters/batch/delete',
        { bbsIds: ['BBSMSTR_C'] },
        { timeout: 60000 },
      );
    });

    it('서버와 같은 1..100개 generated 배열 경계를 네트워크 전에 집행한다', async () => {
      const tooMany = Array.from({ length: 101 }, (_, index) => `BBSMSTR_${index}`);

      await expect(boardAdminService.batchUpdateBoardMasterStatus([], 'N')).rejects.toThrow();
      await expect(boardAdminService.batchUpdateBoardMasterStatus(tooMany, 'N')).rejects.toThrow();
      await expect(boardAdminService.batchDeleteBoardMastersPhysically([])).rejects.toThrow();
      await expect(boardAdminService.batchDeleteBoardMastersPhysically(tooMany)).rejects.toThrow();
      expect(client.post).not.toHaveBeenCalled();
    });

    it('두 일괄 경로는 서로 뒤바뀌지 않는다 — 뒤바뀌면 비활성화 버튼이 영구 삭제를 실행한다', async () => {
      await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_A'], 'Y');
      await boardAdminService.batchDeleteBoardMastersPhysically(['BBSMSTR_B']);

      const calledPaths = client.post.mock.calls.map((call) => call[0]);
      expect(calledPaths).toEqual([
        'admin/system/board-masters/batch/status',
        'admin/system/board-masters/batch/delete',
      ]);
    });
  });

  describe('게시글 등록 (createBoardArticle) — 유일하게 basePath 를 타지 않는 경로', () => {
    beforeEach(() => client.post.mockResolvedValue(101));

    it('관리자 접두 없이 /bbs/{bbsId} 로 직접 나간다', async () => {
      await boardAdminService.createBoardArticle({
        bbsId: 'BBSMSTR_000000000001',
        pstTtl: '제목',
        pstCn: '본문',
      });

      const [url] = client.post.mock.calls[0] as [string];
      expect(url).toBe('/bbs/BBSMSTR_000000000001');
      // basePath 를 태우면 admin/system 접두가 붙어 백엔드 라우팅이 즉시 404 가 된다.
      expect(url).not.toContain('admin/system');
    });

    it('본문은 multipart/form-data 의 board 파트에 application/json Blob 으로 직렬화되어 실린다', async () => {
      const data = { bbsId: 'BBSMSTR_000000000001', pstTtl: '제목', pstCn: '본문' };

      await boardAdminService.createBoardArticle(data);

      const [, body, requestConfig] = client.post.mock.calls[0] as [string, FormData, AxiosRequestConfig];
      expect(body).toBeInstanceOf(FormData);
      expect(requestConfig.headers).toEqual({ 'Content-Type': 'multipart/form-data' });

      const part = body.get('board');
      expect(part).toBeInstanceOf(Blob);
      expect((part as Blob).type).toBe('application/json');
      // bbsId 를 포함한 원본 전체가 가공 없이 직렬화된다.
      await expect((part as Blob).text()).resolves.toBe(JSON.stringify(data));
    });

    it('호출부 헤더는 유지되고 Content-Type 만 multipart 로 덮어써지며 나머지 config 도 보존된다', async () => {
      const { signal } = new AbortController();

      await boardAdminService.createBoardArticle(
        { bbsId: 'BBSMSTR_000000000007', pstTtl: '제목', pstCn: '본문' },
        { timeout: 30000, signal, headers: { 'X-Trace-Id': 'trace-1', 'Content-Type': 'application/json' } },
      );

      expect(client.post).toHaveBeenCalledWith('/bbs/BBSMSTR_000000000007', expect.any(FormData), {
        timeout: 30000,
        signal,
        headers: { 'X-Trace-Id': 'trace-1', 'Content-Type': 'multipart/form-data' },
      });
    });

    it('단건 응답은 legacy nullable adapter 뒤 generated BoardMasterDto를 검증한다', async () => {
      await expect(boardAdminService.getBoardMaster('BBSMSTR_000000000001')).resolves.toEqual(board);

      const { atchPsbltyFileSz: _legacyNull, ...legacyBoard } = board;
      client.get.mockResolvedValueOnce({
        ...board,
        bbsExpln: null,
        tmpltId: null,
        atchPsbltyFileSz: null,
      });
      await expect(boardAdminService.getBoardMaster('BBSMSTR_NULLABLE')).resolves.toEqual(legacyBoard);

      client.get.mockResolvedValueOnce({ bbsId: 'BROKEN', bbsTtl: '필수 코드 누락' });
      await expect(boardAdminService.getBoardMaster('BROKEN')).rejects.toThrow();
    });

    it('생성 요청 스키마를 검증하고 ApiResponseLong의 식별자를 반환한다', async () => {
      await expect(boardAdminService.createBoardArticle({
        bbsId: 'BBSMSTR_000000000001',
        pstTtl: '제목',
        pstCn: '본문',
      })).resolves.toBe(101);

      await expect(boardAdminService.createBoardArticle({
        bbsId: 'BBSMSTR_000000000001',
        pstTtl: '',
        pstCn: '본문',
      })).rejects.toThrow();
      expect(client.post).toHaveBeenCalledTimes(1);
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
