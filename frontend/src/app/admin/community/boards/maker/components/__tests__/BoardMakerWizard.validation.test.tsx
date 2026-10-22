import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard, boardMakerFormSchema } from '../BoardMakerWizard';
import { inProjection } from '@/test-utils/projection';

const { createBoardMaster, createMenu, getAllMenus, communities, push } = vi.hoisted(() => ({
  push: vi.fn(),
  createBoardMaster: vi.fn(),
  createMenu: vi.fn(),
  getAllMenus: vi.fn(),
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
// 제출 버튼은 게시판 생성·메뉴 등록 권한으로 보인다 — 기본은 두 권한을 모두 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
const READ_ONLY_PERMISSIONS = ['MENU_READ', 'BBS_MST_READ', 'AUTHRT_READ'];
const FULL_PERMISSIONS = [...READ_ONLY_PERMISSIONS, 'BBS_MST_CREATE', 'MENU_CREATE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: communities.current }),
}));
vi.mock('@/services/business/user/community/CommunityUserService', () => ({
  communityUserService: { getCommunityList: vi.fn() },
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { createBoardMaster },
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { createMenu, getAllMenus },
}));
vi.mock('../BoardPreview', () => ({ BoardPreview: () => null }));

const STEP_TITLES = ['화면·기능', '메뉴·접근 확인', '최종 확인'] as const;

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
  menuNm: '사내 소식',
  upperMenuNo: '2000000',
  menuOrdr: 1,
};

describe('BoardMakerWizard validation', () => {
  beforeEach(() => {
    auth.permissions = FULL_PERMISSIONS;
    createBoardMaster.mockReset();
    push.mockReset();
    createMenu.mockReset();
    createMenu.mockResolvedValue(undefined);
    getAllMenus.mockReset().mockResolvedValue([]);
  });

  it('preserves board/menu DTO text and integer boundaries', () => {
    expect(boardMakerFormSchema.safeParse(validDraft).success).toBe(true);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsTtl: '가'.repeat(101) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, bbsExpln: '가'.repeat(4001) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, menuNm: '가'.repeat(101) }).success).toBe(false);
    expect(boardMakerFormSchema.safeParse({ ...validDraft, menuOrdr: 1.5 }).success).toBe(false);
  });

  it.each(['absent', 'already-created', 'read-error'])('retries only the menu after board creation succeeds: %s', async (outcome) => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    createMenu.mockRejectedValueOnce(new Error('synthetic response lost'));
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    for (const step of STEP_TITLES) {
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: step });
    }
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    const retry = await screen.findByRole('button', { name: '메뉴 등록 다시 시도' });
    await waitFor(() => expect(retry).not.toBeDisabled());
    expect(screen.getByText(/게시판은 생성되었습니다/)).toBeVisible();
    if (outcome === 'already-created') getAllMenus.mockResolvedValue([{ modernRoute: '/admin/community/boards/select-board-list?bbsId=BBSMSTR_AAAAAAAAAAAA', useYn: 'N' }]);
    if (outcome === 'read-error') getAllMenus.mockRejectedValue(new Error('synthetic read failed'));
    fireEvent.click(retry);
    await waitFor(() => expect(getAllMenus).toHaveBeenCalledTimes(1));
    if (outcome === 'read-error') {
      await waitFor(() => expect(retry).not.toBeDisabled());
      expect(screen.queryByRole('button', { name: '이 게시판 공개 준비 계속하기' })).not.toBeInTheDocument();
    } else {
      await screen.findByRole('button', { name: '이 게시판 공개 준비 계속하기' });
    }
    expect(createBoardMaster).toHaveBeenCalledTimes(1);
    expect(createMenu).toHaveBeenCalledTimes(outcome === 'absent' ? 2 : 1);
  });

  it('[DIP B5 F9] 게시판 기능(댓글·만족도·첨부) 선택을 생성 요청에 싣는다 — 기본은 모두 받음', async () => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
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
  });

  // [2026-10-23 ADR-0040 결정 1·§5.3] 게시판은 사용 안 함, 메뉴는 비활성으로 만들고 결과 화면이 운영 화면의 메뉴·접근 탭으로 잇는다.
  it('게시판을 사용 안 함으로 만들고, 공개 준비 계속하기가 운영 화면의 메뉴·접근 탭을 연다', async () => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('최종 확인');
    expect(screen.getByText(/게시판: 사용 안 함으로 만들어져 이용자에게 닫혀 있습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    await screen.findByRole('heading', { name: '게시판 만들기 완료' });
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ useYn: 'N' });
    expect(createMenu.mock.calls[0][0]).toMatchObject({ useYn: 'N' });
    // 공개 준비 점검은 게시판 사용 여부도 보므로, 사용으로 바꾼 뒤에 점검이 통과한다고 안내한다(따를 수 없는 순서를 말하지 않는다).
    //   이 사용자는 메뉴 수정·권한 배정·게시판 관리 수정 권한이 없어 둘 다 요청 안내다.
    expect(screen.getByText(/메뉴 관리 권한\(메뉴 수정, 권한 그룹 조회·배정\)이 있는 관리자에게 메뉴 활성화와 이용자 그룹 표시를 요청하세요/)).toBeInTheDocument();
    expect(screen.getByText(/게시판 관리 수정 권한이 있는 관리자에게 게시판을 사용으로 바꿔 달라고 요청하세요\. 공개 준비 점검은 사용으로 바꾼 뒤에 통과합니다/)).toBeInTheDocument();
    expect(screen.queryByText(/공개 준비 점검을 통과하면/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '이 게시판 공개 준비 계속하기' }));
    expect(push).toHaveBeenCalledWith('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=access');
  });

  it('메뉴 수정·권한 배정·게시판 관리 수정 권한이 있으면 남은 일을 직접 하라고 안내하고 이용자 그룹을 집어 말한다', async () => {
    auth.permissions = [...FULL_PERMISSIONS, 'MENU_UPDATE', 'AUTHRT_GRANT', 'BBS_MST_UPDATE'];
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await screen.findByRole('heading', { name: '게시판 만들기 완료' });
    expect(screen.getByText('메뉴 관리에서 메뉴를 활성화하고, 관리자 그룹이 아닌 이용자 그룹에 보이도록 함께 저장하세요.')).toBeInTheDocument();
    expect(screen.getByText(/설정 탭에서 게시판을 사용으로 바꾸고, 메뉴·접근 탭의 공개 준비 점검이 통과하는지 확인하세요/)).toBeInTheDocument();
  });

  it('운영 화면에 들어갈 권한(게시판 관리 조회)이 없으면 공개 준비 계속하기를 보이지 않는다', async () => {
    auth.permissions = ['MENU_READ', 'AUTHRT_READ', 'BBS_MST_CREATE', 'MENU_CREATE'];
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
    await screen.findByRole('heading', { name: '게시판 만들기 완료' });
    expect(screen.queryByRole('button', { name: '이 게시판 공개 준비 계속하기' })).toBeNull();
  });

  // [2026-10-23 §5.3] 용도는 아직 직접 바꾸지 않은 칸만 채운다.
  it('용도를 고르면 직접 바꾸지 않은 칸만 채운다', async () => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    await goToStep('화면·기능');
    // 만족도를 직접 끈 뒤 자료실형(만족도 받음)을 골라도 끈 값이 남는다.
    fireEvent.click(screen.getByRole('checkbox', { name: /만족도 평가 받기/ }));
    fireEvent.click(screen.getByRole('button', { name: /이전 단계/ }));
    await screen.findByRole('heading', { name: '용도·기본정보' });
    fireEvent.click(screen.getByRole('radio', { name: '자료실형' }));
    await goToStep('최종 확인');
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({
      tmpltId: 'TMPLT_LIST', bbsTypeCd: 'BBST02', ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 10,
    });
  });

  it('질의응답형은 Q&A 화면 유형을 고른다 — 화면 유형을 직접 고른 뒤에는 바꾸지 않는다', async () => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
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
    마지막 제출은 게시판 생성(BBS_MST_CREATE)과 메뉴 등록(MENU_CREATE)을 함께 한다. 종전에는 권한이 없어도 버튼이 보여
    네 단계를 다 채운 뒤 403 을 만났고, 메뉴 권한만 없으면 게시판만 만들어진 채 멈췄다.
  */
  it.each([
    { label: '게시판 생성 권한이 없으면', permissions: [...READ_ONLY_PERMISSIONS, 'MENU_CREATE'], message: '게시판을 만들 권한이 없습니다.' },
    { label: '메뉴 등록 권한만 없으면', permissions: [...READ_ONLY_PERMISSIONS, 'BBS_MST_CREATE'], message: '메뉴를 등록할 권한이 없어 게시판을 만들 수 없습니다.' },
    // [2026-10-23 ADR-0040 A0] 메뉴 등록 다시 시도는 전체 메뉴(MENU_READ)를 먼저 읽는다 — 없으면 게시판만 만들어진 채 멈춘다.
    { label: '메뉴 목록 조회 권한만 없으면', permissions: ['BBS_MST_READ', 'AUTHRT_READ', 'BBS_MST_CREATE', 'MENU_CREATE'], message: '메뉴 목록을 볼 권한이 없어 게시판을 만들 수 없습니다.' },
  ])('$label 첫 단계부터 사유를 보이고 다음 단계·제출 버튼을 두지 않는다', async ({ permissions, message }) => {
    auth.permissions = permissions;
    render(<BoardMakerWizard />);

    // 네 단계를 다 채운 뒤에 알리지 않는다 — 만들 수 없는 마법사는 첫 화면에서 말한다.
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: /다음 단계로/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '게시판 만들기' })).toBeNull();
    expect(createBoardMaster).not.toHaveBeenCalled();
    expect(createMenu).not.toHaveBeenCalled();
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
    await screen.findByRole('heading', { name: '메뉴·접근 확인' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '최종 확인' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));

    expect(await screen.findByText('같은 게시판 명칭이 이미 존재합니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '용도·기본정보' })).toBeInTheDocument();
    const restoredTitle = screen.getByRole('textbox', { name: '게시판 명칭' });
    expect(restoredTitle).toHaveValue('사내 소식');
    await waitFor(() => expect(restoredTitle).toHaveFocus());
  });

  it('same-tick의 최종 배포 중복 제출을 한 번만 전송하고 버튼을 잠근다', async () => {
    let resolveBoard: (id: string) => void = () => undefined;
    createBoardMaster.mockReturnValueOnce(new Promise<string>((resolve) => { resolveBoard = resolve; }));
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), {
      target: { value: '사내 소식' },
    });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '화면·기능' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '메뉴·접근 확인' });
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

    await act(async () => resolveBoard('BBS_TEST'));
    await waitFor(() => expect(createMenu).toHaveBeenCalledTimes(1));
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
      await screen.findByRole('heading', { name: '메뉴·접근 확인' });
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
      fireEvent.submit(screen.getByRole('button', { name: '게시판 만들기' }).closest('form')!);

      await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
      expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ cmntySn: 7 });
    });
  });
});
