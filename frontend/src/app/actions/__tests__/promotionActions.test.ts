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
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  },
}));

const ADMIN_PATH = '/admin/system/banner';
const AUTH = { headers: { Authorization: 'Bearer TOKEN-123' } };
const BANNER = {
  bnrSn: 1,
  bnrNm: '메인배너',
  linkUrl: '/',
  bnrImgNm: 'main.png',
  sortOrdr: 1,
  rfltYn: 'Y',
} as const;
const POPUP = {
  popupSn: 1,
  popupTtlNm: '공지',
  fileUrl: '/popup.png',
  popupWdthPstn: '0',
  popupVrtcPstn: '0',
  popupVrtcSz: '600',
  popupWdthSz: '800',
  ntceBgnde: '2026-08-01',
  ntceEndde: '2026-08-31',
  stopvewSetupYn: 'N',
  ntceYn: 'Y',
} as const;

function successEnvelope(data: unknown) {
  return { success: true, code: 'SUCCESS', message: '성공', data };
}

function withToken(token: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name === 'accessToken' && token ? { name, value: token } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('promotionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withToken('TOKEN-123');
    vi.mocked(client.requestRaw).mockImplementation(async (config: { method?: string }) => (
      successEnvelope(config.method === 'post' ? 1 : null)
    ));
  });

  describe('배너 저장', () => {
    it("mode='create' 는 POST 로 새로 만든다", async () => {
      const data = BANNER;

      const result = await saveBannerAction(null, { mode: 'create', data });

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/banners',
        method: 'post',
        data,
        ...AUTH,
      });
      expect(client.post).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: '배너가 등록되었습니다.' });
    });

    it("mode='edit' 는 PUT 으로 해당 id 만 덮어쓴다", async () => {
      const data = { ...BANNER, bnrNm: '수정배너' };

      const result = await saveBannerAction(null, { mode: 'edit', data, id: 7 });

      // 분기가 뒤집히면 수정이 신규 등록이 되어 **배너가 중복 노출**된다.
      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/banners/7',
        method: 'put',
        data,
        ...AUTH,
      });
      expect(client.put).not.toHaveBeenCalled();
      expect(result.message).toBe('배너가 수정되었습니다.');
    });

    it('저장은 관리자 화면과 공개 경로를 모두 재검증한다', async () => {
      await saveBannerAction(null, { mode: 'create', data: BANNER });

      // '/' 가 빠지면 등록한 배너가 **공개 첫 화면에 나타나지 않는다.**
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('토큰이 없으면 빈 설정으로 호출한다', async () => {
      withToken(undefined);

      await saveBannerAction(null, { mode: 'create', data: BANNER });

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/banners',
        method: 'post',
        data: BANNER,
      });
    });

    it('실패는 throw 하지 않고 메시지로 돌려주며 재검증하지 않는다', async () => {
      vi.mocked(client.requestRaw).mockRejectedValueOnce({
        response: { data: { message: '이미지 용량이 초과되었습니다.' } },
      });

      const result = await saveBannerAction(null, { mode: 'create', data: BANNER });

      expect(result).toEqual({ success: false, message: '이미지 용량이 초과되었습니다.' });
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('검증 실패의 fieldErrors를 클라이언트 폼까지 보존한다', async () => {
      vi.mocked(client.requestRaw).mockRejectedValueOnce({
        response: {
          data: {
            message: '입력값을 확인하세요.',
            errors: [{ field: 'bnrNm', message: '배너 명칭이 중복되었습니다.' }],
          },
        },
      });

      const result = await saveBannerAction(null, { mode: 'create', data: BANNER });

      expect(result).toEqual({
        success: false,
        message: '입력값을 확인하세요.',
        fieldErrors: { bnrNm: '배너 명칭이 중복되었습니다.' },
      });
    });
  });

  describe('배너 삭제', () => {
    it('id 로 삭제하고 관리자 화면을 재검증한다', async () => {
      const result = await deleteBannerAction(null, 7);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/banners/7',
        method: 'delete',
        ...AUTH,
      });
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(result.success).toBe(true);
    });

    it("삭제도 공개 경로('/')를 재검증한다 — 지운 배너가 첫 화면에 남으면 안 된다", async () => {
      await deleteBannerAction(null, 7);

      // [2026-08-09 정정] 종전에는 저장만 '/' 를 재검증하고 삭제는 하지 않는 비대칭이 있었다.
      //   그래서 배너를 지워도 공개 첫 화면에는 캐시가 만료될 때까지 계속 보였다.
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('삭제 실패는 메시지로 돌려준다', async () => {
      vi.mocked(client.requestRaw).mockRejectedValueOnce({});

      const result = await deleteBannerAction(null, 7);

      expect(result).toEqual({ success: false, message: '삭제 중 오류 발생' });
    });
  });

  describe('팝업', () => {
    it("mode 에 따라 POST/PUT 을 가른다", async () => {
      await savePopupAction(null, { mode: 'create', data: POPUP });
      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/popups',
        method: 'post',
        data: POPUP,
        ...AUTH,
      });

      vi.clearAllMocks();
      withToken('TOKEN-123');

      await savePopupAction(null, { mode: 'edit', data: POPUP, id: 3 });
      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/popups/3',
        method: 'put',
        data: POPUP,
        ...AUTH,
      });
      expect(client.put).not.toHaveBeenCalled();
    });

    it('팝업 저장도 공개 경로를 재검증한다', async () => {
      await savePopupAction(null, { mode: 'create', data: POPUP });

      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('팝업 삭제도 공개 경로를 재검증한다', async () => {
      await deletePopupAction(null, 3);

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'admin/system/popups/3',
        method: 'delete',
        ...AUTH,
      });
      expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PATH);
      expect(revalidatePath).toHaveBeenCalledWith('/');
    });

    it('팝업 저장 실패는 메시지로 돌려준다', async () => {
      vi.mocked(client.requestRaw).mockRejectedValueOnce({ response: { data: { message: '기간이 잘못되었습니다.' } } });

      const result = await savePopupAction(null, { mode: 'create', data: POPUP });

      expect(result).toEqual({ success: false, message: '기간이 잘못되었습니다.' });
    });

    it('팝업 검증 실패도 fieldErrors를 보존한다', async () => {
      vi.mocked(client.requestRaw).mockRejectedValueOnce({
        response: {
          data: {
            message: '입력값을 확인하세요.',
            errors: [{ field: 'ntceEndde', message: '종료일을 확인하세요.' }],
          },
        },
      });

      const result = await savePopupAction(null, { mode: 'create', data: POPUP });

      expect(result).toEqual({
        success: false,
        message: '입력값을 확인하세요.',
        fieldErrors: { ntceEndde: '종료일을 확인하세요.' },
      });
    });
  });
});
