'use client';

import { useTranslations } from 'use-intl';
import type { AppMessages } from '@/i18n/catalog';

/**
 * 셸 공통 문구 한 줄(ADR-0063). 루트 레이아웃·불러오는 중 화면은 서버에서 한 번 그려진 뒤 화면을 옮겨도 다시 그려지지 않는다 — 그
 * 자리의 글자를 이 클라이언트 컴포넌트로 두어 지금 화면의 로케일(로케일 경계)로 그린다. 마크업(제목·상태 역할)은 쓰는 쪽이 소유한다.
 */
export function CommonText({ k, values }: { k: keyof AppMessages['common']; values?: Record<string, string> }) {
  const t = useTranslations('common');
  return t(k, values);
}
