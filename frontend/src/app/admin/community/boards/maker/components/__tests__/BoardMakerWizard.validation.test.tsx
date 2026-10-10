import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMakerWizard, boardMakerFormSchema } from '../BoardMakerWizard';
import { inProjection } from '@/test-utils/projection';

const { createBoardMaster, createMenu, getAllMenus, communities } = vi.hoisted(() => ({
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
  useRouter: () => ({ push: vi.fn() }),
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
  useYn: 'Y',
  cmntySn: '',
  menuNm: '사내 소식',
  upperMenuNo: '2000000',
  menuOrdr: 1,
};

describe('BoardMakerWizard validation', () => {
  beforeEach(() => {
    auth.permissions = FULL_PERMISSIONS;
    createBoardMaster.mockReset();
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
    for (const step of ['템플릿 선택', '접근 권한 안내', '메뉴 배포']) {
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: step });
    }
    fireEvent.click(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }));
    const retry = await screen.findByRole('button', { name: '메뉴 등록 다시 시도' });
    await waitFor(() => expect(retry).not.toBeDisabled());
    expect(screen.getByText(/게시판은 생성되었습니다/)).toBeVisible();
    if (outcome === 'already-created') getAllMenus.mockResolvedValue([{ modernRoute: '/admin/community/boards/select-board-list?bbsId=BBSMSTR_AAAAAAAAAAAA', useYn: 'N' }]);
    if (outcome === 'read-error') getAllMenus.mockRejectedValue(new Error('synthetic read failed'));
    fireEvent.click(retry);
    await waitFor(() => expect(getAllMenus).toHaveBeenCalledTimes(1));
    if (outcome === 'read-error') {
      await waitFor(() => expect(retry).not.toBeDisabled());
      expect(screen.queryByRole('button', { name: '생성한 메뉴 설정하기' })).not.toBeInTheDocument();
    } else {
      await screen.findByRole('button', { name: '생성한 메뉴 설정하기' });
    }
    expect(createBoardMaster).toHaveBeenCalledTimes(1);
    expect(createMenu).toHaveBeenCalledTimes(outcome === 'absent' ? 2 : 1);
  });

  it('[DIP B5 F9] 게시판 기능(댓글·만족도·첨부) 선택을 생성 요청에 싣는다 — 기본은 모두 받음', async () => {
    createBoardMaster.mockResolvedValue('BBSMSTR_AAAAAAAAAAAA');
    render(<BoardMakerWizard />);
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '사내 소식' } });
    expect(screen.getByRole('checkbox', { name: /댓글 받기/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /만족도 평가 받기/ })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /만족도 평가 받기/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /파일 첨부 허용/ }));
    for (const step of ['템플릿 선택', '접근 권한 안내', '메뉴 배포']) {
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: step });
    }
    fireEvent.click(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }));

    await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
    expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'N' });
  });

  /*
    [2026-10-01] 제출 버튼은 그 동작의 기능 권한으로 보인다.
    마지막 제출은 게시판 생성(BBS_MST_CREATE)과 메뉴 등록(MENU_CREATE)을 함께 한다. 종전에는 권한이 없어도 버튼이 보여
    네 단계를 다 채운 뒤 403 을 만났고, 메뉴 권한만 없으면 게시판만 만들어진 채 멈췄다.
  */
  it.each([
    { label: '게시판 생성 권한이 없으면', permissions: [...READ_ONLY_PERMISSIONS, 'MENU_CREATE'], message: '게시판을 만들 권한이 없습니다.' },
    { label: '메뉴 등록 권한만 없으면', permissions: [...READ_ONLY_PERMISSIONS, 'BBS_MST_CREATE'], message: '메뉴를 등록할 권한이 없어 게시판을 만들 수 없습니다.' },
  ])('$label 첫 단계부터 사유를 보이고 다음 단계·제출 버튼을 두지 않는다', async ({ permissions, message }) => {
    auth.permissions = permissions;
    render(<BoardMakerWizard />);

    // 네 단계를 다 채운 뒤에 알리지 않는다 — 만들 수 없는 마법사는 첫 화면에서 말한다.
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: /다음 단계로/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '게시판 생성 및 메뉴 배포' })).toBeNull();
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
    expect(screen.getByRole('heading', { name: '기본 설정' })).toBeInTheDocument();
  });

  it('reveals the hidden owning step and preserves values for a server field error', async () => {
    createBoardMaster.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'bbsTtl', message: '같은 게시판 명칭이 이미 존재합니다.' }] } },
    });
    render(<BoardMakerWizard />);
    const title = screen.getByRole('textbox', { name: '게시판 명칭' });
    fireEvent.change(title, { target: { value: '사내 소식' } });

    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '템플릿 선택' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '접근 권한 안내' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '메뉴 배포' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }));

    expect(await screen.findByText('같은 게시판 명칭이 이미 존재합니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '기본 설정' })).toBeInTheDocument();
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
    await screen.findByRole('heading', { name: '템플릿 선택' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '접근 권한 안내' });
    fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
    await screen.findByRole('heading', { name: '메뉴 배포' });
    expect(createBoardMaster).not.toHaveBeenCalled();
    const submit = screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' });
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
      await screen.findByRole('heading', { name: '템플릿 선택' });
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: '접근 권한 안내' });
      fireEvent.click(screen.getByRole('button', { name: /다음 단계로/ }));
      await screen.findByRole('heading', { name: '메뉴 배포' });
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
      fireEvent.submit(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }).closest('form')!);

      await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
      // undefined 로 보내는 것과 다르다 — 서버는 값이 있으면 존재를 검증하고 없으면 귀속 없음이다.
      expect(createBoardMaster.mock.calls[0][0]).not.toHaveProperty('cmntySn');
    });

    it('커뮤니티를 고르면 숫자로 실어 보낸다 — 그 게시판은 회원 전용이 된다', async () => {
      createBoardMaster.mockResolvedValue('BBS_TEST');
      render(<BoardMakerWizard />);

      fireEvent.change(screen.getByLabelText('커뮤니티 귀속'), { target: { value: '7' } });
      await fillToLastStep();
      fireEvent.submit(screen.getByRole('button', { name: '게시판 생성 및 메뉴 배포' }).closest('form')!);

      await waitFor(() => expect(createBoardMaster).toHaveBeenCalledTimes(1));
      expect(createBoardMaster.mock.calls[0][0]).toMatchObject({ cmntySn: 7 });
    });
  });
});
