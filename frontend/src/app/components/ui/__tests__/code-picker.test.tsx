import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodePicker } from '../code-picker';

const mocks = vi.hoisted(() => ({
  getGroups: vi.fn(),
  getDetails: vi.fn(),
  onSelect: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    getCmmnCodeList: mocks.getGroups,
    getDetailCodeList: mocks.getDetails,
  },
}));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) => isOpen
    ? <section aria-label={title}><button onClick={onClose}>닫기</button>{children}</section>
    : null,
}));

const groupRows = [
  { cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '', useYn: 'Y', clsfCd: 'DOMAIN' },
  { cdId: 'GRP2', cdIdNm: '게시 상태', cdIdExpln: '', useYn: 'Y', clsfCd: 'DOMAIN' },
];
const detailRows = [
  { cdId: 'GRP1', dtlCd: 'ACTIVE', dtlCdNm: '활성', dtlCdExpln: '', useYn: 'Y' },
  { cdId: 'GRP1', dtlCd: 'STOP', dtlCdNm: '중지', dtlCdExpln: '', useYn: 'N' },
  // 페일세이프 검증용 — 다른 그룹의 행은 화면에 나오면 안 된다.
  { cdId: 'OTHER', dtlCd: 'X', dtlCdNm: '다른 그룹 코드', dtlCdExpln: '', useYn: 'Y' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

type GroupPage = { list: typeof groupRows; total: number };
type DetailPage = { list: typeof detailRows; total: number };

function renderPicker() {
  return render(
    <CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />,
  );
}

async function searchGroups(keyword: string) {
  await act(async () => {
    fireEvent.change(screen.getByRole('textbox', { name: '코드 그룹 검색어 입력' }), {
      target: { value: keyword },
    });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
  });
}

describe('CodePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGroups.mockReset();
    mocks.getDetails.mockReset();
    mocks.getGroups.mockResolvedValue({ list: groupRows });
    mocks.getDetails.mockResolvedValue({ list: detailRows, total: detailRows.length });
  });

  it('닫힌 상태에서는 아무것도 렌더하지 않고 API 도 호출하지 않는다', () => {
    render(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.getGroups).not.toHaveBeenCalled();
  });

  it('그룹을 코드명 축으로 검색해 결과를 보여준다', async () => {
    renderPicker();
    await searchGroups('상태');

    expect(await screen.findByText('사용자 상태')).toBeInTheDocument();
    expect(screen.getByText('게시 상태')).toBeInTheDocument();
    expect(mocks.getGroups).toHaveBeenCalledTimes(1);
    expect(mocks.getGroups).toHaveBeenCalledWith({
      searchCondition: '2',
      searchKeyword: '상태',
      size: 100,
    });
  });

  it('코드명 무결과 + ID 형태 검색어면 ID 축으로 1회 폴백한다', async () => {
    mocks.getGroups
      .mockResolvedValueOnce({ list: [] })
      .mockResolvedValueOnce({ list: [groupRows[0]] });

    renderPicker();
    await searchGroups('GRP1');

    expect(await screen.findByText('사용자 상태')).toBeInTheDocument();
    expect(mocks.getGroups).toHaveBeenCalledTimes(2);
    expect(mocks.getGroups).toHaveBeenLastCalledWith({
      searchCondition: '1',
      searchKeyword: 'GRP1',
      size: 100,
    });
  });

  it('그룹 선택 시 해당 그룹 상세코드만 보여주고, 코드 선택은 그룹·코드를 콜백으로 넘긴다', async () => {
    renderPicker();
    await searchGroups('상태');

    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));

    expect(await screen.findByText('활성')).toBeInTheDocument();
    expect(screen.getByText('중지')).toBeInTheDocument();
    // 페일세이프: 다른 그룹(cdId=OTHER) 행은 걸러진다.
    expect(screen.queryByText('다른 그룹 코드')).not.toBeInTheDocument();
    expect(mocks.getDetails).toHaveBeenCalledWith({
      searchKeyword: 'GRP1',
      searchCondition: '1',
      page: 1,
      size: 100,
    });

    fireEvent.click(screen.getByRole('button', { name: '코드 선택: 활성' }));
    expect(mocks.onSelect).toHaveBeenCalledWith({
      group: expect.objectContaining({ cdId: 'GRP1' }),
      code: expect.objectContaining({ cdId: 'GRP1', dtlCd: 'ACTIVE' }),
    });
    expect(mocks.onClose).toHaveBeenCalled();
  });

  it('2단계 필터는 코드·코드명 어느 쪽으로도 거르고, 무결과를 정직하게 알린다', async () => {
    renderPicker();
    await searchGroups('상태');
    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));
    await screen.findByText('활성');

    const filter = screen.getByRole('textbox', { name: '상세코드 필터 입력' });
    fireEvent.change(filter, { target: { value: 'stop' } });
    expect(screen.getByText('중지')).toBeInTheDocument();
    expect(screen.queryByText('활성')).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: '존재하지않는코드' } });
    expect(screen.getByText('필터와 일치하는 코드가 없습니다.')).toBeInTheDocument();
    expect(mocks.onSelect).not.toHaveBeenCalled();
  });

  it('빈 검색 결과는 빈 상태 문구로 보여주고(비 ID 검색어는 폴백하지 않음) 선택 콜백을 부르지 않는다', async () => {
    mocks.getGroups.mockResolvedValue({ list: [] });

    renderPicker();
    await searchGroups('존재하지 않는 이름');

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument();
    // 한글 검색어는 ID 형태가 아니므로 폴백 요청이 없어야 한다.
    expect(mocks.getGroups).toHaveBeenCalledTimes(1);
    expect(mocks.onSelect).not.toHaveBeenCalled();
  });

  it('그룹 검색 실패는 alert 로 드러내고 다시 시도할 수 있다', async () => {
    mocks.getGroups
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ list: [groupRows[0]] });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderPicker();
    await searchGroups('상태');

    expect(await screen.findByRole('alert')).toHaveTextContent('그룹 검색에 실패했습니다.');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('사용자 상태')).toBeInTheDocument();

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    consoleError.mockRestore();
  });

  it('새 그룹 검색 후 늦게 온 이전 결과를 보여주지 않는다', async () => {
    const previous = deferred<GroupPage>();
    const latest = deferred<GroupPage>();
    mocks.getGroups.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    renderPicker();
    await searchGroups('사용자');
    await searchGroups('게시');
    await act(async () => latest.resolve({ list: [groupRows[1]], total: 1 }));
    await act(async () => previous.resolve({ list: [groupRows[0]], total: 1 }));
    expect(screen.getByRole('button', { name: '그룹 선택: 게시 상태' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '그룹 선택: 사용자 상태' })).not.toBeInTheDocument();
  });

  it.each(['success', 'error'] as const)('이전 그룹 검색의 %s/finally가 최신 진행 상태를 덮지 않는다', async (outcome) => {
    const previous = deferred<GroupPage>();
    const latest = deferred<GroupPage>();
    mocks.getGroups.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    renderPicker();
    await searchGroups('사용자');
    await searchGroups('게시');
    await act(async () => {
      if (outcome === 'success') previous.resolve({ list: [groupRows[0]], total: 1 });
      else previous.reject(new Error('stale group failure'));
    });
    expect(screen.getByText('검색 중…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => latest.resolve({ list: [groupRows[1]], total: 1 }));
    expect(screen.getByRole('button', { name: '그룹 선택: 게시 상태' })).toBeInTheDocument();
  });

  it('무효화된 이름 검색은 ID 폴백 요청도 시작하지 않는다', async () => {
    const previous = deferred<GroupPage>();
    mocks.getGroups.mockReturnValueOnce(previous.promise).mockResolvedValueOnce({ list: [groupRows[1]], total: 1 });
    renderPicker();
    await searchGroups('GRP1');
    await searchGroups('게시');
    await screen.findByRole('button', { name: '그룹 선택: 게시 상태' });
    await act(async () => previous.resolve({ list: [], total: 0 }));
    expect(mocks.getGroups).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: '그룹 선택: 게시 상태' })).toBeInTheDocument();
  });

  it('뒤로 갔다가 다른 그룹을 연 뒤 늦게 온 상세 응답을 선택할 수 없다', async () => {
    const previous = deferred<DetailPage>();
    const latest = deferred<DetailPage>();
    mocks.getDetails.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    renderPicker();
    await searchGroups('상태');
    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));
    fireEvent.click(screen.getByRole('button', { name: '그룹 목록으로 돌아가기' }));
    fireEvent.click(screen.getByRole('button', { name: '그룹 선택: 게시 상태' }));
    const latestCode = { ...detailRows[0], cdId: 'GRP2', dtlCdNm: '게시 활성' };
    await act(async () => latest.resolve({ list: [latestCode], total: 1 }));
    await act(async () => previous.resolve({ list: [detailRows[0]], total: 1 }));
    expect(screen.queryByRole('button', { name: '코드 선택: 활성' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '코드 선택: 게시 활성' }));
    expect(mocks.onSelect).toHaveBeenCalledWith({ group: groupRows[1], code: latestCode });
  });

  it.each(['success', 'error'] as const)('뒤로 간 상세 요청의 %s/finally는 새 그룹의 로딩을 끝내지 않는다', async (outcome) => {
    const previous = deferred<DetailPage>();
    const latest = deferred<DetailPage>();
    mocks.getDetails.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    renderPicker();
    await searchGroups('상태');
    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));
    fireEvent.click(screen.getByRole('button', { name: '그룹 목록으로 돌아가기' }));
    fireEvent.click(screen.getByRole('button', { name: '그룹 선택: 게시 상태' }));
    await act(async () => {
      if (outcome === 'success') previous.resolve({ list: [detailRows[0]], total: 1 });
      else previous.reject(new Error('stale detail failure'));
    });
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => latest.resolve({ list: [], total: 0 }));
    expect(screen.getByText('이 그룹에 등록된 상세코드가 없습니다.')).toBeInTheDocument();
  });

  it.each(['success', 'error'] as const)('그룹 검색 중 닫고 다시 열면 이전 %s를 무시한다', async (outcome) => {
    const previous = deferred<GroupPage>();
    const latest = deferred<GroupPage>();
    mocks.getGroups.mockReturnValueOnce(previous.promise).mockReturnValueOnce(latest.promise);
    const view = renderPicker();
    await searchGroups('사용자');
    view.rerender(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    view.rerender(<CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    expect(screen.queryByText('검색 중…')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '코드 그룹 검색어 입력' })).toHaveValue('사용자');
    await searchGroups('게시');
    await act(async () => {
      if (outcome === 'success') previous.resolve({ list: [groupRows[0]], total: 1 });
      else previous.reject(new Error('closed group failure'));
    });
    expect(screen.getByText('검색 중…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => latest.resolve({ list: [groupRows[1]], total: 1 }));
    expect(screen.getByRole('button', { name: '그룹 선택: 게시 상태' })).toBeInTheDocument();
  });

  it('상세 조회 중 닫으면 완료한 그룹 검색을 보존하고 미완료 상세는 다시 선택하게 한다', async () => {
    const pending = deferred<DetailPage>();
    mocks.getDetails.mockReturnValueOnce(pending.promise);
    const view = renderPicker();
    await searchGroups('상태');
    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(mocks.onClose).toHaveBeenCalledOnce();
    view.rerender(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    view.rerender(<CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    await act(async () => pending.resolve({ list: [detailRows[0]], total: 1 }));
    expect(screen.getByRole('textbox', { name: '코드 그룹 검색어 입력' })).toHaveValue('상태');
    expect(screen.getByRole('button', { name: '그룹 선택: 사용자 상태' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '코드 선택: 활성' })).not.toBeInTheDocument();
    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument();
  });

  it.each([100, 101])('그룹 총 %i건의 첫 100건을 받으면 실제 잘림 여부를 안내한다', async (total) => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ ...groupRows[0], cdId: `GRP${i}`, cdIdNm: `상태 ${i}` }));
    mocks.getGroups.mockResolvedValue({ list: rows, total });
    renderPicker();
    await searchGroups('상태');
    await screen.findByRole('button', { name: '그룹 선택: 상태 0' });
    if (total === 101) {
      expect(screen.getByRole('status')).toHaveTextContent('총 101개 중 100개를 표시합니다. 검색어를 더 구체적으로 입력해 주세요.');
    } else {
      expect(screen.queryByText(/검색어를 더 구체적으로/)).not.toBeInTheDocument();
    }
  });

  it('실패 뒤 그룹 재검색을 닫으면 오류를 보존하고 다음 성공 때만 해제한다', async () => {
    const retry = deferred<GroupPage>();
    mocks.getGroups
      .mockRejectedValueOnce(new Error('initial group search failure'))
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce({ list: [groupRows[0]], total: 1 });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const view = renderPicker();
      await searchGroups('실패');
      expect(await screen.findByRole('alert')).toHaveTextContent('그룹 검색에 실패했습니다.');

      await searchGroups('재시도');
      expect(screen.getByText('검색 중…')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      view.rerender(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
      await act(async () => retry.resolve({ list: [groupRows[1]], total: 1 }));
      view.rerender(<CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />);

      expect(screen.getByRole('alert')).toHaveTextContent('그룹 검색에 실패했습니다.');
      expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '그룹 선택: 게시 상태' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '코드 그룹 검색어 입력' })).toHaveValue('재시도');

      await searchGroups('사용자');
      expect(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(mocks.getGroups).toHaveBeenCalledTimes(3);
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(['success', 'error'] as const)('닫힌 동안 도착한 그룹 %s는 완료한 검색 결과를 바꾸지 않는다', async (outcome) => {
    const pending = deferred<GroupPage>();
    mocks.getGroups.mockResolvedValueOnce({ list: [groupRows[0]], total: 1 }).mockReturnValueOnce(pending.promise);
    const view = renderPicker();
    await searchGroups('사용자');
    await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' });
    await searchGroups('게시');
    view.rerender(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    await act(async () => {
      if (outcome === 'success') pending.resolve({ list: [groupRows[1]], total: 1 });
      else pending.reject(new Error('response while closed'));
    });
    view.rerender(<CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    expect(screen.getByRole('button', { name: '그룹 선택: 사용자 상태' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '그룹 선택: 게시 상태' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 중…')).not.toBeInTheDocument();
    expect(mocks.getGroups).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'error'] as const)('외부에서 닫힌 상세 요청의 %s는 재열린 그룹 선택 상태를 바꾸지 않는다', async (outcome) => {
    const pending = deferred<DetailPage>();
    mocks.getDetails.mockReturnValueOnce(pending.promise);
    const view = renderPicker();
    await searchGroups('상태');
    fireEvent.click(await screen.findByRole('button', { name: '그룹 선택: 사용자 상태' }));
    view.rerender(<CodePicker isOpen={false} onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    await act(async () => {
      if (outcome === 'success') pending.resolve({ list: [detailRows[0]], total: 1 });
      else pending.reject(new Error('detail response while closed'));
    });
    view.rerender(<CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />);
    expect(screen.getByRole('button', { name: '그룹 선택: 사용자 상태' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '그룹 선택: 사용자 상태' }));
    expect(await screen.findByRole('button', { name: '코드 선택: 활성' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.getDetails).toHaveBeenCalledTimes(2);
  });
});
