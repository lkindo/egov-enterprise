import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { boardAdminService, type BoardMaster } from '../BoardAdminService';
import { hpcmAdminService } from '../HpcmAdminService';
import { loginPolicyAdminService } from '../LoginPolicyAdminService';
import { popupAdminService } from '../PopupAdminService';

const successEnvelope = (data: unknown) => ({
  success: true,
  code: 'S000',
  message: '성공',
  data,
});

const board: BoardMaster = {
  bbsTtl: '공지사항',
  bbsTypeCd: 'BBST01',
  bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_HUB',
  atchPsbltyFileSz: 1024,
  useYn: 'Y',
};
const popup = { popupSn: 2, popupTtlNm: '점검 안내' };
const hpcm = { hlpSn: 3, hlpSeCd: '001', hlpDfn: '정의', hlpExpln: '설명' };

describe('generated admin boundary wave 4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockImplementation((url: string) => {
      if (url.endsWith('/deletable')) return Promise.resolve(successEnvelope(false));
      if (url.includes('popups/')) return Promise.resolve(successEnvelope(popup));
      if (url.includes('help/hpcm/')) return Promise.resolve(successEnvelope(hpcm));
      if (url.includes('login-policies/')) {
        return Promise.resolve(successEnvelope({ userId: 'USER01' }));
      }
      return Promise.resolve(successEnvelope({ list: [], total: 0, page: 1, size: 10, totalPage: 0 }));
    });
    client.requestRaw.mockImplementation(({ url, method }: { url: string; method: string }) => {
      if (url === 'admin/system/board-masters' && method === 'post') {
        return Promise.resolve(successEnvelope('BBSMSTR_CREATED'));
      }
      if (url === 'admin/system/popups' && method === 'post') {
        return Promise.resolve(successEnvelope(2));
      }
      if (url === 'help/hpcm' && method === 'post') {
        return Promise.resolve(successEnvelope(3));
      }
      return Promise.resolve(successEnvelope(null));
    });
  });

  it('OpenAPI 충돌 3개를 제외한 21개 경계를 generated transport로 실행한다', async () => {
    await popupAdminService.getPopupList({ page: 1, size: 10, searchWrd: '점검' });
    await popupAdminService.getPopup(2);
    await popupAdminService.createPopup({ popupTtlNm: popup.popupTtlNm });
    await popupAdminService.updatePopup(2, { popupTtlNm: popup.popupTtlNm });
    await popupAdminService.deletePopup(2);

    await hpcmAdminService.getHpcmList({ page: 1, size: 10, searchWrd: '정의' });
    await hpcmAdminService.getHpcm(3);
    await hpcmAdminService.createHpcm(hpcm);
    await hpcmAdminService.updateHpcm(3, hpcm);
    await hpcmAdminService.deleteHpcm(3);

    await loginPolicyAdminService.getLoginPolicyList({ page: 1, size: 20, searchWrd: '홍길동' });
    await loginPolicyAdminService.getLoginPolicy('USER01');
    await loginPolicyAdminService.saveLoginPolicy('USER01', { lmtYn: 'Y' });
    await loginPolicyAdminService.deleteLoginPolicy('USER01');

    await boardAdminService.createBoardMaster(board);
    await boardAdminService.updateBoardMaster('BBSMSTR_1', {
      bbsTtl: board.bbsTtl, atchPsbltyFileSz: board.atchPsbltyFileSz, useYn: board.useYn, version: 0,
    });
    await boardAdminService.isBoardMasterDeletable('BBSMSTR_1');
    await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_1');
    await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_1'], 'N');

    // 호출 수는 위에서 부른 경계 그대로다. 투표 관리 화면은 /api/v1/polls(PollUserService)라 business 경계 테스트가 본다.
    expect(client.getRaw).toHaveBeenCalledTimes(7);
    expect(client.requestRaw).toHaveBeenCalledTimes(12);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/login-policies', {
      params: { page: 1, size: 20, searchKeyword: '홍길동' },
    });
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/login-policies/USER01',
      method: 'put',
      data: { lmtYn: 'Y', userId: 'USER01' },
    });
  });

  it('generated request와 response가 맞지 않으면 transport 경계에서 fail-closed한다', async () => {
    await expect(popupAdminService.createPopup({ popupSn: 2 } as never)).rejects.toThrow(
      '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
    );
    await expect(hpcmAdminService.createHpcm({ hlpSeCd: '001' } as never)).rejects.toThrow(
      '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
    );
    await expect(boardAdminService.createBoardMaster({ bbsTtl: '누락' } as BoardMaster))
      .rejects.toThrow('생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.');
    expect(client.requestRaw).not.toHaveBeenCalled();

    client.getRaw.mockResolvedValueOnce(successEnvelope({ popupTtlNm: 42 }));
    await expect(popupAdminService.getPopup(2)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });
});
