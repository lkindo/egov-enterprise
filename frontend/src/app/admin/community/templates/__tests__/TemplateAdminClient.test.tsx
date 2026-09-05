import { Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TemplateAdminClient, { templateFormSchema } from '../TemplateAdminClient';

const mocks = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getTemplateList: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/community/templates',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/services/foundation/system/TemplateAdminService', () => ({
  templateAdminService: {
    createTemplate: mocks.createTemplate,
    updateTemplate: mocks.updateTemplate,
    deleteTemplate: mocks.deleteTemplate,
    getTemplateList: mocks.getTemplateList,
  },
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

type TemplateRow = { tmpltId: string; tmpltNm: string; tmpltSeCd: string; tmpltPath: string; useYn: string };

function renderClient(templates: TemplateRow[] = []) {
  const templatesPromise = Object.assign(Promise.resolve(templates), {
    status: 'fulfilled' as const,
    value: templates,
  });

  return render(
    <Suspense fallback={<span>템플릿 로딩</span>}>
      <TemplateAdminClient templatesPromise={templatesPromise} />
    </Suspense>,
  );
}

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  renderClient();
  await user.click(screen.getByRole('button', { name: '신규 템플릿 등록' }));
  const dialog = await screen.findByRole('dialog');
  const scope = within(dialog);
  return {
    dialog,
    // [2026-08-29] 신설 필수 입력. 종전에는 폼이 이 값을 묻지 않아 등록이 언제나 실패했다.
    id: scope.getByRole('textbox', { name: '템플릿 ID' }),
    name: scope.getByRole('textbox', { name: '템플릿 명칭' }),
    path: scope.getByRole('textbox', { name: '소스 경로' }),
    cancel: scope.getByRole('button', { name: '취소' }),
    submit: scope.getByRole('button', { name: '등록 승인' }),
  };
}

describe('TemplateAdminClient validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTemplate.mockResolvedValue(undefined);
    mocks.getTemplateList.mockResolvedValue([]);
  });

  it('100자를 넘는 템플릿 명칭을 write sink로 보내지 않고 해당 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await openCreateDialog(user);
    await user.type(fields.id, 'TMPLT_T1');
    fireEvent.change(fields.name, { target: { value: '가'.repeat(101) } });
    await user.type(fields.path, '/templates/default');

    await user.click(fields.submit);

    expect(mocks.createTemplate).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 100자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('등록 pending 중 닫기를 막고 서버 필드 오류 뒤 modal·입력·summary를 보존한다', async () => {
    let rejectCreate!: (reason?: unknown) => void;
    mocks.createTemplate.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectCreate = reject;
    }));
    const user = userEvent.setup();
    const fields = await openCreateDialog(user);
    await user.type(fields.id, 'TMPLT_T1');
    await user.type(fields.name, '기본 템플릿');
    await user.type(fields.path, '/templates/default');

    fireEvent.click(fields.submit);

    await waitFor(() => expect(mocks.createTemplate).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('템플릿 등록 중');
    expect(fields.cancel).toBeDisabled();
    fireEvent.click(fields.cancel);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectCreate({
      response: {
        data: { errors: [{ field: 'tmpltNm', message: '이미 등록된 템플릿 명칭입니다.' }] },
      },
    }));

    expect(await screen.findAllByText('이미 등록된 템플릿 명칭입니다.')).not.toHaveLength(0);
    expect(fields.name).toHaveValue('기본 템플릿');
    expect(fields.path).toHaveValue('/templates/default');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 등록된 템플릿 명칭입니다.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(fields.cancel).toBeEnabled();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('일반 서버 오류는 토스트로 안내하고 입력값을 보존한다', async () => {
    mocks.createTemplate.mockRejectedValueOnce(new Error('네트워크 연결을 확인해 주세요.'));
    const user = userEvent.setup();
    const fields = await openCreateDialog(user);
    await user.type(fields.id, 'TMPLT_T1');
    await user.type(fields.name, '보존할 템플릿');
    await user.type(fields.path, '/templates/preserved');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('네트워크 연결을 확인해 주세요.', 'error'));
    expect(fields.name).toHaveValue('보존할 템플릿');
    expect(fields.path).toHaveValue('/templates/preserved');
  });

  it('등록 pending 중 연속 클릭해도 create를 한 번만 호출한다', async () => {
    let resolveCreate!: () => void;
    mocks.createTemplate.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    const fields = await openCreateDialog(user);
    await user.type(fields.id, 'TMPLT_T1');
    await user.type(fields.name, '중복 방지 템플릿');
    await user.type(fields.path, '/templates/pending');

    await user.dblClick(fields.submit);

    await waitFor(() => expect(mocks.createTemplate).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveCreate();
    await waitFor(() => expect(mocks.getTemplateList).toHaveBeenCalled());
  });

  it('템플릿 DTO/DB 문자열 경계와 Y/N 형식을 보존한다', () => {
    const valid = {
      tmpltId: 'T'.repeat(20),
      tmpltNm: '가'.repeat(100),
      tmpltSeCd: 'A'.repeat(12),
      tmpltPath: '/'.repeat(1000),
      useYn: 'Y',
    };

    expect(templateFormSchema.safeParse(valid).success).toBe(true);
    expect(templateFormSchema.safeParse({ ...valid, tmpltNm: '   ' }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltSeCd: '   ' }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltPath: '   ' }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltNm: '가'.repeat(101) }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltSeCd: 'A'.repeat(13) }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltPath: '/'.repeat(1001) }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, useYn: 'X' }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltNm: 123 }).success).toBe(false);
    // [2026-08-29] tmpltId 는 PK 이자 NOT NULL 이다 — 비었거나 길면 등록이 DB 에서 죽는다.
    expect(templateFormSchema.safeParse({ ...valid, tmpltId: '   ' }).success).toBe(false);
    expect(templateFormSchema.safeParse({ ...valid, tmpltId: 'T'.repeat(21) }).success).toBe(false);
  });
});

/**
 * [2026-09-05 DEC-OPS-036] 정정 경로 — 종전에는 등록·조회만 가능했다(감사 D11-02).
 * 수정은 같은 다이얼로그를 재사용하되 템플릿 ID(PK)를 잠그고 update 를 경로 ID 로 부른다.
 * 삭제는 확인 후 한 번만 부르고 pending 동안 disabled·aria-busy, 실패는 토스트다.
 */
describe('TemplateAdminClient 수정·삭제', () => {
  const ROW: TemplateRow = { tmpltId: 'TMPLT_1', tmpltNm: '공지 템플릿', tmpltSeCd: 'TMPT01', tmpltPath: '/t/notice.html', useYn: 'Y' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTemplateList.mockResolvedValue([ROW]);
    mocks.updateTemplate.mockResolvedValue({ ...ROW, tmpltNm: '새 이름' });
    mocks.deleteTemplate.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정을 누르면 값이 채워진 다이얼로그가 열리고 템플릿 ID 는 잠기며, 승인은 update 를 경로 ID 로 부른다', async () => {
    const user = userEvent.setup();
    renderClient([ROW]);

    await user.click(await screen.findByRole('button', { name: '공지 템플릿 수정' }));
    const dialog = await screen.findByRole('dialog');
    const scope = within(dialog);
    expect(scope.getByRole('textbox', { name: '템플릿 ID' })).toHaveValue('TMPLT_1');
    expect(scope.getByRole('textbox', { name: '템플릿 ID' })).toBeDisabled();
    expect(scope.getByRole('textbox', { name: '템플릿 명칭' })).toHaveValue('공지 템플릿');

    fireEvent.change(scope.getByRole('textbox', { name: '템플릿 명칭' }), { target: { value: '새 이름' } });
    await user.click(scope.getByRole('button', { name: '수정 승인' }));

    await waitFor(() => expect(mocks.updateTemplate).toHaveBeenCalledTimes(1));
    expect(mocks.updateTemplate).toHaveBeenCalledWith('TMPLT_1', expect.objectContaining({ tmpltNm: '새 이름', tmpltPath: '/t/notice.html' }));
    expect(mocks.createTemplate).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('템플릿을 수정했습니다.', 'success');
    // 저장 뒤 목록을 서버에서 다시 읽는다.
    await waitFor(() => expect(mocks.getTemplateList).toHaveBeenCalledTimes(1));
  });

  it('삭제는 확인 후 delete 를 한 번만 부르고, pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러낸다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteTemplate.mockReturnValue(new Promise<void>((_, reject) => { rejectDelete = reject; }));
    renderClient([ROW]);
    const remove = await screen.findByRole('button', { name: '공지 템플릿 삭제' });

    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mocks.deleteTemplate).toHaveBeenCalledTimes(1));
    expect(mocks.deleteTemplate).toHaveBeenCalledWith('TMPLT_1');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    const busy = screen.getByRole('button', { name: '공지 템플릿 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    // act() 로 감싸 거부하면 이 화면에서는 뒤따르는 waitFor 가 돌아오지 않는다(실측) — 거부 후 DOM 복귀를 findBy 로 기다린다.
    rejectDelete(new Error('템플릿 삭제 권한이 없습니다.'));

    expect(await screen.findByRole('button', { name: '공지 템플릿 삭제' })).not.toBeDisabled();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('템플릿 삭제 권한이 없습니다.', 'error'));
    // 실패한 삭제는 목록에서 사라지지 않는다.
    expect(screen.getByText('공지 템플릿')).toBeInTheDocument();
  });

  it('확인을 취소하면 delete 를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderClient([ROW]);
    fireEvent.click(await screen.findByRole('button', { name: '공지 템플릿 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteTemplate).not.toHaveBeenCalled();
  });
});
