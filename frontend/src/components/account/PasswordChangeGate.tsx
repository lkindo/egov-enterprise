'use client';

import { useId, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';
import { userService } from '@/services/business/user/userService';
import { ChangePasswordForm } from './ChangePasswordForm';

/**
 * 관리자가 초기화한 임시 비밀번호로 로그인한 사용자에게 앱 대신 비밀번호 변경 화면만 보인다(2026-10-01 결정 18).
 *
 * <p>서버는 이 사용자의 비밀번호 변경 밖 API 를 거부한다(PasswordChangeRequiredGuard). 앱을 그대로 그리면
 * 메뉴·알림·업무 화면의 조회가 모두 거부돼 오류만 보이므로, 앱 셸을 그리지 않고 이유와 할 일을 말한다.
 * 변경하면 서버가 이전 세션을 끊으므로 헤더의 본인 변경과 같이 다시 로그인하게 한다.
 */
export function PasswordChangeGate({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const titleId = useId();
  const [pending, setPending] = useState(false);

  if (!user?.passwordChangeRequired) return <>{children}</>;

  const leave = async () => {
    await logout();
    window.location.replace('/login');
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <section aria-labelledby={titleId} className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 id={titleId} className="text-xl font-bold">비밀번호를 바꿔 주세요</h1>
        <p className="text-sm text-muted-foreground">
          관리자가 초기화한 임시 비밀번호로 로그인했습니다. 새 비밀번호로 바꾼 뒤 다시 로그인하면 모든 기능을 쓸 수
          있습니다. 지금 바꾸지 않으려면 로그아웃하세요.
        </p>
        <ChangePasswordForm
          isPending={pending}
          cancelLabel="로그아웃"
          onCancel={() => { if (!pending) void leave(); }}
          onSubmit={async (oldPassword, newPassword) => {
            setPending(true);
            try {
              await userService.changePassword(oldPassword, newPassword);
              toast('비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해 주세요.', 'success');
              await leave();
            } finally {
              // 실패는 폼이 필드 오류·안내로 처리하도록 그대로 올려보낸다(입력 보존).
              setPending(false);
            }
          }}
        />
      </section>
    </main>
  );
}
