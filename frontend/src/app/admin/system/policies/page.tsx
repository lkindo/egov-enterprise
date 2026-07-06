import PolicyAdminClient from './PolicyAdminClient';

export const metadata = {
  title: '시스템 정책 관리 - 어드민',
  description: '접근 권한, 개인정보 처리 방침 등 시스템 정책을 관리합니다.',
};

export default function PolicyAdminPage() {
  return <PolicyAdminClient />;
}
