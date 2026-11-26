import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { serverTranslator } from '@/i18n/server-locale';
import LoginClient from './LoginClient';

/** 문서 제목도 화면 로케일을 따른다(ADR-0063). 사이트 정체(접미사)는 번역하지 않는다(결정 6). 기본 제목은 같은 폴더의 layout 이 둔다. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator('login');
  return { title: `${t('pageTitle')} | ${SITE_IDENTITY.frameworkName}` };
}

export default function LoginPage() {
    return <LoginClient />;
}
