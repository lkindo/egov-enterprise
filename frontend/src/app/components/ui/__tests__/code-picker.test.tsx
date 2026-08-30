import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  StandardModal: ({ isOpen, title, children }: any) => isOpen
    ? <section aria-label={title}>{children}</section>
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

function renderPicker() {
  return render(
    <CodePicker isOpen onClose={mocks.onClose} onSelect={mocks.onSelect} />,
  );
}

async function searchGroups(keyword: string) {
  fireEvent.change(screen.getByRole('textbox', { name: '코드 그룹 검색어 입력' }), {
    target: { value: keyword },
  });
  fireEvent.click(screen.getByRole('button', { name: '검색' }));
}

describe('CodePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      pageUnit: 100,
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
      pageUnit: 100,
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
      pageIndex: 1,
      pageUnit: 100,
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
});
