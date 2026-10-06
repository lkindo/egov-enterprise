/**
 * 남은 서버 액션(댓글) 테스트.
 *
 * [2026-10-02 D2] 메뉴 액션(saveMenuAction·updateMenuOrdersAction·deleteMenuAction)은 메뉴 화면이 메뉴 구조 한 번 저장
 * (menuAdminService.saveMenuStructure)으로 바뀌며 소비처가 없어져 파일째 지웠다. 그 테스트도 함께 걷었다 — 같은 의미(인증·
 * 실패를 메시지로·재조회)는 MenuAdminClient 저장 테스트가 새 경로로 본다.
 *
 * [2026-08-09 신설] 세 파일 모두 커버리지가 거의 0% 였다(합계 109줄).
 *
 * 앞선 PR 들에서 코드·배너·팝업 액션을 덮었고, 이것으로 `app/actions` 가 마무리된다.
 * 표적은 같다 — **예외가 나지 않고 조용히 어긋나는** 것들:
 *   · 인증 헤더 전파(빠지면 401, 화면엔 "실패" 로만 보인다)
 *   · 생성/수정 분기(뒤집히면 수정이 생성이 되어 중복 행이 남는다)
 *   · revalidatePath(빠지면 저장은 됐는데 목록이 옛 데이터를 보여준다)
 *   · 오류를 throw 하지 않고 메시지로 돌려주는가(throw 하면 Next 가 500 을 낸다)
 *
 * <p>⚠ 댓글 액션에는 **성공 판정의 비대칭**이 있다 — 아래 해당 테스트에 기록했다.
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createComment, deleteComment, updateComment } from '../commentActions';
import { commentService } from '@/services/business/comment/commentService';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/services/business/comment/commentService', () => ({
  commentService: {
    createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(),
  },
}));

const AUTH = { headers: { Authorization: 'Bearer TOKEN-123' } };

function withToken(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'accessToken' && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

function form(entries: Record<string, string>) {
  const fd = new FormData();
  Object.entries(entries).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe('남은 서버 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withToken('TOKEN-123');
  });

  describe('댓글', () => {
    it('빈 내용은 요청하지 않고 즉시 거절한다', async () => {
      const result = await createComment(null, form({ pstSn: '1', bbsId: 'B1', ansCn: '   ' }));

      // 공백만 있는 댓글을 서버로 보내면 빈 댓글이 목록에 쌓인다.
      expect(result).toEqual({
        success: false,
        message: '댓글 내용을 입력해주세요.',
        fieldErrors: { ansCn: '댓글 내용을 입력해주세요.' },
      });
      expect(commentService.createComment).not.toHaveBeenCalled();
    });

    it('등록은 세 필드를 실어 보내고 목록을 재검증한다', async () => {
      vi.mocked(commentService.createComment).mockResolvedValueOnce(1);

      const result = await createComment(null, form({ pstSn: '1', bbsId: 'B1', ansCn: '내용' }));

      expect(commentService.createComment).toHaveBeenCalledWith(
        { pstSn: 1, bbsId: 'B1', ansCn: '내용' }, AUTH);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/detail');
      expect(result.success).toBe(true);
    });

    it('본문 없이 성공한 응답도 성공으로 본다 — 실패로 오독하면 사용자가 다시 눌러 중복된다', async () => {
      // [2026-08-09 정정] 종전에는 `if (response)` 로 판정해 백엔드가 본문 없이 성공하면
      //   null 이 되어 **성공을 실패로 보고**했다. 사용자는 다시 누르고, 댓글이 두 개 달렸다.
      //   client 는 실패 시 반드시 예외를 던지므로(인터셉터 reject + 생성 API 경계의 envelope 검증 throw),
      //   await 다음 줄에 도달했다면 이미 성공이다.
      vi.mocked(commentService.createComment).mockResolvedValueOnce(1);

      const result = await createComment(null, form({ pstSn: '1', bbsId: 'B1', ansCn: '내용' }));

      expect(result).toEqual({ success: true, message: '댓글이 등록되었습니다.' });
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/detail');
    });

    it('수정도 본문 없는 성공을 성공으로 본다', async () => {
      vi.mocked(commentService.updateComment).mockResolvedValueOnce();

      const result = await updateComment(null, form({
        id: '11', bbsId: 'B1', pstSn: '1', ansCn: '고친 내용',
      }));

      expect(result.success).toBe(true);
    });

    it('삭제는 본문이 없어도(undefined 가 아니면) 성공으로 본다', async () => {
      vi.mocked(commentService.deleteComment).mockResolvedValueOnce();

      const result = await deleteComment(null, form({ id: '11', bbsId: 'B1', pstSn: '1' }));

      expect(commentService.deleteComment).toHaveBeenCalledWith(11, AUTH);
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith(
        '/admin/community/boards/detail?bbsId=B1&pstSn=1');
    });

    it('수정은 대상 id 를 URL 에, 나머지를 본문에 싣는다', async () => {
      vi.mocked(commentService.updateComment).mockResolvedValueOnce();

      const result = await updateComment(null, form({
        id: '11', bbsId: 'B1', pstSn: '1', ansCn: '고친 내용',
      }));

      // id 가 본문으로 새면 엉뚱한 댓글을 덮어쓴다.
      expect(commentService.updateComment).toHaveBeenCalledWith(
        11, { pstSn: 1, bbsId: 'B1', ansCn: '고친 내용' }, AUTH);
      expect(result.success).toBe(true);
    });

    it('수정도 빈 내용을 막는다', async () => {
      const result = await updateComment(null, form({ id: '11', bbsId: 'B1', pstSn: '1', ansCn: '' }));

      expect(result.success).toBe(false);
      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it('백엔드 오류는 throw 하지 않고 메시지로 돌려준다', async () => {
      vi.mocked(commentService.createComment).mockRejectedValueOnce({
        response: {
          data: {
            message: '삭제된 게시글입니다.',
            errors: [{ field: 'ansCn', message: '댓글 형식을 확인해 주세요.' }],
          },
        },
      });

      const result = await createComment(null, form({ pstSn: '1', bbsId: 'B1', ansCn: '내용' }));

      // 서버 액션이 throw 하면 Next 가 500 을 내고 사용자는 이유를 못 본다.
      expect(result).toEqual({
        success: false,
        message: '삭제된 게시글입니다.',
        fieldErrors: { ansCn: '댓글 형식을 확인해 주세요.' },
      });
    });

    it('토큰이 없으면 빈 설정으로 호출한다', async () => {
      withToken(undefined);
      vi.mocked(commentService.createComment).mockResolvedValueOnce(1);

      await createComment(null, form({ pstSn: '1', bbsId: 'B1', ansCn: '내용' }));

      expect(commentService.createComment).toHaveBeenCalledWith(expect.anything(), {});
    });
  });
});
