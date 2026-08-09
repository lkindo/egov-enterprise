/**
 * promotionActions(배너·팝업) 서버 액션 테스트.
 *
 * [2026-08-09 신설] 커버리지 0% 였다(47줄 전량 미커버).
 *
 * 배너·팝업은 **공개 사이트 첫 화면에 노출되는 콘텐츠**다. 그래서 이 액션들에는
 * 다른 관리 화면에 없는 부담이 하나 더 있다 — 관리자 화면뿐 아니라
 * **공개 경로('/')의 캐시도 무효화**해야 한다.
 *
 * 여기서 조용히 틀어질 수 있는 것:
 *   ① mode 분기('create'/'edit') — 뒤집히면 수정이 신규 등록이 되어 **배너가 중복 노출**된다.
 *   ② 수정 시 URL 의 id — 빠지면 엉뚱한 배너를 덮어쓴다.
 *   ③ revalidatePath('/') — 빠지면 저장/삭제가 **공개 화면에 반영되지 않는다.**
 *   ④ 인증 헤더 — 빠지면 401.
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  saveBannerAction, deleteBannerAction, savePopupAction, deletePopupAction,
} from '../promotionActions';
import client from '@/lib/api/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  default: { post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const ADMIN_PATH = '/admin/system/banner';
const AUTH = { headers: { Authorization: 'Bearer TOKEN-123' } };

function withToken(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'accessToken' && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('promotionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withToken('TOKEN-123');
  });

  describe('배너 저장', () => {
    it("mode='create' 는 POST 로 새로 만든다", async () => {
      const data = { bnnrNm: '메인배너' } as never;

      const result = await saveBannerAction(null, { mode: 'create', data });

      expect(client.post).toHaveBeenCalledWith('/admin/system/banners', data, AUTH);
      expect(client.put).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: '배너가 등록되었습니다.' });
    });

    it("mode='edit' 는 PUT 으로 해당 id 만 덮어쓴다", async () => {
      const data = { bnnrNm: '수정배너' } as never;

      const result = await saveBannerAction(null, { mode: 'edit', data, id: 'B7' });

      // 분기가 뒤집히면 수정이 신규 등록이 되어 **배너가 중복 노출**된다.
      expect(client.put).toHaveBeenCalledWith('/admin/system/banners/B7', data, AUTH);
      expect(client.post).not.toHaveBeenCalled();
      expect(result.message).toBe('배너가 수정되었습니다.');
    });

    it('저장은 관리자 화면과 공개 경로를 모두 재검증한다', async () => {
      await saveBannerAction(null, { mode: 'create', data: {} as never });

      // '/' 가 빠지면 등록한 배너가 **공개 첫 화면에 나타나지 않는다.**
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('토큰이 없으면 빈 설정으로 호출한다', async () => {
      withToken(undefined);

      await saveBannerAction(null, { mode: 'create', data: {} as never });

      expect(client.post).toHaveBeenCalledWith('/admin/system/banners', {}, {});
    });

    it('실패는 throw 하지 않고 메시지로 돌려주며 재검증하지 않는다', async () => {
      vi.mocked(client.post).mockRejectedValueOnce({
        response: { data: { message: '이미지 용량이 초과되었습니다.' } },
      });

      const result = await saveBannerAction(null, { mode: 'create', data: {} as never });

      expect(result).toEqual({ success: false, message: '이미지 용량이 초과되었습니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('배너 삭제', () => {
    it('id 로 삭제하고 관리자 화면을 재검증한다', async () => {
      const result = await deleteBannerAction(null, 'B7');

      expect(client.delete).toHaveBeenCalledWith('/admin/system/banners/B7', AUTH);
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(result.success).toBe(true);
    });

    it("⚠ 현행 거동 고정: 삭제는 공개 경로('/')를 재검증하지 않는다", async () => {
      await deleteBannerAction(null, 'B7');

      // ⚠ 저장(save)은 '/' 를 재검증하는데 삭제는 하지 않는다 — **비대칭이다.**
      //   그래서 배너를 지워도 공개 첫 화면에는 캐시가 만료될 때까지 계속 보인다.
      //   이것은 올바른 거동이 아니라 **현행을 기록한 것**이다.
      //   고칠 때 이 단언을 함께 바꾸면 의도적 변경임이 드러난다.
      expect(revalidatePath).not.toHaveBeenCalledWith('/');
    });

    it('삭제 실패는 메시지로 돌려준다', async () => {
      vi.mocked(client.delete).mockRejectedValueOnce({});

      const result = await deleteBannerAction(null, 'B7');

      expect(result).toEqual({ success: false, message: '삭제 중 오류 발생' });
    });
  });

  describe('팝업', () => {
    it("mode 에 따라 POST/PUT 을 가른다", async () => {
      await savePopupAction(null, { mode: 'create', data: { popupNm: '공지' } as never });
      expect(client.post).toHaveBeenCalledWith('/admin/system/popups', { popupNm: '공지' }, AUTH);

      vi.clearAllMocks();
      withToken('TOKEN-123');

      await savePopupAction(null, { mode: 'edit', data: {} as never, id: 'P3' });
      expect(client.put).toHaveBeenCalledWith('/admin/system/popups/P3', {}, AUTH);
      expect(client.post).not.toHaveBeenCalled();
    });

    it('팝업 저장도 공개 경로를 재검증한다', async () => {
      await savePopupAction(null, { mode: 'create', data: {} as never });

      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it("⚠ 현행 거동 고정: 팝업 삭제도 공개 경로를 재검증하지 않는다", async () => {
      await deletePopupAction(null, 'P3');

      expect(client.delete).toHaveBeenCalledWith('/admin/system/popups/P3', AUTH);
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      // 배너와 같은 비대칭이다 — 지운 팝업이 공개 화면에 계속 뜬다.
      expect(revalidatePath).not.toHaveBeenCalledWith('/');
    });

    it('팝업 저장 실패는 메시지로 돌려준다', async () => {
      vi.mocked(client.post).mockRejectedValueOnce({ response: { data: { message: '기간이 잘못되었습니다.' } } });

      const result = await savePopupAction(null, { mode: 'create', data: {} as never });

      expect(result).toEqual({ success: false, message: '기간이 잘못되었습니다.' });
    });
  });
});
