import PolicyAdminClient from './PolicyAdminClient';

export const metadata = {
  title: '시스템 정책 관리 - 어드민',
  description: '저작권, 개인정보처리방침 등 시스템 정책을 관리합니다.',
};

export default function PolicyAdminPage() {
  return <PolicyAdminClient />;
}
