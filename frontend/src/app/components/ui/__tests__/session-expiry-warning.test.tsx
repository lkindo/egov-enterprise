import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { SessionExpiryWarning } from '../session-expiry-warning';

/**
 * 회귀 방어: "세션 연장을 눌러도 팝업이 30초마다 다시 뜬다".
 *
 * 원인은 연장 호출이 client.post('/auth/reissue') 였던 것이다. axios baseURL 이 브라우저에서
 * '/api/v1' 이라 '/api/v1/auth/reissue' 로 나갔고, 이 경로는 next.config rewrite 로 백엔드에
 * 그대로 전달되므로 **200 으로 성공**했다(그래서 catch 도, 에러 로그도 없었다).
 * 그러나 accessToken·session_exp 쿠키를 심는 주체는 Next Route Handler('/api/auth/reissue') 뿐이라
 * 만료시각은 옛 값 그대로 남았고, 팝업만 닫힌 뒤 다음 체크에서 다시 떴다.
 *
 * 따라서 이 테스트는 "reissue 가 호출됐는가"만 보지 않는다 — 그건 버그 시절에도 참이었다.
 * **만료시각이 실제로 갱신됐을 때만 경고가 닫히는가**를 본다.
 */

const logoutMock = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ user: { userId: 'webmaster' }, logout: logoutMock }),
}));

// vitest.setup.ts 의 글로벌 Dialog 모킹은 open 을 무시하고 children 을 항상 렌더한다.
// 그러면 "경고가 닫혔는가"를 DOM 으로 관측할 수 없어 이 테스트의 핵심 명제가 증명되지 않는다.
// 파일 로컬 모킹으로 덮어써 open 을 존중하게 한다(실제 Radix 동작과 동일한 관측 가능성 확보).
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div role="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const reissueMock = vi.fn();
vi.mock('@/services/foundation/auth/authService', () => ({
    authService: { reissue: (...args: unknown[]) => reissueMock(...args) },
}));

/** session_exp 쿠키를 지금으로부터 offsetMs 뒤로 설정한다. */
function setSessionExp(offsetMs: number) {
    document.cookie = `session_exp=${Date.now() + offsetMs}; path=/`;
}

describe('SessionExpiryWarning', () => {
    beforeEach(() => {
        reissueMock.mockReset();
        logoutMock.mockReset();
    });

    afterEach(() => {
        document.cookie = 'session_exp=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });

    it('만료 5분 이내면 경고를 띄운다', async () => {
        setSessionExp(2 * 60 * 1000); // 2분 남음
        render(<SessionExpiryWarning />);
        expect(await screen.findByText('세션이 곧 만료됩니다')).toBeInTheDocument();
    });

    it('연장이 만료시각을 실제로 갱신하면 경고를 닫는다', async () => {
        setSessionExp(2 * 60 * 1000);
        // Route Handler 가 하는 일을 흉내낸다: 성공 시 서버가 session_exp 쿠키를 미래로 재설정.
        reissueMock.mockImplementation(async () => {
            setSessionExp(30 * 60 * 1000);
        });

        render(<SessionExpiryWarning />);
        await userEvent.click(await screen.findByRole('button', { name: '세션 연장' }));

        await waitFor(() => expect(reissueMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('[회귀] 200 을 받아도 만료시각이 그대로면 경고를 닫지 않고 실패를 알린다', async () => {
        setSessionExp(2 * 60 * 1000);
        // 버그 재현: 호출은 성공(resolve)하지만 쿠키는 갱신되지 않는다.
        // 종전 구현은 여기서 팝업을 닫았고, 그래서 30초 뒤 다시 떴다.
        reissueMock.mockResolvedValue({ accessToken: 'new-token' });

        render(<SessionExpiryWarning />);
        await userEvent.click(await screen.findByRole('button', { name: '세션 연장' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('세션 연장에 실패했습니다');
        // 경고가 그대로 열려 있어야 사용자가 재시도/로그아웃을 선택할 수 있다.
        expect(screen.getByText('세션이 곧 만료됩니다')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('연장 호출이 예외로 실패해도 경고를 유지한다', async () => {
        setSessionExp(2 * 60 * 1000);
        reissueMock.mockRejectedValue(new Error('401 Unauthorized'));

        render(<SessionExpiryWarning />);
        await userEvent.click(await screen.findByRole('button', { name: '세션 연장' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('세션 연장에 실패했습니다');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});
