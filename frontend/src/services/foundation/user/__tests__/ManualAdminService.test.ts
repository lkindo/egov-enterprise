import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { manualAdminService, type ManualDto } from '../ManualAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

const makeManual = (overrides: Partial<ManualDto> = {}): ManualDto => ({
  onlnMnlNm: '사용자 매뉴얼',
  onlnMnlSeCd: 'GNR',
  onlnMnlDfn: '/docs/user-manual.pdf',
  onlnMnlExpln: '사용자용 온라인 매뉴얼',
  ...overrides,
});

const emptyPage = {
  list: [],
  total: 0,
  page: 0,
  size: 10,
  totalPage: 0,
};

describe('ManualAdminService generated operation 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(success(emptyPage));
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('목록 조회는 OpenAPI의 keyword/page/size/sort 이름을 그대로 사용한다', async () => {
    await manualAdminService.getManualList({
      keyword: '결재',
      page: 0,
      size: 20,
      sort: ['onlnMnlSn,desc'],
    });

    expect(client.getRaw).toHaveBeenCalledWith('help/manuals', {
      params: {
        keyword: '결재',
        page: 0,
        size: 20,
        sort: ['onlnMnlSn,desc'],
      },
    });
  });

  it('검색 조건을 생략하면 generated query의 빈 객체를 전달한다', async () => {
    await manualAdminService.getManualList();

    expect(client.getRaw).toHaveBeenCalledWith('help/manuals', { params: {} });
  });

  it('상세 조회 경로와 호출부 config를 보존한다', async () => {
    const manual = makeManual({ onlnMnlSn: 42 });
    const { signal } = new AbortController();
    client.getRaw.mockResolvedValueOnce(success(manual));

    await expect(manualAdminService.getManual(42, { timeout: 3000, signal }))
      .resolves.toStrictEqual(manual);
    expect(client.getRaw).toHaveBeenCalledWith('help/manuals/42', { timeout: 3000, signal });
  });

  it('등록 본문을 exact operation으로 보내고 생성 일련번호를 반환한다', async () => {
    const manual = makeManual();
    client.requestRaw.mockResolvedValueOnce(success(101));

    await expect(manualAdminService.createManual(manual)).resolves.toBe(101);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'help/manuals',
      method: 'post',
      data: manual,
    });
  });

  it('수정과 삭제는 같은 식별자를 정확한 경로에 사용한다', async () => {
    const manual = makeManual({ onlnMnlSn: 55, onlnMnlNm: '수정된 매뉴얼' });

    await manualAdminService.updateManual(55, manual);
    await manualAdminService.deleteManual(55);

    expect(client.requestRaw).toHaveBeenNthCalledWith(1, {
      url: 'help/manuals/55',
      method: 'put',
      data: manual,
    });
    expect(client.requestRaw).toHaveBeenNthCalledWith(2, {
      url: 'help/manuals/55',
      method: 'delete',
    });
  });

  it('쓰기 config의 timeout과 signal을 보존한다', async () => {
    const manual = makeManual();
    const { signal } = new AbortController();

    await manualAdminService.updateManual(7, manual, { timeout: 5000, signal });

    expect(client.requestRaw).toHaveBeenCalledWith({
      timeout: 5000,
      signal,
      url: 'help/manuals/7',
      method: 'put',
      data: manual,
    });
  });

  it('목록 응답을 기존 공개 PageResponse 형태로 검증해 반환한다', async () => {
    const page = {
      list: [makeManual({ onlnMnlSn: 1 })],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(manualAdminService.getManualList({ page: 0 })).resolves.toStrictEqual(page);
  });

  it('OpenAPI에서 optional이지만 공개 반환에 필수인 필드가 없으면 fail-closed 한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({
      list: [{ onlnMnlSn: 1, onlnMnlNm: '불완전', onlnMnlSeCd: 'GNR' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    }));

    await expect(manualAdminService.getManualList()).rejects.toThrow(
      '온라인 매뉴얼 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it('config.params로 generated query를 덮어쓰려 하면 요청 전에 차단한다', async () => {
    const call = Reflect.apply(manualAdminService.getManualList, manualAdminService, [
      { keyword: 'contract' },
      { params: { keyword: 'override' } },
    ]);

    await expect(call).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
    expect(client.getRaw).not.toHaveBeenCalled();
  });

  it('transport 오류를 빈 결과로 바꾸지 않고 전파한다', async () => {
    const error = new Error('manual transport failed');
    client.getRaw.mockRejectedValueOnce(error);

    await expect(manualAdminService.getManualList()).rejects.toBe(error);
  });
});
