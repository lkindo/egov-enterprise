import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getBoardChangeHistory: vi.fn() }));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { getBoardChangeHistory: mocks.getBoardChangeHistory },
}));

import { BoardChangeHistoryDialog } from '../BoardChangeHistoryDialog';

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';
let sn = 0;
const change = (chgArtclNm: string, chgBfrCn: string | null, chgAftrCn: string | null, extra: Record<string, unknown> = {}) => ({
  bbsChgHstrySn: ++sn, chgTrgtTypeCd: 'BBS', chgTypeCd: 'SETTING', pstSn: null, chgArtclNm, chgBfrCn, chgAftrCn,
  chgUserNm: '김운영', crtDt: '2026-10-26T09:30:00', ...extra,
});

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BoardChangeHistoryDialog bbsId={BBS_ID} boardName="공지사항" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

/** 값 칸('변경 전 → 후')의 글. 행은 항목 이름으로 찾는다. */
async function valueCell(item: string | RegExp) {
  const table = await screen.findByRole('table', { name: '공지사항 변경 이력' });
  const row = within(table).getAllByRole('row').find((candidate) => {
    const cells = candidate.querySelectorAll('td');
    return cells.length > 3 && (typeof item === 'string' ? cells[3].textContent === item : item.test(cells[3].textContent ?? ''));
  });
  if (!row) throw new Error(`이력 행을 찾지 못했습니다: ${item}`);
  return row.querySelectorAll('td')[4];
}

/** [2026-10-26 ADR-0043 1차 SET-08] 변경 이력이 저장값 대신 설정 탭과 같은 말로 보이고, 바꿔 보인 값은 저장값을 함께 둔다. */
describe('BoardChangeHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sn = 0;
  });

  it('설정 값을 설정 탭과 같은 말로 보이고 저장값을 보조로 둔다', async () => {
    mocks.getBoardChangeHistory.mockResolvedValue({
      list: [
        change('비밀글 정책', 'NONE', 'REQUIRED'),
        change('파일당 크기(바이트)', '5242880', '0'),
        change('댓글 받기', 'Y', 'N'),
        change('게시판 사용', 'Y', 'N', { chgTypeCd: 'USE' }),
        change('첨부 파일 수', '3', '0'),
        change('상단 고정 상한', '5', '3'),
        change('게시판 명칭', '공지', '전사 공지'),
      ],
      total: 7, page: 1, size: 10, totalPage: 1,
    });
    renderDialog();

    const policy = await valueCell('비밀글 정책');
    expect(policy).toHaveTextContent('없음(작성 화면에 선택 없음) → 필수(늘 비밀글로 저장)');
    expect(policy).toHaveTextContent('저장값: NONE → REQUIRED');

    // 저장 단위가 붙은 항목 이름은 화면 이름(파일당 크기)으로 보이고 값은 MB·전역 상한이다.
    const size = await valueCell('파일당 크기');
    expect(size).toHaveTextContent('5MB → 전역 상한');
    expect(size).toHaveTextContent('저장값: 5242880 → 0');

    expect(await valueCell('댓글 받기')).toHaveTextContent('받음 → 받지 않음저장값: Y → N');
    expect(await valueCell('게시판 사용')).toHaveTextContent('사용 → 사용 안 함');
    expect(await valueCell('첨부 파일 수')).toHaveTextContent('3개 → 상한 없음');
    expect(await valueCell('상단 고정 상한')).toHaveTextContent('5건 → 3건');

    // 사람말로 바꿀 것이 없는 값은 저장값을 겹쳐 보이지 않는다.
    const name = await valueCell('게시판 명칭');
    expect(name).toHaveTextContent('공지 → 전사 공지');
    expect(name).not.toHaveTextContent('저장값');
    expect(mocks.getBoardChangeHistory).toHaveBeenCalledWith(BBS_ID, { page: 1, size: 10 });
  });

  it('게시글 행의 날짜·고정 여부를 화면 표기로 보이고, 모르는 항목·어휘 밖 값은 저장값 그대로 둔다', async () => {
    mocks.getBoardChangeHistory.mockResolvedValue({
      list: [
        change('상단 고정', 'N', 'Y', { chgTrgtTypeCd: 'PST', chgTypeCd: 'PIN', pstSn: 41 }),
        change('상단 고정 종료일', null, '20261231', { chgTrgtTypeCd: 'PST', chgTypeCd: 'PIN', pstSn: 41 }),
        change('추천 받기', 'X', 'N'),
        change('새 항목', 'a', 'b'),
      ],
      total: 4, page: 1, size: 10, totalPage: 1,
    });
    renderDialog();

    expect(await valueCell('상단 고정')).toHaveTextContent('고정 안 함 → 고정저장값: N → Y');
    const end = await valueCell('상단 고정 종료일');
    expect(end).toHaveTextContent('— → 2026-12-31');
    expect(end).toHaveTextContent('저장값: — → 20261231');
    // 어휘 밖 값(X)은 추정해 바꾸지 않는다.
    expect(await valueCell('추천 받기')).toHaveTextContent('X → 받지 않음저장값: X → N');
    const unknown = await valueCell('새 항목');
    expect(unknown).toHaveTextContent('a → b');
    expect(unknown).not.toHaveTextContent('저장값');
    expect(screen.getAllByText('게시글 41')).toHaveLength(2);
  });
});
