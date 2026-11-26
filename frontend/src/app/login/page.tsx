import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { serverTranslator } from '@/i18n/server-locale';
import { getServerUser } from '@/lib/auth/server-user';
import LoginClient from './LoginClient';

/**
 * 문서 제목도 화면 로케일을 따른다(ADR-0063). 사이트 정체(접미사)는 번역하지 않는다(결정 6). 기본 제목은 같은 폴더의 layout 이 둔다.
 * 임시 비밀번호 사용자에게는 이 경로에 변경 관문(한국어 전용)이 대신 그려지므로 관문의 한국어 제목이다 — 메타데이터는 본문과 따로
 * 흘려 보내므로 이 인증 조회가 첫 화면을 막지 않는다(요청당 한 번, 레이아웃의 인증 공급자와 같은 결과).
 */
export async function generateMetadata(): Promise<Metadata> {
  if ((await getServerUser())?.passwordChangeRequired) {
    const korean = await serverTranslator('login', 'ko');
    return { title: `${korean('passwordChangeTitle')} | ${SITE_IDENTITY.frameworkName}` };
  }
  const t = await serverTranslator('login');
  return { title: `${t('pageTitle')} | ${SITE_IDENTITY.frameworkName}` };
}

export default function LoginPage() {
    return <LoginClient />;
}
