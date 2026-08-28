/**
 * 약식 결재 처리 계약.
 *
 * ── 종전 계약이 무엇을 잘못 고정하고 있었나 ────────────────────────────────────
 * 첫 테스트가 "**승인** 요청은 사유가 비면 막힌다"를 고정하고 있었다. 그런데 서버의 승인
 * 경로는 사유를 받지도 저장하지도 않는다 — `InformalSanction.approve()` 는 인자가 없고
 * `rjctRsnCn` 을 null 로 지운다. 반대로 `reject(reason)` 은 빈 값이면 예외를 낸다.
 *
 * 즉 화면은 승인자에게 글을 강제로 쓰게 한 뒤 그 글을 버리고 있었고, 테스트는 그 동작을
 * 정상으로 동결하고 있었다. 구현·테스트·명세 중 틀린 쪽은 화면과 테스트다(컬럼 이름
 * `rjct_rsn_cn` 자체가 '반려 사유'다). 그래서 필수 집행을 반려 경로로 옮기고 계약도 옮긴다.
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IsmClient from '../IsmClient';

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), refresh: vi.fn(), toast: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ isOpen, title, children, footer }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
  }) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));
vi.mock('@/services/foundation/system/IsmAdminService', () => ({
  SANCTION_STATUS: { REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R' },
  isSanctionPending: (value?: string) => !value || value === 'A',
  ismAdminService: { confirmInfrmlSanctn: (...args: unknown[]) => mocks.confirm(...args) },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, toolbarActions, children }: {
    title: string;
    actions?: ReactNode;
    toolbarActions?: ReactNode;
    children: ReactNode;
  }) => <main><h1>{title}</h1>{actions}{toolbarActions}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => <div>{data.map((item, row) => columns.map((column, index) => (
    <div key={`${row}-${index}`}>{column.accessor(item)}</div>
  )))}</div>,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: () => <span /> }));

const pendingSanction = {
  ifmlAtrzSn: 7,
  taskSeCd: 'REPORT',
  taskSeNm: '보고 결재',
  aplcntId: 'requester',
  aplcntNm: '신청자',
  aprvrId: 'approver',
  aprvYn: 'A',
};

const openModal = () => fireEvent.click(screen.getByRole('button', { name: /결재 처리/ }));
const reasonField = () => screen.getByRole('textbox', { name: /반려 사유/ });

describe('약식 결재 — 사유가 필요한 쪽과 아닌 쪽', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(undefined);
  });

  it('승인은 사유 없이 처리된다 — 서버가 승인 시 사유를 지우므로 요구할 이유가 없다', async () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: /최종 승인/ }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0]).toBe(7);
    expect(mocks.confirm.mock.calls[0][1]).toBe('C');
  });

  it('승인 버튼은 사유가 저장되지 않는다는 사실에 연결된다', () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();

    const note = screen.getByRole('button', { name: /최종 승인/ }).getAttribute('aria-describedby');
    expect(note).toBeTruthy();
    expect(document.getElementById(note!)).toHaveTextContent('승인할 때는 사유가 저장되지 않습니다');
  });

  it('반려는 사유가 비면 막고 그 필드로 연결한다 — 서버가 빈 사유를 예외로 막는다', async () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();
    const reason = reasonField();

    fireEvent.click(screen.getByRole('button', { name: /반려/ }));

    expect(await screen.findByText('반려 사유를 입력해 주세요.')).toBeVisible();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(reason).toHaveFocus());
  });

  it('사유를 채우면 반려가 그 값으로 나간다', async () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();
    fireEvent.change(reasonField(), { target: { value: '증빙이 누락되었습니다.' } });

    fireEvent.click(screen.getByRole('button', { name: /반려/ }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(7, 'R', '증빙이 누락되었습니다.'));
  });

  it('structured server field 오류를 inline으로 표시하고 입력한 사유와 모달을 보존한다', async () => {
    const message = '반려 사유에 사용할 수 없는 표현이 있습니다.';
    mocks.confirm.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'rjctRsnCn', message }] } },
    });
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();
    const reason = reasonField();
    fireEvent.change(reason, { target: { value: '사용자가 입력한 반려 근거' } });

    fireEvent.click(screen.getByRole('button', { name: /반려/ }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(reason).toHaveValue('사용자가 입력한 반려 근거');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(reason).toHaveFocus());
    expect(screen.getByRole('region', { name: '결재 처리' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

/**
 * 화면 문구가 실제 동작을 말한다.
 *
 * 종전에는 '모든 관계자에게 실시간으로 공유됩니다' 라고 했지만, SanctionEventListener 는
 * **신청자 한 사람**에게만, 그것도 연락처가 등록돼 있을 때만 보내고 실패는 로그로 삼킨다.
 * 목록 열 이름도 실제 데이터가 아니라 지어낸 기술 용어였다(도메인 및 아키텍처 / 결재
 * 아이덴티티 / 관리 조정).
 */
describe('약식 결재 — 화면 문구', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(undefined);
  });

  it('알림 범위를 과장하지 않는다', () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    openModal();

    expect(screen.getByText(/신청자에게 문자·메일로 알립니다/)).toBeVisible();
    expect(screen.queryByText(/모든 관계자/)).not.toBeInTheDocument();
    expect(screen.queryByText(/실시간으로 공유/)).not.toBeInTheDocument();
  });

  it('값이 없는 칸에 의사코드를 지어내지 않는다', () => {
    // 생성 계약상 이 필드들은 required string 이므로 결측은 undefined 가 아니라 빈 문자열로 온다.
    render(<IsmClient initialData={{
      list: [{ ifmlAtrzSn: 9, aprvYn: 'A', taskSeCd: '', aplcntId: '', aprvrId: '' }],
    }} />);

    expect(screen.getByText('업무 구분 없음')).toBeVisible();
    expect(screen.getByText('알 수 없음')).toBeVisible();
    expect(screen.queryByText(/STATIC_NODE|Untitled Sequence|UNKNOWN/)).not.toBeInTheDocument();
  });

  it('행 버튼은 승인만 한다고 말하지 않는다 — 모달에서 반려도 고를 수 있다', () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);

    expect(screen.getByRole('button', { name: /결재 처리/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /승인 실행/ })).not.toBeInTheDocument();
  });
});
