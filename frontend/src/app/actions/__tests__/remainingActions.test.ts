/**
 * 남은 서버 액션(댓글·메뉴·네트워크) 테스트.
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
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '../menuActions';
import { saveNetworkAction, deleteNetworkAction } from '../networkActions';
import client from '@/lib/api/client';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { networkAdminService } from '@/services/foundation/system/NetworkAdminService';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: {
    createMenu: vi.fn(), updateMenu: vi.fn(), updateMenuOrder: vi.fn(), deleteMenu: vi.fn(),
  },
}));
vi.mock('@/services/foundation/system/NetworkAdminService', () => ({
  networkAdminService: { createNetwork: vi.fn(), updateNetwork: vi.fn(), deleteNetwork: vi.fn() },
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
      const result = await createComment(null, form({ pstId: 'P1', bbsId: 'B1', ansCn: '   ' }));

      // 공백만 있는 댓글을 서버로 보내면 빈 댓글이 목록에 쌓인다.
      expect(result).toEqual({ success: false, message: '댓글 내용을 입력해주세요.' });
      expect(client.post).not.toHaveBeenCalled();
    });

    it('등록은 세 필드를 실어 보내고 목록을 재검증한다', async () => {
      vi.mocked(client.post).mockResolvedValueOnce({ id: 1 } as never);

      const result = await createComment(null, form({ pstId: 'P1', bbsId: 'B1', ansCn: '내용' }));

      expect(client.post).toHaveBeenCalledWith(
        '/comments', { pstId: 'P1', bbsId: 'B1', ansCn: '내용' }, AUTH);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/community/boards/detail');
      expect(result.success).toBe(true);
    });

    it('⚠ 현행 거동 고정: 등록 응답이 falsy 면 성공해도 실패로 보고한다', async () => {
      // client.post 는 ApiResponse 의 data 를 벗겨서 준다. 백엔드가 본문 없이 성공하면
      //   여기서 null/undefined 가 되고, `if (response)` 는 그것을 실패로 읽는다.
      //   → 댓글은 실제로 등록됐는데 화면에는 "댓글 등록에 실패했습니다" 가 뜬다.
      //
      //   ⚠ 삭제는 `response !== undefined` 로 판정해 이 문제가 없다 — **셋의 판정이 비대칭이다.**
      //   거동 변경은 이 PR(테스트 보강)의 범위가 아니라 현행을 고정만 한다.
      vi.mocked(client.post).mockResolvedValueOnce(null as never);

      const result = await createComment(null, form({ pstId: 'P1', bbsId: 'B1', ansCn: '내용' }));

      expect(result).toEqual({ success: false, message: '댓글 등록에 실패했습니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('삭제는 본문이 없어도(undefined 가 아니면) 성공으로 본다', async () => {
      vi.mocked(client.delete).mockResolvedValueOnce(null as never);

      const result = await deleteComment(null, form({ id: 'C1', bbsId: 'B1', pstId: 'P1' }));

      expect(client.delete).toHaveBeenCalledWith('/comments/C1', AUTH);
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith(
        '/admin/community/boards/detail?bbsId=B1&pstId=P1');
    });

    it('수정은 대상 id 를 URL 에, 나머지를 본문에 싣는다', async () => {
      vi.mocked(client.put).mockResolvedValueOnce({ ok: true } as never);

      const result = await updateComment(null, form({
        id: 'C1', bbsId: 'B1', pstId: 'P1', ansCn: '고친 내용',
      }));

      // id 가 본문으로 새면 엉뚱한 댓글을 덮어쓴다.
      expect(client.put).toHaveBeenCalledWith(
        '/comments/C1', { pstId: 'P1', bbsId: 'B1', ansCn: '고친 내용' }, AUTH);
      expect(result.success).toBe(true);
    });

    it('수정도 빈 내용을 막는다', async () => {
      const result = await updateComment(null, form({ id: 'C1', bbsId: 'B1', pstId: 'P1', ansCn: '' }));

      expect(result.success).toBe(false);
      expect(client.put).not.toHaveBeenCalled();
    });

    it('백엔드 오류는 throw 하지 않고 메시지로 돌려준다', async () => {
      vi.mocked(client.post).mockRejectedValueOnce({
        response: { data: { message: '삭제된 게시글입니다.' } },
      });

      const result = await createComment(null, form({ pstId: 'P1', bbsId: 'B1', ansCn: '내용' }));

      // 서버 액션이 throw 하면 Next 가 500 을 내고 사용자는 이유를 못 본다.
      expect(result).toEqual({ success: false, message: '삭제된 게시글입니다.' });
    });

    it('토큰이 없으면 빈 설정으로 호출한다', async () => {
      withToken(undefined);
      vi.mocked(client.post).mockResolvedValueOnce({ id: 1 } as never);

      await createComment(null, form({ pstId: 'P1', bbsId: 'B1', ansCn: '내용' }));

      expect(client.post).toHaveBeenCalledWith('/comments', expect.anything(), {});
    });
  });

  describe('메뉴', () => {
    it("mode='create' 는 생성, 'edit' 은 menuNo 로 수정한다", async () => {
      await saveMenuAction(null, { mode: 'create', data: { menuNm: '신규' } as never });
      expect(menuAdminService.createMenu).toHaveBeenCalledWith({ menuNm: '신규' }, AUTH);
      expect(menuAdminService.updateMenu).not.toHaveBeenCalled();

      vi.clearAllMocks();
      withToken('TOKEN-123');

      await saveMenuAction(null, { mode: 'edit', data: { menuNo: 7, menuNm: '수정' } as never });
      // 분기가 뒤집히면 수정이 신규 등록이 되어 **메뉴가 중복 노출**된다.
      expect(menuAdminService.updateMenu).toHaveBeenCalledWith(7, { menuNo: 7, menuNm: '수정' }, AUTH);
      expect(menuAdminService.createMenu).not.toHaveBeenCalled();
    });

    it('저장 후 메뉴 목록을 재검증한다', async () => {
      await saveMenuAction(null, { mode: 'create', data: {} as never });

      // 빠지면 메뉴를 추가했는데 좌측 네비게이션에 나타나지 않는다.
      expect(revalidatePath).toHaveBeenCalledWith('/admin/system/menus');
    });

    it('순서 저장은 배열을 그대로 넘기고 재검증한다', async () => {
      const menus = [{ menuNo: 1 }, { menuNo: 2 }] as never;

      const result = await updateMenuOrdersAction(menus);

      expect(menuAdminService.updateMenuOrder).toHaveBeenCalledWith(menus, AUTH);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/system/menus');
      expect(result).toEqual({ success: true, message: '순서가 저장되었습니다.' });
    });

    it('삭제는 id 를 넘기고 재검증한다', async () => {
      const result = await deleteMenuAction(null, 7);

      expect(menuAdminService.deleteMenu).toHaveBeenCalledWith(7, AUTH);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/system/menus');
      expect(result.success).toBe(true);
    });

    it('실패는 메시지로 돌려주고 재검증하지 않는다', async () => {
      vi.mocked(menuAdminService.createMenu).mockRejectedValueOnce({
        response: { data: { message: '상위 메뉴가 없습니다.' } },
      });

      const result = await saveMenuAction(null, { mode: 'create', data: {} as never });

      expect(result).toEqual({ success: false, message: '상위 메뉴가 없습니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('네트워크', () => {
    const FIELDS = {
      manageIem: '본관 스위치', ntwrkIp: '10.0.0.1', gtwy: '10.0.0.254',
      subnet: '255.255.255.0', domnServer: 'dns.local', userNm: '관리자', useYn: 'Y',
    };

    it('ntwrkId 가 없으면 생성한다', async () => {
      const result = await saveNetworkAction(null, form(FIELDS));

      expect(networkAdminService.createNetwork).toHaveBeenCalledWith(FIELDS, AUTH);
      expect(networkAdminService.updateNetwork).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('ntwrkId 가 있으면 그 id 로 수정한다', async () => {
      await saveNetworkAction(null, form({ ...FIELDS, ntwrkId: 'N7' }));

      // 분기가 뒤집히면 수정이 신규 등록이 되어 같은 장비가 두 줄로 남는다.
      expect(networkAdminService.updateNetwork).toHaveBeenCalledWith('N7', FIELDS, AUTH);
      expect(networkAdminService.createNetwork).not.toHaveBeenCalled();
    });

    it('ntwrkId 는 전송 본문에 섞이지 않는다', async () => {
      await saveNetworkAction(null, form({ ...FIELDS, ntwrkId: 'N7' }));

      const [, payload] = vi.mocked(networkAdminService.updateNetwork).mock.calls[0];
      expect(payload).not.toHaveProperty('ntwrkId');
    });

    it('저장·삭제 모두 목록을 재검증한다', async () => {
      await saveNetworkAction(null, form(FIELDS));
      expect(revalidatePath).toHaveBeenCalledWith('/admin/system/network');

      vi.clearAllMocks();
      withToken('TOKEN-123');

      const result = await deleteNetworkAction('N7');
      expect(networkAdminService.deleteNetwork).toHaveBeenCalledWith('N7', AUTH);
      expect(revalidatePath).toHaveBeenCalledWith('/admin/system/network');
      expect(result.success).toBe(true);
    });

    it('실패는 메시지로 돌려준다', async () => {
      vi.mocked(networkAdminService.deleteNetwork).mockRejectedValueOnce({});

      const result = await deleteNetworkAction('N7');

      expect(result).toEqual({ success: false, message: '삭제 중 오류 발생' });
    });
  });
});
