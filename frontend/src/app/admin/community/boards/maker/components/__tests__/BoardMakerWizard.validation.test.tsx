import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard, boardMakerFormSchema, findJustCreatedBoard } from '../BoardMakerWizard';
import { inProjection } from '@/test-utils/projection';
import { useToast } from '@/app/components/ui/toast';

const { createBoardMaster, getBoardMasterList, getBoardMaster, batchUpdateBoardMasterStatus, confirmMock, communities, push, back } = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  createBoardMaster: vi.fn(),
  getBoardMasterList: vi.fn(),
  getBoardMaster: vi.fn(),
  batchUpdateBoardMasterStatus: vi.fn(),
  confirmMock: vi.fn(),
  // [2026-09-08 PD-CMTY-001] 귀속 후보 목록. 사용 중지된 커뮤니티는 후보에서 빠진다.
  communities: {
    current: {
      list: [
        { cmntySn: 7, cmntyNm: '연구모임', useYn: 'Y' },
        { cmntySn: 8, cmntyNm: '폐쇄된 모임', useYn: 'N' },
      ],
    },
  },
}));

// 다른 관리 화면으로 가는 길은 라우트와 같은 판정(canOpenPage)으로 보인다 — 목적지 권한을 가진 관리자로 렌더한다.
// [2026-10-26 ADR-0043 결정 1] 마법사는 게시판만 만든다 — 기본 사용자는 게시판 만들기·조회 권한만 있고 메뉴 권한은 없다.
const BOARD_PERMISSIONS = ['BBS_MST_READ', 'BBS_MST_CREATE'];
const MENU_PERMISSIONS = ['MENU_READ', 'MENU_CREATE', 'MENU_UPDATE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), removeQueries: vi.fn() }),
  useQuery: () => ({ data: communities.current }),
}));
vi.mock('@/services/business/user/community/CommunityUserService', () => ({
  communityUserService: { getCommunityList: vi.fn() },
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { createBoardMaster, getBoardMasterList, getBoardMaster, batchUpdateBoardMasterStatus },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => confirmMock }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: ({ customItems }: { customItems: { name: string }[] }) => (
    <nav aria-label="현재 위치">{customItems.map((item) => item.name).join(' › ')}</nav>
  ),
}));
vi.mock('../BoardPreview', () => ({ BoardPreview: () => null }));

const BOARD_ID = 'BBSMSTR_AAAAAAAAAAAA';
const STEP_TITLES = ['화면·기능', '최종 확인'] as const;
const SCREEN_HANDOFF_KEY = 'egov.screen-handoff.v1:menu-add-screen';

const currentStepTitle = () => ['용도·기본정보', ...STEP_TITLES].find((title) => screen.queryByRole('heading', { name: title }));

/** 지금 단계에서 다음 단계로 넘어가며 title 단계까지 간다. */
async function goToStep(title: string) {
  for (let guard = 0; guard < STEP_TITLES.length && currentStepTitle() !== title; guard += 1) {
    const before = currentStepTitle();
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await waitFor(() => expect(currentStepTitle()).not.toBe(before));
  }
  await screen.findByRole('heading', { name: title });
}

/** 이름을 넣고 최종 확인에서 게시판을 만든 뒤 결과 화면을 기다린다. */
async function createBoard(name = '사내 소식') {
  render(<BoardMakerWizard />);
  fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: name } });
  await goToStep('최종 확인');
  fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
  await screen.findByRole('heading', { name: '게시판 만들기 완료' });
}

/** 최종 확인·결과 화면 요약(dl)의 값. */
const summaryValue = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null;

/** 시간대 표기 없는 서버 현지 시각(Asia/Seoul) 문자열 — 목록 응답의 crtDt 모양이다. */
const seoulLocal = (epochMs: number) => new Date(epochMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);

const summary = (overrides: Record<string, unknown> = {}) => ({
  bbsId: BOARD_ID, bbsTtl: '사내 소식', bbsTypeCd: 'BBST01', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_HUB', useYn: 'N',
  crtDt: seoulLocal(Date.now() - 30_000), designations: [], ...overrides,
});

const validDraft = {
  bbsTtl: '사내 소식',
  bbsExpln: '',
  // [2026-08-29] 마법사가 두 값을 사용자에게 묻지 않게 되면서 폼 스키마의 boolean 덮어쓰기도
  //   사라졌다. 이제 생성 DTO 스키마의 'Y'|'N' 이 그대로 적용된다(마법사는 각각 'N'·'Y' 고정 전송).
  ansPsbltyYn: 'N',
  fileAtchPsbltyYn: 'Y',
  atchPsbltyFileQty: 3,
  atchPsbltyFileSz: 5_242_880,
  bbsTypeCd: 'BBST01',
  bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_HUB',
  useYn: 'N',
  cmntySn: '',
};

describe('BoardMakerWizard validation', () => {
  beforeEach(() => {
    auth.permissions = BOARD_PERMISSIONS;
    createBoardMaster.mockReset();
    getBoardMasterList.mockReset().mockResolvedValue({ list: [], total: 0, page: 1, size: 20, totalPage: 1 });
    batchUpdateBoardMasterStatus.mockReset().mockResolvedValue(undefined);
    getBoardMaster.mockReset().mockResolvedValue({ bbsId: BOARD_ID, useYn: 'N' });
    confirmMock.mockReset().mockResolvedValue(true);
    push.mockReset();
    back.mockReset();
    vi.mocked(useToast().toast).mockClear();
    window.sessionStorage.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('preserves board DTO text and integer boundaries', () => {
    expect(boardMakerFormSchema.safeParse(validDraft).success).toBe(true);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsTtl: '가'.repeat(101) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsExpln: '가'.repeat(4001) }).success).toBe(false);
    // [2026-10-26 ADR-0043 결정 1] 메뉴 칸은 없다 — 메뉴 이름·위치·순서를 묻지 않는다.
    expect(Object.keys(boardMakerFormSchema.shape)).not.toEqual(expect.arrayContaining(['menuNm']));
    expect(boardMakerFormSchema.shape).not.toHaveProperty('upperMenuNo');
    expect(boardMakerFormSchema.shape).not.toHaveProperty('menuOrdr');
  });

  // [2026-10-26 ADR-0043 결정 1] 단계는 셋이고 메뉴 단계가 없다. 메뉴 권한이 없는 게시판 운영 담당자도 게시판을 만든다.
  it('메뉴 권한 없이 게시판 만들기 권한만으로 세 단계를 지나 게시판을 만든다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    auth.permissions = ['BBS_MST_CREATE'];
    render(<BoardMakerWizard />);
    const steps = screen.getByRole('list', { name: '게시판 만들기 단계' });
    const stepText = (item: HTMLElement) => [...item.querySelectorAll('p')].map((line) => line.textContent).join(' ');
    expect(within(steps).getAllByRole('listitem').map(stepText)).toEqual(['1단계 용도·기본정보', '2단계 화면·기능', '3단계 최종 확인']);
    expect(screen.queryByText(/권한이 없습니다|권한이 없어/)).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('최종 확인');
    expect(screen.queryByLabelText('메뉴 명칭')).toBeNull();
    expect(screen.queryByLabelText('상위 메뉴 선택')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await screen.findByRole('heading', { name: '게시판 만들기 완료' });
    expect(createBoardMaster).toHaveBeenCalledTimes(1);
  });

  it('단계 표시가 지금 단계를 aria-current="step" 으로 알린다', async () => {
    render(<BoardMakerWizard />);
    const items = () => within(screen.getByRole('list', { name: '게시판 만들기 단계' })).getAllByRole('listitem');
    expect(items().map((item) => item.getAttribute('aria-current'))).toEqual(['step', null, null]);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    expect(items().map((item) => item.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(items()[0]).toHaveTextContent('(마침)');
  });

  it('위치 경로를 보이고, 만들기 취소는 게시판 목록으로 간다', async () => {
    render(<BoardMakerWizard />);
    expect(screen.getByRole('navigation', { name: '현재 위치' })).toHaveTextContent('관리 센터 › 콘텐츠 운영 › 게시판 관리 › 게시판 만들기');
    fireEvent.click(screen.getByRole('button', { name: '만들기 취소' }));
    expect(push).toHaveBeenCalledWith('/admin/community/boards/master');
  });

  it('[DIP B5 F9] 게시판 기능(댓글·만족도·첨부) 선택을 생성 요청에 싣는다 — 기본은 모두 받음', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    expect(screen.getByRole('checkbox', { name: /댓글 받기/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /만족도 평가 받기/ })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /만족도 평가 받기/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /파일 첨부 허용/ }));
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    // [2026-10-23 ADR-0040 §5.3] 파일당 크기는 비워 두면 0(전역 상한)이다.
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'N', atchPsbltyFileSz: 0 });
    // 실패는 화면이 사유와 함께 보인다 — 같은 실패를 전역 토스트로 한 번 더 띄우지 않는다(DEC-OPS-184).
    expect(createBoardMaster.mock.calls[0][1]).toEqual({ suppressErrorToast: true });
  });

  // [2026-10-26 ADR-0043 WIZ 6] 최종 확인은 만들 설정을 빠짐없이 보이고, 만든 직후 상태와 메뉴를 만들지 않는다는 사실을 말한다.
  it('최종 확인이 모든 설정과 만든 직후 상태·메뉴 없음을 보인다', async () => {
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    fireEvent.click(screen.getByRole('radio', { name: '공지형' }));
    await goToStep('최종 확인');
    expect(summaryValue('게시판 이름')).toBe('사내 소식');
    expect(summaryValue('게시판 소개')).toBe('입력하지 않음');
    expect(summaryValue('용도')).toBe('공지형');
    expect(summaryValue('화면 유형')).toContain('(만든 뒤 바꿀 수 없음)');
    expect(summaryValue('댓글')).toBe('받지 않음');
    expect(summaryValue('만족도 평가')).toBe('받지 않음');
    expect(summaryValue('추천')).toBe('받지 않음');
    expect(summaryValue('파일 첨부')).toBe('허용(3개까지 · 파일당 전역 상한 10MB)');
    expect(summaryValue('예약 게시')).toBe('받음');
    expect(summaryValue('상단 고정')).toBe('허용(상한 5건 · 기본 30일)');
    expect(summaryValue('비밀글 정책')).toBe('없음');
    expect(summaryValue('만든 직후 상태')).toBe('사용 안 함');
    expect(summaryValue('메뉴')).toBe('만들지 않음');
    expect(screen.getByText(/게시판: 사용 안 함으로 만들어져 이용자에게 닫혀 있습니다/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴: 만들지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴는 길 안내일 뿐 접근을 막지 않습니다/)).toBeInTheDocument();
  });

  // [2026-10-26 ADR-0043 결정 2, WIZ-04] 결과 화면은 이름·ID·상태와 남은 일(글 준비 → 사용 전환 → (선택) 메뉴)을 보인다.
  it('게시판을 사용 안 함으로 만들고 결과 화면에 이름·ID·상태와 남은 일 순서를 보인다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    await createBoard();
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ useYn: 'N' });
    expect(summaryValue('게시판 이름')).toBe('사내 소식');
    expect(summaryValue('게시판 ID')).toBe(BOARD_ID);
    expect(summaryValue('상태')).toBe('사용 안 함 — 이용자에게 닫혀 있습니다');
    expect(screen.getByText('게시판을 사용 안 함으로 만들었습니다. 메뉴는 만들지 않았습니다.')).toBeInTheDocument();
    const nextSteps = within(screen.getByRole('region', { name: '남은 일' })).getAllByRole('listitem');
    expect(nextSteps.map((item) => item.querySelector('p')?.textContent)).toEqual(['글 준비', '사용 전환', '(선택) 메뉴에 붙이기']);
    fireEvent.click(screen.getByRole('button', { name: '운영 화면에서 공개 준비 계속하기' }));
    expect(push).toHaveBeenCalledWith(`/admin/community/boards/master/${BOARD_ID}?tab=access`);
  });

  it('운영 화면에 들어갈 권한(게시판 관리 조회)이 없으면 공개 준비 계속하기를 보이지 않는다', async () => {
    auth.permissions = ['BBS_MST_CREATE'];
    createBoardMaster.mockResolvedValue(BOARD_ID);
    await createBoard();
    expect(screen.queryByRole('button', { name: '운영 화면에서 공개 준비 계속하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '게시판 목록 보기' })).toBeNull();
  });

  describe('지금 사용으로 바꾸기(ADR-0043 결정 2)', () => {
    beforeEach(() => {
      auth.permissions = [...BOARD_PERMISSIONS, 'BBS_MST_UPDATE'];
      createBoardMaster.mockResolvedValue(BOARD_ID);
    });

    it('확인을 거쳐 기존 사용 상태 경로로 바꾸고 상태 문구를 바꾼다', async () => {
      await createBoard();
      fireEvent.click(screen.getByRole('button', { name: '지금 사용으로 바꾸기' }));
      await waitFor(() => expect(batchUpdateBoardMasterStatus).toHaveBeenCalledWith([BOARD_ID], 'Y'));
      expect(confirmMock).toHaveBeenCalledTimes(1);
      const options = confirmMock.mock.calls[0][0];
      expect(options).toMatchObject({ title: '게시판 사용으로 바꾸기', confirmText: '사용으로 바꾸기' });
      // 영향: 게시글 권한자 누구나 주소·통합 검색·선택지로 열고 쓴다. 메뉴는 따로다.
      expect(options.message).toContain('게시글 권한이 있는 로그인 사용자는 누구나 주소·통합 검색·게시판 선택지로');
      render(<>{options.details}</>);
      expect(screen.getByText(/메뉴는 따로 붙입니다/)).toBeInTheDocument();
      await waitFor(() => expect(summaryValue('상태')).toBe('사용 중 — 게시글 권한이 있는 로그인 사용자에게 열려 있습니다'));
      expect(useToast().toast).toHaveBeenCalledWith("'사내 소식' 게시판을 사용으로 바꿨습니다.", 'success');
      expect(screen.queryByRole('button', { name: '지금 사용으로 바꾸기' })).toBeNull();
    });

    it('확인을 취소하면 바꾸지 않는다', async () => {
      confirmMock.mockResolvedValue(false);
      await createBoard();
      fireEvent.click(screen.getByRole('button', { name: '지금 사용으로 바꾸기' }));
      await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
      expect(batchUpdateBoardMasterStatus).not.toHaveBeenCalled();
      expect(summaryValue('상태')).toBe('사용 안 함 — 이용자에게 닫혀 있습니다');
    });

    it('바꾸지 못하면 실패를 알리고 사용 안 함 상태를 그대로 보인다', async () => {
      batchUpdateBoardMasterStatus.mockRejectedValue({ response: { status: 409, data: { message: '다른 관리자가 먼저 바꿨습니다.' } } });
      await createBoard();
      fireEvent.click(screen.getByRole('button', { name: '지금 사용으로 바꾸기' }));
      await waitFor(() => expect(useToast().toast).toHaveBeenCalledWith('게시판을 사용으로 바꾸지 못했습니다. 게시판은 사용 안 함 그대로입니다.', 'error'));
      expect(summaryValue('상태')).toBe('사용 안 함 — 이용자에게 닫혀 있습니다');
      expect(screen.getByRole('button', { name: '지금 사용으로 바꾸기' })).toBeEnabled();
    });

    it('처리 중에는 단추를 잠가 한 번만 보내고, 실패하면 알리며 다시 누를 수 있게 둔다', async () => {
      let rejectSwitch: (reason?: unknown) => void = () => {};
      batchUpdateBoardMasterStatus.mockImplementation(() => new Promise((_resolve, reject) => { rejectSwitch = reject; }));
      await createBoard();
      const switchButton = screen.getByRole('button', { name: '지금 사용으로 바꾸기' });
      fireEvent.click(switchButton);
      await waitFor(() => expect(switchButton).toBeDisabled());
      expect(switchButton).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(switchButton);
      expect(batchUpdateBoardMasterStatus).toHaveBeenCalledTimes(1);
      await act(async () => { rejectSwitch({ response: { status: 400, data: { message: '바꿀 수 없습니다.' } } }); });
      await waitFor(() => expect(useToast().toast).toHaveBeenCalledWith('게시판을 사용으로 바꾸지 못했습니다. 게시판은 사용 안 함 그대로입니다.', 'error'));
      expect(switchButton).toBeEnabled();
      expect(switchButton).not.toHaveAttribute('aria-busy');
    });

    // 응답이 없거나 5xx 면 서버에서 바뀌었을 수 있다 — '그대로'라고 단정하지 않고 상태를 다시 읽어 결과 화면에 맞춘다.
    it('결과를 모르면 그대로라고 단정하지 않고 상태를 다시 읽어 보인다', async () => {
      batchUpdateBoardMasterStatus.mockRejectedValue(new Error('synthetic response lost'));
      getBoardMaster.mockResolvedValue({ bbsId: BOARD_ID, useYn: 'Y' });
      await createBoard();
      fireEvent.click(screen.getByRole('button', { name: '지금 사용으로 바꾸기' }));
      await waitFor(() => expect(useToast().toast).toHaveBeenCalledWith('사용 전환 결과를 확인하지 못했습니다. 운영 화면에서 상태를 확인하거나 다시 시도하세요.', 'error'));
      expect(useToast().toast).not.toHaveBeenCalledWith('게시판을 사용으로 바꾸지 못했습니다. 게시판은 사용 안 함 그대로입니다.', 'error');
      expect(getBoardMaster).toHaveBeenCalledWith(BOARD_ID, { suppressErrorToast: true });
      await waitFor(() => expect(summaryValue('상태')).not.toBe('사용 안 함 — 이용자에게 닫혀 있습니다'));
    });

    it('게시판 관리 수정 권한이 없으면 단추 대신 요청 안내를 보인다', async () => {
      auth.permissions = BOARD_PERMISSIONS;
      await createBoard();
      expect(screen.queryByRole('button', { name: '지금 사용으로 바꾸기' })).toBeNull();
      expect(screen.getByText(/게시판 관리 수정 권한\(BBS_MST_UPDATE\)이 있는 관리자에게 요청하세요/)).toBeInTheDocument();
    });
  });

  describe('메뉴에 붙이기(ADR-0043 결정 1)', () => {
    beforeEach(() => { createBoardMaster.mockResolvedValue(BOARD_ID); });

    it('메뉴 관리 권한이 있으면 게시판 주소·이름·돌아갈 곳을 넘기고 메뉴 관리로 간다', async () => {
      auth.permissions = [...BOARD_PERMISSIONS, ...MENU_PERMISSIONS];
      await createBoard();
      fireEvent.click(screen.getByRole('button', { name: '메뉴에 붙이기' }));
      expect(push).toHaveBeenCalledWith('/admin/system/menus');
      expect(JSON.parse(window.sessionStorage.getItem(SCREEN_HANDOFF_KEY) ?? 'null')).toMatchObject({
        route: `/admin/community/boards/select-board-list?bbsId=${BOARD_ID}`,
        label: '사내 소식',
        returnTo: { route: `/admin/community/boards/master/${BOARD_ID}?tab=access`, label: '게시판 공개 준비로 돌아가기' },
      });
    });

    it('넘기지 못하면 이동하지 않고 주소를 직접 등록하도록 안내한다', async () => {
      auth.permissions = [...BOARD_PERMISSIONS, ...MENU_PERMISSIONS];
      await createBoard();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
      fireEvent.click(screen.getByRole('button', { name: '메뉴에 붙이기' }));
      expect(push).not.toHaveBeenCalledWith('/admin/system/menus');
      // 폼 오류 알림 영역(role=alert)이 body 에 따로 있다 — 문구로 찾고 그 상자가 알림인지 본다.
      const notice = await screen.findByText(/메뉴 관리에 게시판을 넘기지 못했습니다/);
      expect(notice.closest('[role="alert"]')).not.toBeNull();
      expect(screen.getByText(`/admin/community/boards/select-board-list?bbsId=${BOARD_ID}`)).toBeInTheDocument();
    });

    it.each([
      ['메뉴 수정 권한이 없으면', [...BOARD_PERMISSIONS, 'MENU_READ', 'MENU_CREATE']],
      ['메뉴 추가 권한이 없으면', [...BOARD_PERMISSIONS, 'MENU_READ', 'MENU_UPDATE']],
      ['메뉴 관리 화면에 들어갈 수 없으면', [...BOARD_PERMISSIONS, 'MENU_CREATE', 'MENU_UPDATE']],
    ])('%s 요청 안내와 주소 복사를 보인다', async (_label, permissions) => {
      auth.permissions = permissions;
      await createBoard();
      expect(screen.queryByRole('button', { name: '메뉴에 붙이기' })).toBeNull();
      expect(screen.getByText(/메뉴 연결은 메뉴 관리 권한이 있는 관리자에게 요청하세요/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '주소 복사' })).toBeInTheDocument();
      expect(screen.getByText(`/admin/community/boards/select-board-list?bbsId=${BOARD_ID}`)).toBeInTheDocument();
    });
  });

  // [2026-10-26 WIZ-15] 생성 응답을 받지 못하면 같은 이름으로 방금 만든 게시판을 찾아 이어 가자고 제안한다 — 다시 만들어 겹치지 않게.
  describe('생성 결과를 모를 때', () => {
    async function submitWithLostResponse() {
      createBoardMaster.mockRejectedValueOnce(new Error('synthetic response lost'));
      render(<BoardMakerWizard />);
      fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
      await goToStep('최종 확인');
      fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
      expect(await screen.findByText(/게시판 생성 결과를 확인하지 못했습니다\. 입력값은 유지됩니다\./)).toBeInTheDocument();
    }

    it('같은 이름으로 방금 만든 게시판을 찾으면 그 게시판으로 이어 간다', async () => {
      getBoardMasterList.mockResolvedValue({ list: [summary()], total: 1, page: 1, size: 20, totalPage: 1 });
      await submitWithLostResponse();
      expect(getBoardMasterList).toHaveBeenCalledWith({ searchKeyword: '사내 소식', searchUseYn: 'N', page: 1, size: 20 }, { suppressErrorToast: true });
      expect(await screen.findByText(new RegExp(`같은 이름으로 방금 만든 게시판이 있습니다 — 사내 소식\\(ID ${BOARD_ID}`))).toBeInTheDocument();
      expect(screen.getByText(/다시 만들면 같은 이름의 게시판이 하나 더 생깁니다/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '이 게시판으로 계속하기' }));
      await screen.findByRole('heading', { name: '게시판 만들기 완료' });
      expect(summaryValue('게시판 ID')).toBe(BOARD_ID);
      expect(createBoardMaster).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['만든 시각이 오래된 게시판', summary({ crtDt: seoulLocal(Date.now() - 60 * 60 * 1000) })],
      ['화면 유형이 다른 게시판', summary({ tmpltId: 'TMPLT_LIST' })],
      ['이름이 일부만 같은 게시판', summary({ bbsTtl: '사내 소식 모음' })],
      ['만든 시각을 알 수 없는 게시판', summary({ crtDt: undefined })],
    ])('%s은 이어 가자고 제안하지 않고 목록 확인을 안내한다', async (_label, candidate) => {
      getBoardMasterList.mockResolvedValue({ list: [candidate], total: 1, page: 1, size: 20, totalPage: 1 });
      await submitWithLostResponse();
      expect(await screen.findByText(/같은 이름으로 방금 만든 게시판을 찾지 못했습니다\. 게시판 목록에서 생성 여부를 확인한 뒤 다시 시도해 주세요\./)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '이 게시판으로 계속하기' })).toBeNull();
    });

    // 찾는 동안 제출을 잠근다 — '확인하는 중'에 다시 만들면 같은 게시판이 하나 더 생긴다.
    it('방금 만든 게시판을 찾는 동안에는 다시 만들 수 없다', async () => {
      let resolveSearch: (value: unknown) => void = () => {};
      getBoardMasterList.mockImplementation(() => new Promise((resolve) => { resolveSearch = resolve; }));
      await submitWithLostResponse();
      const submit = screen.getByRole('button', { name: '생성 여부 확인 중…' });
      expect(submit).toBeDisabled();
      fireEvent.click(submit);
      expect(createBoardMaster).toHaveBeenCalledTimes(1);
      await act(async () => { resolveSearch({ list: [], total: 0, page: 1, size: 20, totalPage: 1 }); });
      await waitFor(() => expect(screen.getByRole('button', { name: '게시판 만들기' })).toBeEnabled());
    });

    it('게시판 목록을 볼 권한이 없으면 찾지 않고 안내만 한다', async () => {
      auth.permissions = ['BBS_MST_CREATE'];
      await submitWithLostResponse();
      expect(await screen.findByText(/게시판 목록을 볼 권한이 없어 생성 여부를 확인할 수 없습니다/)).toBeInTheDocument();
      expect(getBoardMasterList).not.toHaveBeenCalled();
    });

    it('서버가 거부하면(4xx) 사유를 화면에 보이고 목록을 찾지 않는다', async () => {
      createBoardMaster.mockRejectedValueOnce({ response: { status: 404, data: { message: '커뮤니티를 찾을 수 없습니다.' } } });
      render(<BoardMakerWizard />);
      fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
      await goToStep('최종 확인');
      fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
      expect(await screen.findByText('게시판을 만들지 못했습니다. 커뮤니티를 찾을 수 없습니다. 입력값은 유지됩니다.')).toBeInTheDocument();
      expect(getBoardMasterList).not.toHaveBeenCalled();
    });
  });

  it('findJustCreatedBoard 는 이름·화면 유형이 같고 사용 안 함이며 방금 만든 게시판만 고른다', () => {
    const now = Date.now();
    const draft = { bbsTtl: '사내 소식', tmpltId: 'TMPLT_HUB' };
    expect(findJustCreatedBoard([summary()] as never, draft, now)?.bbsId).toBe(BOARD_ID);
    expect(findJustCreatedBoard([summary({ useYn: 'Y' })] as never, draft, now)).toBeNull();
    expect(findJustCreatedBoard([summary({ crtDt: seoulLocal(now - 11 * 60 * 1000) })] as never, draft, now)).toBeNull();
    expect(findJustCreatedBoard([summary({ crtDt: 'not-a-date' })] as never, draft, now)).toBeNull();
    // 귀속 커뮤니티가 다르면 같은 이름·유형이어도 고르지 않는다.
    const bound = summary({ community: { cmntySn: 7, cmntyNm: '신규 입사자', inUse: true } });
    expect(findJustCreatedBoard([bound] as never, draft, now)).toBeNull();
    expect(findJustCreatedBoard([summary()] as never, { ...draft, cmntySn: 7 }, now)).toBeNull();
    expect(findJustCreatedBoard([bound] as never, { ...draft, cmntySn: 7 }, now)?.bbsId).toBe(BOARD_ID);
    // 시간대 표기가 있는 값은 그 표기를 따른다.
    expect(findJustCreatedBoard([summary({ crtDt: new Date(now - 60_000).toISOString() })] as never, draft, now)?.bbsId).toBe(BOARD_ID);
  });

  it('다른 게시판 만들기는 처음 단계의 빈 마법사로 되돌린다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    await createBoard();
    fireEvent.click(screen.getByRole('button', { name: '다른 게시판 만들기' }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toHaveValue('');
  });

  // [2026-10-23 §5.3] 용도는 아직 직접 바꾸지 않은 칸만 채운다.
  it('용도를 고르면 직접 바꾸지 않은 칸만 채우고, 무엇을 채우고 남겼는지 알린다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    // 만족도를 직접 끈 뒤 자료실형(만족도 받음)을 골라도 끈 값이 남는다.
    fireEvent.click(screen.getByRole('checkbox', { name: /만족도 평가 받기/ }));
    fireEvent.click(screen.getByRole('button', { name: /이전 단계/ }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    fireEvent.click(screen.getByRole('radio', { name: '자료실형' }));
    expect(screen.getByText('직접 바꾼 항목(만족도 평가 받기)은 그대로 두고 나머지를 자료실형 추천값으로 채웠습니다.'))
      .toHaveAttribute('role', 'status');
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({
      tmpltId: 'TMPLT_LIST', bbsTypeCd: 'BBST02', ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 10,
    });
  });

  // [2026-10-26 WIZ-10] 용도마다 무엇을 채우는지 한 줄로 보인다 — 실제로 채우는 칸(예약·고정·추천·비밀글 포함)을 빠짐없이 말한다.
  it('용도마다 채우는 값을 한 줄로 보이고, 직접 바꾼 칸이 없으면 모두 채웠다고 알린다', () => {
    render(<BoardMakerWizard />);
    const notice = screen.getByRole('radio', { name: '공지형' });
    expect(document.getElementById(notice.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /댓글 받지 않음 · 만족도 받지 않음 · 추천 받지 않음 · 첨부 3개 · 예약 게시 받음 · 상단 고정 허용\(5건·30일\) · 비밀글 없음/,
    );
    const qna = screen.getByRole('radio', { name: '질의응답형' });
    expect(document.getElementById(qna.getAttribute('aria-describedby') ?? '')).toHaveTextContent(/비밀글 선택/);
    fireEvent.click(notice);
    expect(screen.getByText('화면 유형과 기능 칸을 공지형 추천값으로 채웠습니다.')).toHaveAttribute('role', 'status');
  });

  // [2026-10-23 ADR-0040 결정 3·6, §5.3] 예약 게시는 기본 받지 않음이고 공지형 용도만 켠다. 직접 바꾼 값은 용도가 덮지 않는다.
  it('예약 게시는 기본 받지 않음이고, 공지형을 고르면 받음으로 채워 생성 요청에 싣는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지' } });
    fireEvent.click(screen.getByRole('radio', { name: '공지형' }));
    await goToStep('화면·기능');
    expect(screen.getByRole('checkbox', { name: /예약 게시 받기/ })).toBeChecked();
    await goToStep('최종 확인');
    expect(summaryValue('예약 게시')).toBe('받음');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ rsvtPstgPsbltyYn: 'Y', useYn: 'N' });
  });

  it('예약 게시를 직접 끈 뒤 공지형을 골라도 끈 값이 남는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지' } });
    await goToStep('화면·기능');
    const reservation = screen.getByRole('checkbox', { name: /예약 게시 받기/ });
    expect(reservation).not.toBeChecked();
    fireEvent.click(reservation);
    fireEvent.click(reservation);
    fireEvent.click(screen.getByRole('button', { name: /이전 단계/ }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    fireEvent.click(screen.getByRole('radio', { name: '공지형' }));
    expect(screen.getByText('직접 바꾼 항목(예약 게시 받기)은 그대로 두고 나머지를 공지형 추천값으로 채웠습니다.')).toBeInTheDocument();
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ rsvtPstgPsbltyYn: 'N' });
  });

  // [2026-10-23 ADR-0040 결정 5·6, §5.3] 상단 고정은 기본 허용 안 함(상한 5·기본 30일)이고 공지형 용도만 켠다.
  it('상단 고정은 공지형을 고르면 허용으로 채워 상한·기본 일수와 함께 생성 요청에 싣는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지' } });
    fireEvent.click(screen.getByRole('radio', { name: '공지형' }));
    await goToStep('화면·기능');
    expect(screen.getByRole('checkbox', { name: /상단 고정 받기/ })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' })).toHaveValue(5);
    expect(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' })).not.toHaveAttribute('readonly');
    expect(screen.getByRole('spinbutton', { name: '상단 고정 기본 일수(일)' })).toHaveValue(30);
    await goToStep('최종 확인');
    expect(summaryValue('상단 고정')).toBe('허용(상한 5건 · 기본 30일)');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({
      upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, rsvtPstgPsbltyYn: 'Y', useYn: 'N',
    });
  });

  it('상단 고정은 기본 허용 안 함이고, 그동안 상한·기본 일수는 읽기 전용이며 기본값으로 생성 요청에 싣는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    expect(screen.getByRole('checkbox', { name: /상단 고정 받기/ })).not.toBeChecked();
    expect(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' })).toHaveAttribute('readonly');
    await goToStep('최종 확인');
    expect(summaryValue('상단 고정')).toBe('허용 안 함');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30 });
  });

  it('상단 고정을 직접 바꾼 값은 용도가 덮지 않고, 생성 스키마 범위를 넘는 상한은 다음 단계로 가지 않는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지' } });
    await goToStep('화면·기능');
    fireEvent.click(screen.getByRole('checkbox', { name: /상단 고정 받기/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    expect(await screen.findByText('상단 고정 상한은 100건까지 정할 수 있습니다.')).toBeInTheDocument();
    expect(currentStepTitle()).toBe('화면·기능');

    fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /상단 고정 받기/ }));
    fireEvent.click(screen.getByRole('button', { name: /이전 단계/ }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    fireEvent.click(screen.getByRole('radio', { name: '공지형' }));
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    // 직접 끈 고정 허용과 직접 바꾼 상한은 공지형 용도가 덮지 않는다.
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ upendFixPsbltyYn: 'N', upendFixUplmtNocs: 3, upendFixBscDayCnt: 30 });
  });

  // [2026-10-23 ADR-0040 결정 6·7, §5.3] 비밀글 정책은 기본 없음·추천은 기본 받음이고, 질의응답형은 선택, 공지형은 추천을 받지 않는다.
  it('비밀글 정책·추천 받기는 기본 없음·받음으로 생성 요청에 싣는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    expect(screen.getByRole('combobox', { name: '비밀글 정책' })).toHaveValue('NONE');
    expect(screen.getByRole('checkbox', { name: /추천 받기/ })).toBeChecked();
    await goToStep('최종 확인');
    expect([summaryValue('비밀글 정책'), summaryValue('추천')]).toEqual(['없음', '받음']);
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y', useYn: 'N' });
  });

  it.each([
    ['질의응답형', { prvtPstPlcyCd: 'OPTIONAL', rcmdtnUseYn: 'Y' }, ['선택', '받음']],
    ['공지형', { prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'N' }, ['없음', '받지 않음']],
    ['자료실형', { prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' }, ['없음', '받음']],
  ] as const)('%s 용도는 비밀글 정책·추천 받기를 설계서 표대로 채운다', async (purpose, expected, shown) => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '용도 게시판' } });
    fireEvent.click(screen.getByRole('radio', { name: purpose }));
    await goToStep('화면·기능');
    expect(screen.getByRole('combobox', { name: '비밀글 정책' })).toHaveValue(expected.prvtPstPlcyCd);
    await goToStep('최종 확인');
    expect([summaryValue('비밀글 정책'), summaryValue('추천')]).toEqual(shown);
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ ...expected, useYn: 'N' });
  });

  it('비밀글 정책·추천 받기를 직접 바꾼 값은 용도가 덮지 않는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '문의' } });
    await goToStep('화면·기능');
    fireEvent.change(screen.getByRole('combobox', { name: '비밀글 정책' }), { target: { value: 'REQUIRED' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /추천 받기/ }));
    fireEvent.click(screen.getByRole('button', { name: /이전 단계/ }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    fireEvent.click(screen.getByRole('radio', { name: '질의응답형' }));
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ prvtPstPlcyCd: 'REQUIRED', rcmdtnUseYn: 'N', tmpltId: 'TMPLT_QNA' });
  });

  it('질의응답형은 Q&A 화면 유형을 고른다 — 화면 유형을 직접 고른 뒤에는 바꾸지 않는다', async () => {
    createBoardMaster.mockResolvedValue(BOARD_ID);
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '문의' } });
    fireEvent.click(screen.getByRole('radio', { name: '질의응답형' }));
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ tmpltId: 'TMPLT_QNA' });
  });

  /*
    [2026-10-01] 제출 버튼은 그 동작의 기능 권한으로 보인다.
    [2026-10-26 ADR-0043 결정 1] 마지막 제출은 게시판 생성(BBS_MST_CREATE) 하나다 — 메뉴 권한은 묻지 않는다.
  */
  it('게시판 생성 권한이 없으면 첫 단계부터 사유를 보이고 다음 단계·제출 버튼을 두지 않는다', async () => {
    auth.permissions = ['BBS_MST_READ', ...MENU_PERMISSIONS];
    render(<BoardMakerWizard />);

    // 단계를 다 채운 뒤에 알리지 않는다 — 만들 수 없는 마법사는 첫 화면에서 말한다.
    expect(screen.getByText('게시판을 만들 권한이 없습니다.')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: /다음 단계로/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '게시판 만들기' })).toBeNull();
    expect(createBoardMaster).not.toHaveBeenCalled();
  });

  it('does not advance on an invalid first step and exposes summary, inline error, and focus', async () => {
    render(<BoardMakerWizard />);
    const title = screen.getByRole('textbox', { name: '게시판 명칭' });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));

    expect(createBoardMaster).not.toHaveBeenCalled();
    expect(await screen.findByText('게시판 명칭을 2자 이상 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText(/입력 오류 1개/)).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole('heading', { name: '용도·기본정보' })).toBeInTheDocument();
  });

  it('reveals the hidden owning step and preserves values for a server field error', async () => {
    createBoardMaster.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'bbsTtl', message: '같은 게시판 명칭이 이미 존재합니다.' }] } },
    });
    render(<BoardMakerWizard />);
    const title = screen.getByRole('textbox', { name: '게시판 명칭' });
    fireEvent.change(title, { target: { value: '사내 소식' } });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '화면·기능' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '최종 확인' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    expect(await screen.findByText('같은 게시판 명칭이 이미 존재합니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '용도·기본정보' })).toBeInTheDocument();
    const restoredTitle = screen.getByRole('textbox', { name: '게시판 명칭' });
    expect(restoredTitle).toHaveValue('사내 소식');
    await waitFor(() => expect(restoredTitle).toHaveFocus());
    // 필드 오류는 결과 모름이 아니다 — 같은 이름의 게시판을 찾지 않는다.
    expect(getBoardMasterList).not.toHaveBeenCalled();
  });

  it('same-tick의 최종 제출을 한 번만 전송하고 버튼을 잠근다', async () => {
    let resolveBoard: (id: string) => void = () => undefined;
    createBoardMaster.mockReturnValueOnce(new Promise<string>((resolve) => { resolveBoard = resolve; }));
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), {
      target: { value: '사내 소식' },
    });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '화면·기능' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '최종 확인' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    const submit = screen.getByRole('button', { name: '게시판 만들기' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent('게시판 만드는 중…');

    await act(async () => resolveBoard(BOARD_ID));
    await screen.findByRole('heading', { name: '게시판 만들기 완료' });
    expect(createBoardMaster).toHaveBeenCalledTimes(1);
  });

  /*
    [2026-09-08 PD-CMTY-001] 커뮤니티 귀속.

    귀속을 설정할 수 있는 화면이 없으면 회원 전용 게시판은 **구조적으로 만들어질 수 없고**,
    서버 게이트도 커뮤니티 상세의 목록도 영원히 빈 기능이 된다(ISG·설문 응답자가 그랬다).
    그래서 이 마법사가 유일한 생산자이며, 여기서 고정하는 것은 둘이다 —
    선택하지 않으면 필드를 **보내지 않고**, 선택하면 숫자로 보낸다.
  */
  // 커뮤니티 귀속은 시연 팩 마커 안이다 — 커뮤니티 서비스가 투영으로 빠진 생성물에서는 이 묶음을 등록하지 않는다(원본에서는 그대로다).
  if (inProjection('frontend/src/services/business/user/community/CommunityUserService.ts')) describe('커뮤니티 귀속', () => {
    async function fillToLastStep() {
      fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), {
        target: { value: '연구 자료실' },
      });
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: '화면·기능' });
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: '최종 확인' });
    }

    it('사용 중인 커뮤니티만 후보로 두고, 고르지 않으면 귀속 필드를 보내지 않는다', async () => {
      createBoardMaster.mockResolvedValue('BBS_TEST');
      render(<BoardMakerWizard />);

      const select = screen.getByLabelText('커뮤니티 귀속');
      expect(select).toHaveValue('');
      expect(screen.getByRole('option', { name: '연구모임' })).toBeInTheDocument();
      // 사용 중지된 커뮤니티에 새 게시판을 붙일 이유가 없다 — 후보에서 뺀다.
      expect(screen.queryByRole('option', { name: '폐쇄된 모임' })).toBeNull();

      await fillToLastStep();
      expect(summaryValue('커뮤니티 귀속')).toBe('귀속하지 않음 (만든 뒤 바꿀 수 없음)');
      fireEvent.submit(screen.getByRole('button', { name: '게시판 만들기' }).closest('form')!);

      await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
      // undefined 로 보내는 것과 다르다 — 서버는 값이 있으면 존재를 검증하고 없으면 귀속 없음이다.
      expect(createBoardMaster.mock.calls[0][0]).not.toHaveProperty('cmntySn');
    });

    it('커뮤니티를 고르면 숫자로 실어 보낸다 — 그 게시판은 회원 전용이 된다', async () => {
      createBoardMaster.mockResolvedValue('BBS_TEST');
      render(<BoardMakerWizard />);

      fireEvent.change(screen.getByLabelText('커뮤니티 귀속'), { target: { value: '7' } });
      await fillToLastStep();
      expect(summaryValue('커뮤니티 귀속')).toBe('연구모임 (만든 뒤 바꿀 수 없음)');
      fireEvent.submit(screen.getByRole('button', { name: '게시판 만들기' }).closest('form')!);

      await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
      expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ cmntySn: 7 });
    });

    // [2026-10-26 ADR-0043 결정 1] 귀속 게시판의 입구는 커뮤니티 화면이다 — 메뉴 안내를 건너뛰고, 사용 전환 안내도 회원 범위로 말한다.
    it('귀속 게시판의 결과 화면은 메뉴 대신 커뮤니티 입구를 안내한다', async () => {
      auth.permissions = [...BOARD_PERMISSIONS, ...MENU_PERMISSIONS, 'BBS_MST_UPDATE'];
      createBoardMaster.mockResolvedValue(BOARD_ID);
      render(<BoardMakerWizard />);
      fireEvent.change(screen.getByLabelText('커뮤니티 귀속'), { target: { value: '7' } });
      await fillToLastStep();
      fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
      await screen.findByRole('heading', { name: '게시판 만들기 완료' });
      expect(screen.getByText(/이 게시판의 입구는 커뮤니티 화면입니다/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '메뉴에 붙이기' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: '지금 사용으로 바꾸기' }));
      await waitFor(() => expect(batchUpdateBoardMasterStatus).toHaveBeenCalledWith([BOARD_ID], 'Y'));
      expect(confirmMock.mock.calls[0][0].message).toContain('귀속 커뮤니티의 승인 회원과 관리자가');
      await waitFor(() => expect(summaryValue('상태')).toBe('사용 중 — 귀속 커뮤니티의 승인 회원에게 열려 있습니다'));
    });
  });
});
