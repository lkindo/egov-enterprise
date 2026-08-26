import { Suspense } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TemplateAdminClient, { templateFormSchema } from '../TemplateAdminClient';

const mocks = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  getTemplateList: vi.fn(),
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
    getTemplateList: mocks.getTemplateList,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

function renderClient() {
  const templates: never[] = [];
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
  });
});
