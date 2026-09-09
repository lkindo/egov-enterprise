import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { boardAdminService, type BoardMaster } from '../BoardAdminService';
import { hpcmAdminService } from '../HpcmAdminService';
import { loginPolicyAdminService } from '../LoginPolicyAdminService';
import { networkAdminService } from '../NetworkAdminService';
import { popupAdminService } from '../PopupAdminService';
import { programAdminService } from '../ProgramAdminService';

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
      if (url.includes('programs/')) return Promise.resolve(successEnvelope({ prgrmFileNm: 'menu.do' }));
      if (url.includes('popups/')) return Promise.resolve(successEnvelope(popup));
      if (url.includes('help/hpcm/')) return Promise.resolve(successEnvelope(hpcm));
      if (url.includes('login-policies/')) {
        return Promise.resolve(successEnvelope({ userId: 'USER01' }));
      }
      return Promise.resolve(successEnvelope({ list: [] }));
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

  it('OpenAPI 충돌 3개를 제외한 34개 경계를 generated transport로 실행한다', async () => {
    await programAdminService.getProgramList({ page: 1, size: 20, searchWrd: '메뉴' });
    await programAdminService.getProgram('menu.do');
    await programAdminService.createProgram({ prgrmFileNm: 'menu.do' });
    await programAdminService.updateProgram('menu.do', { prgrmKornNm: '메뉴' });
    await programAdminService.deleteProgram('menu.do');

    await popupAdminService.getPopupList({ page: 0, size: 10, searchWrd: '점검' });
    await popupAdminService.getPopup(2);
    await popupAdminService.createPopup(popup);
    await popupAdminService.updatePopup(2, popup);
    await popupAdminService.deletePopup(2);

    await hpcmAdminService.getHpcmList({ page: 0, size: 10, searchWrd: '정의' });
    await hpcmAdminService.getHpcm(3);
    await hpcmAdminService.createHpcm(hpcm);
    await hpcmAdminService.updateHpcm(3, hpcm);
    await hpcmAdminService.deleteHpcm(3);

    await networkAdminService.getNetworks({ page: 0, size: 100 });
    await networkAdminService.createNetwork({ manageIem: '라우터' });
    await networkAdminService.updateNetwork('N1', { manageIem: '코어 라우터' });
    await networkAdminService.deleteNetwork('N1');

    await loginPolicyAdminService.getLoginPolicyList({ page: 0, size: 20, searchWrd: '홍길동' });
    await loginPolicyAdminService.getLoginPolicy('USER01');
    await loginPolicyAdminService.saveLoginPolicy('USER01', { lmtYn: 'Y' });
    await loginPolicyAdminService.deleteLoginPolicy('USER01');

    await boardAdminService.createBoardMaster(board);
    await boardAdminService.updateBoardMaster('BBSMSTR_1', board);
    await boardAdminService.deleteBoardMaster('BBSMSTR_1');
    await boardAdminService.isBoardMasterDeletable('BBSMSTR_1');
    await boardAdminService.deleteBoardMasterPhysically('BBSMSTR_1');
    await boardAdminService.batchUpdateBoardMasterStatus(['BBSMSTR_1'], 'N');
    await boardAdminService.batchDeleteBoardMastersPhysically(['BBSMSTR_1']);

    // [2026-09-06 DEC-OPS-041] 12/22 → 10/20: 중복 관리 컨트롤러(/admin/system/polls)와 OnlinePollAdminService 가 제거됐다
    //   (목록·상세 GET 2, 등록·투표 POST 2). 투표 관리 화면은 /api/v1/polls(PollUserService, business 경계 테스트)를 쓴다.
    expect(client.getRaw).toHaveBeenCalledTimes(10);
    expect(client.requestRaw).toHaveBeenCalledTimes(20);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/programs', {
      params: { pageIndex: 2, pageUnit: 20, searchKeyword: '메뉴' },
    });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/ntwrksvc-monitoring', {
      params: { pageIndex: 1, pageUnit: 100 },
    });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/login-policies', {
      params: { pageIndex: 1, pageUnit: 20, searchKeyword: '홍길동' },
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
