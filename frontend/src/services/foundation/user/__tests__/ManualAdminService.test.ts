/**
 * ManualAdminService 계약 테스트
 *
 * [왜 필요한가]
 * 이 서비스는 커버리지 0% 였다. 화면(온라인 매뉴얼 관리)에서만 간접적으로 쓰이는데,
 * 이 계층이 조용히 틀어지면 화면은 "조회에 실패했습니다" 한 줄만 보여주고 원인은 감춰진다.
 * 아래 5가지가 여기서 조용히 깨질 수 있는 것들이며, 각각을 실측으로 고정한다.
 *
 *  1) basePath 조합 — 이 서비스는 형제 서비스들(MenuAdminService 등)과 달리 `AdminService`가
 *     아니라 **`ApiService`를 직접 상속**하며 `super('/help')`를 넘긴다. 따라서 최종 URL 은
 *     `help/manuals` 이지 `admin/system/help/manuals` 가 **아니다**(백엔드 HelpApiController =
 *     `/api/v1/help/manuals`). 누군가 "표준화" 명목으로 `AdminService` 로 바꾸면 전 엔드포인트가
 *     404 가 되는데, 타입체크·빌드는 전부 그린이다. 그 변경을 여기서 red 로 만든다.
 *  2) 페이징 파라미터 변환 — ApiService.get 이 0-based `page` 를 1-based `pageIndex` 로 (+1)
 *     변환하고 `size`/`pageSize` 를 `recordCountPerPage` 로 매핑한다. 이 오프셋이 뒤집히면
 *     첫 페이지가 비거나 목록이 한 건씩 밀리는데, 화면상으로는 "데이터가 좀 이상한" 정도로만 보인다.
 *  3) 경로 변수 치환 — update/delete 가 잘못된 `onlnMnlSn` 으로 나가면 **다른 매뉴얼을 고치거나 지운다**.
 *     되돌릴 수 없는 종류의 오작동이라 호출별로 정확한 id 가 URL 에 박히는지 고정한다.
 *  4) 요청 본문 — post/put 에 실리는 payload 가 가공·누락 없이 그대로 전달되는지.
 *  5) config 전달 — 호출부가 넘긴 AxiosRequestConfig(timeout·signal 등)가 params 병합 과정에서
 *     유실되지 않는지. signal 이 사라지면 취소가 동작하지 않아 좀비 요청이 남는다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { manualAdminService, type ManualDto } from '../ManualAdminService';
import type { PageResponse } from '@/types/modernization';

/** 테스트용 매뉴얼 payload (필수 필드만 채운 최소 형태) */
const makeManual = (overrides: Partial<ManualDto> = {}): ManualDto => ({
  onlnMnlNm: '사용자 매뉴얼',
  onlnMnlExpln: '사용자용 온라인 매뉴얼',
  onlnMnlDfn: '/docs/user-manual.pdf',
  ...overrides,
});

describe('ManualAdminService — URL 경로 조합 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록 조회는 admin 접두 없이 help/manuals 로 나간다 (AdminService 상속으로 바뀌면 전 엔드포인트가 404 가 된다)', async () => {
    await manualAdminService.getManualList();

    const [url] = client.get.mock.calls[0];
    expect(url).toBe('help/manuals');
    // basePath 는 선행 슬래시가 제거된 'help' 여야 한다 — '/help' 로 남으면 baseURL 뒤에서 '//' 가 된다.
    expect(url).not.toMatch(/^\//);
    // AdminService('admin/{category}/...') 로 갈아끼우는 회귀를 명시적으로 차단한다.
    expect(url).not.toContain('admin/');
  });

  it('상세 조회는 help/manuals/{일련번호} 형태로 조합된다', async () => {
    await manualAdminService.getManual(42);

    expect(client.get).toHaveBeenCalledWith('help/manuals/42', undefined);
  });

  it('등록/수정/삭제 모두 동일한 help/manuals 리소스 경로를 공유한다', async () => {
    const manual = makeManual();

    await manualAdminService.createManual(manual);
    await manualAdminService.updateManual(7, manual);
    await manualAdminService.deleteManual(7);

    expect(client.post.mock.calls[0][0]).toBe('help/manuals');
    expect(client.put.mock.calls[0][0]).toBe('help/manuals/7');
    expect(client.delete.mock.calls[0][0]).toBe('help/manuals/7');
  });
});

describe('ManualAdminService — 페이징/검색 파라미터 변환 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('0-based page 를 1-based pageIndex 로 +1 변환한다 (첫 페이지 page=0 -> pageIndex=1)', async () => {
    await manualAdminService.getManualList({ page: 0 });

    expect(client.get).toHaveBeenCalledWith(
      'help/manuals',
      expect.objectContaining({
        params: expect.objectContaining({ page: 0, pageIndex: 1 }),
      }),
    );
  });

  it('page=1 은 pageIndex=2 로 변환되며 원본 page 도 함께 유지된다 (Spring Data Pageable 병행 지원)', async () => {
    await manualAdminService.getManualList({ page: 1 });

    const [, config] = client.get.mock.calls[0];
    expect(config.params).toMatchObject({ page: 1, pageIndex: 2 });
  });

  it('호출부가 pageIndex 를 직접 지정하면 page 로부터 덮어쓰지 않는다', async () => {
    await manualAdminService.getManualList({ page: 5, pageIndex: 99 });

    const [, config] = client.get.mock.calls[0];
    expect(config.params.pageIndex).toBe(99);
  });

  it('size 를 recordCountPerPage 로 매핑한다 (BaseSearchDto 표준)', async () => {
    await manualAdminService.getManualList({ page: 0, size: 20 });

    const [, config] = client.get.mock.calls[0];
    expect(config.params).toMatchObject({ size: 20, recordCountPerPage: 20 });
  });

  it('pageSize 는 recordCountPerPage 와 size 양쪽으로 확장된다', async () => {
    await manualAdminService.getManualList({ pageSize: 15 });

    const [, config] = client.get.mock.calls[0];
    expect(config.params).toMatchObject({ pageSize: 15, recordCountPerPage: 15, size: 15 });
  });

  it('검색 조건은 변환 대상이 아니므로 그대로 전달된다', async () => {
    await manualAdminService.getManualList({
      page: 2,
      searchKeyword: '결재',
      onlnMnlSeCd: 'MNL01',
    });

    const [, config] = client.get.mock.calls[0];
    expect(config.params).toMatchObject({
      searchKeyword: '결재',
      onlnMnlSeCd: 'MNL01',
      pageIndex: 3,
    });
  });

  it('인자를 생략하면 빈 params 객체가 전달된다 (undefined 로 새어나가지 않는다)', async () => {
    await manualAdminService.getManualList();

    expect(client.get).toHaveBeenCalledWith('help/manuals', { params: {} });
  });
});

describe('ManualAdminService — config 전달 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('호출부의 timeout·signal 이 params 병합 과정에서 유실되지 않는다', async () => {
    const controller = new AbortController();

    await manualAdminService.getManualList(
      { page: 0 },
      { timeout: 30000, signal: controller.signal },
    );

    const [, config] = client.get.mock.calls[0];
    expect(config.timeout).toBe(30000);
    expect(config.signal).toBe(controller.signal);
    expect(config.params).toMatchObject({ pageIndex: 1 });
  });

  it('params 인자는 config.params 보다 우선한다 (검색 조건이 조용히 뒤바뀌지 않는다)', async () => {
    const config = { params: { searchKeyword: '무시되어야 함' } } as AxiosRequestConfig;

    await manualAdminService.getManualList({ searchKeyword: '적용되어야 함' }, config);

    const [, sent] = client.get.mock.calls[0];
    expect(sent.params).toEqual({ searchKeyword: '적용되어야 함' });
  });

  it('config 를 넘기지 않는 단건 조회/삭제는 undefined 를 그대로 전달한다', async () => {
    await manualAdminService.getManual(3);
    await manualAdminService.deleteManual(3);

    expect(client.get).toHaveBeenCalledWith('help/manuals/3', undefined);
    expect(client.delete).toHaveBeenCalledWith('help/manuals/3', undefined);
  });
});

describe('ManualAdminService — 요청 본문 및 응답 전달 계약', () => {
  beforeEach(() => vi.clearAllMocks());

  it('등록 요청은 payload 를 가공 없이 그대로 싣고 생성된 일련번호를 반환한다', async () => {
    const manual = makeManual({ onlnMnlSeCd: 'MNL02' });
    client.post.mockResolvedValue(101);

    const createdSn = await manualAdminService.createManual(manual);

    expect(client.post).toHaveBeenCalledWith('help/manuals', manual, undefined);
    // 동일 참조 전달 — 중간에서 복사/필터링하며 필드를 떨어뜨리지 않는다.
    expect(client.post.mock.calls[0][1]).toBe(manual);
    expect(createdSn).toBe(101);
  });

  it('수정 요청은 경로의 일련번호와 본문을 각각 올바른 위치에 싣는다 (id 가 밀리면 다른 매뉴얼을 덮어쓴다)', async () => {
    const manual = makeManual({ onlnMnlSn: 55, onlnMnlNm: '수정된 매뉴얼' });

    await manualAdminService.updateManual(55, manual);

    expect(client.put).toHaveBeenCalledWith('help/manuals/55', manual, undefined);
  });

  it('삭제 요청은 대상 일련번호만 경로에 담고 본문을 보내지 않는다', async () => {
    await manualAdminService.deleteManual(77);

    expect(client.delete).toHaveBeenCalledWith('help/manuals/77', undefined);
    expect(client.delete.mock.calls[0]).toHaveLength(2);
  });

  it('목록 조회는 클라이언트 응답(PageResponse)을 변형 없이 그대로 돌려준다', async () => {
    const page: PageResponse<ManualDto> = {
      list: [makeManual({ onlnMnlSn: 1 })],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    };
    client.get.mockResolvedValue(page);

    await expect(manualAdminService.getManualList({ page: 0 })).resolves.toBe(page);
  });

  it('상세 조회는 클라이언트 응답(ManualDto)을 변형 없이 그대로 돌려준다', async () => {
    const manual = makeManual({ onlnMnlSn: 9 });
    client.get.mockResolvedValue(manual);

    await expect(manualAdminService.getManual(9)).resolves.toBe(manual);
  });
});
