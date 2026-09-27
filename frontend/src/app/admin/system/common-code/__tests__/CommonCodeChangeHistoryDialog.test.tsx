import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommonCodeChangeHistoryDialog, type CodeChangeHistoryTarget } from '../CommonCodeChangeHistoryDialog';

const mocks = vi.hoisted(() => ({ getHistory: vi.fn() }));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: { getCodeChangeHistory: mocks.getHistory },
}));

const rows = [
  {
    comCdChgHstrySn: 12, chgTrgtTypeCd: 'DTL', chgTypeCd: 'UPDATE', clsfCd: null, cdId: 'GRP1', dtlCd: 'ACTIVE',
    chgArtclNm: '명칭', chgBfrCn: '명칭: 활성 / 사용: Y', chgAftrCn: '명칭: 사용 중 / 사용: Y', chgUserNm: '김갑',
    crtDt: '2026-09-27T10:15:30.123',
  },
  {
    comCdChgHstrySn: 11, chgTrgtTypeCd: 'CODE', chgTypeCd: 'REMOVE', clsfCd: 'DOMAIN', cdId: 'GRP1', dtlCd: null,
    chgArtclNm: '그룹 삭제(사용 안 함)', chgBfrCn: '사용: Y', chgAftrCn: '사용: N', chgUserNm: null,
    crtDt: '2026-09-26T09:00:00',
  },
];

function renderDialog(target: CodeChangeHistoryTarget, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommonCodeChangeHistoryDialog target={target} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe('CommonCodeChangeHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHistory.mockResolvedValue({ list: rows, total: 23, page: 0, size: 10, totalPage: 3 });
  });

  it('그룹의 이력을 최신순으로 읽어 대상·변경·전후 값·변경자를 한국어로 보인다', async () => {
    renderDialog({ kind: 'group', id: 'GRP1', name: '사용자 상태' });

    const dialog = await screen.findByRole('dialog', { name: '사용자 상태 변경 이력' });
    expect(mocks.getHistory).toHaveBeenCalledWith({ cdId: 'GRP1' }, 0, 10);
    expect(await within(dialog).findByText('상세 코드 ACTIVE')).toBeInTheDocument();
    expect(within(dialog).getByText('2026-09-27 10:15:30')).toBeInTheDocument();
    expect(within(dialog).getAllByText('수정').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('명칭: 활성 / 사용: Y → 명칭: 사용 중 / 사용: Y')).toBeInTheDocument();
    expect(within(dialog).getByRole('table', { name: '사용자 상태 변경 이력' })).toBeInTheDocument();
    expect(within(dialog).getByText('김갑')).toBeInTheDocument();
    expect(within(dialog).getByText('그룹 GRP1')).toBeInTheDocument();
    expect(within(dialog).getByText('삭제(사용 안 함)')).toBeInTheDocument();
    // 이름을 찾지 못한 변경자는 식별자가 아니라 그렇게 말한다.
    expect(within(dialog).getByText('알 수 없는 사용자')).toBeInTheDocument();
    expect(within(dialog).getByText(/이 그룹과 상세 코드의/)).toBeInTheDocument();
  });

  it('분류는 그 분류 자신의 이력만 묻고, 소속 그룹의 이력은 그룹에서 보라고 안내한다', async () => {
    mocks.getHistory.mockResolvedValue({ list: [], total: 0, page: 0, size: 10, totalPage: 0 });
    renderDialog({ kind: 'cluster', id: 'DOMAIN', name: '업무 도메인' });

    const dialog = await screen.findByRole('dialog', { name: '업무 도메인 변경 이력' });
    expect(mocks.getHistory).toHaveBeenCalledWith({ clsfCd: 'DOMAIN' }, 0, 10);
    expect(await within(dialog).findByText('남은 변경 이력이 없습니다.')).toBeInTheDocument();
    expect(within(dialog).getByText(/소속 그룹의 이력은 그룹에서 확인하세요/)).toBeInTheDocument();
  });

  it('다음 페이지는 0부터 센 페이지 번호로 다시 읽는다', async () => {
    renderDialog({ kind: 'group', id: 'GRP1', name: '사용자 상태' });
    const dialog = await screen.findByRole('dialog', { name: '사용자 상태 변경 이력' });
    await within(dialog).findByText('상세 코드 ACTIVE');

    fireEvent.click(within(dialog).getByRole('link', { name: '다음 페이지로 이동' }));
    await waitFor(() => expect(mocks.getHistory).toHaveBeenLastCalledWith({ cdId: 'GRP1' }, 1, 10));
  });

  it('조회에 실패하면 빈 이력이라 말하지 않고 실패를 알리며 다시 시도할 수 있다', async () => {
    mocks.getHistory.mockRejectedValueOnce(new Error('boom'));
    renderDialog({ kind: 'group', id: 'GRP1', name: '사용자 상태' });

    const dialog = await screen.findByRole('dialog', { name: '사용자 상태 변경 이력' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('변경 이력을 불러오지 못했습니다.');
    expect(within(dialog).queryByText('남은 변경 이력이 없습니다.')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '다시 시도' }));
    expect(await within(dialog).findByText('상세 코드 ACTIVE')).toBeInTheDocument();
  });
});
